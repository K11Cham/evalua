// Node version of the browser ingest: same shared code, with Node-side PDF rendering and ONNX runtime.
// Used by the golden-set evaluation and unit-test fixtures.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { DocTokens, Token } from '../../src/core/types.ts';
import { docxHtmlToDoc } from '../../src/ingest/docx.ts';
import { modelUrls, OCR_MODELS, routeOcr, type OcrModelId, type OcrSegment } from '../../src/ingest/ocrModels.ts';
import { segmentsToTokens } from '../../src/ingest/ocrTokens.ts';
import { installBoxFilter } from '../../src/ingest/detectFix.ts';
import { typedTextToDoc } from '../../src/ingest/typed.ts';
import { greyStretch, hasColouredInk } from '../../src/ingest/prepare.ts';
import { estimateSkew, SKEW_WIDTH } from '../../src/ingest/deskew.ts';
import { looksScanned, pdfItemsToTokens, type PdfTextItem } from '../../src/ingest/pdfText.ts';

const HF_BASE = 'https://huggingface.co/snowfluke/ppu-paddle-ocr-models/resolve/main';
const CACHE = path.resolve('tools/eval/.cache');
// The cache key covers the reader's own code as well as the file, so a change to how documents are read can never be
// hidden behind an old cached read (it once was: an Arabic text-layer regression went unseen for two sessions).
const READER_SOURCES = [
  ...readdirSync(path.resolve('src/ingest')).filter((f) => f.endsWith('.ts')).map((f) => path.join('src/ingest', f)),
  'tools/eval/node-ingest.ts',
];
const INGEST_VERSION = createHash('sha1').update(READER_SOURCES.sort().map((f) => readFileSync(path.resolve(f))).join('\0')).update(JSON.stringify(Object.keys(OCR_MODELS))).digest('hex').slice(0, 12);

interface OcrService {
  recognize(image: ArrayBuffer): Promise<{ lines: OcrSegment[][] }>;
  destroy(): Promise<void>;
}
const services = new Map<OcrModelId, OcrService>();

async function service(id: OcrModelId): Promise<OcrService> {
  let s = services.get(id);
  if (!s) {
    const { DetectionService, PaddleOcrService } = await import('ppu-paddle-ocr');
    installBoxFilter(DetectionService as unknown as Parameters<typeof installBoxFilter>[0]);
    const svc = new PaddleOcrService({ model: modelUrls(HF_BASE, id) });
    await svc.initialize();
    s = svc as unknown as OcrService;
    services.set(id, s);
  }
  return s;
}

export async function closeOcr() {
  for (const s of services.values()) await s.destroy();
  services.clear();
}

async function skewOf(buf: Buffer): Promise<number> {
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(buf).greyscale().resize({ width: SKEW_WIDTH }).raw().toBuffer({ resolveWithObject: true });
  return estimateSkew(new Uint8Array(data.buffer, data.byteOffset, data.length), info.width, info.height);
}

async function ocrImage(input: Buffer, page: number, hint: OcrModelId | 'auto'): Promise<{ tokens: Token[]; model: OcrModelId }> {
  // Same preparation as the browser: greyscale with stretched contrast, only for pages with coloured ink.
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = new Uint8Array(data.buffer, data.byteOffset, data.length);
  let buf = input;
  if (hasColouredInk(px)) {
    greyStretch(px);
    buf = await sharp(Buffer.from(px), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  }
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const routed = await routeOcr(async (id) => (await (await service(id)).recognize(ab.slice(0))).lines, hint);
  return { tokens: segmentsToTokens(routed.lines, page), model: routed.model };
}

async function ingestPdf(file: string): Promise<DocTokens> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(readFileSync(file));
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
  const doc: DocTokens = { kind: 'pdf-text', pages: [], tokens: [], engine: 'PDF text layer', warnings: [] };
  let model: OcrModelId | 'auto' = 'auto';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const toks = pdfItemsToTokens(tc.items as unknown as PdfTextItem[], vp.height, p - 1);
    if (!looksScanned(toks)) {
      doc.pages.push({ width: vp.width, height: vp.height });
      doc.tokens.push(...toks);
      continue;
    }
    const { createCanvas } = await import('@napi-rs/canvas');
    const scale = 2;
    const v2 = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(v2.width), Math.ceil(v2.height));
    await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: canvas.getContext('2d') as unknown as CanvasRenderingContext2D, viewport: v2 }).promise;
    const png = canvas.toBuffer('image/png');
    const r = await ocrImage(png, p - 1, model);
    model = r.model;
    doc.kind = 'ocr';
    doc.engine = OCR_MODELS[r.model].label;
    doc.pages.push({ width: v2.width, height: v2.height, skew: await skewOf(png) });
    doc.tokens.push(...r.tokens);
  }
  return doc;
}

async function ingestImage(file: string): Promise<DocTokens> {
  const sharp = (await import('sharp')).default;
  const buf = readFileSync(file);
  const meta = await sharp(buf).metadata();
  const r = await ocrImage(buf, 0, 'auto');
  return { kind: 'ocr', pages: [{ width: meta.width ?? 1000, height: meta.height ?? 1400, skew: await skewOf(buf) }], tokens: r.tokens, engine: OCR_MODELS[r.model].label, warnings: [] };
}

async function ingestDocx(file: string): Promise<DocTokens> {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.convertToHtml({ path: file });
  return docxHtmlToDoc(value);
}

/** Reads any supported file into tokens. Results are cached on disk by content hash. */
export async function ingestFile(file: string, useCache = true): Promise<DocTokens> {
  const hash = createHash('sha1').update(readFileSync(file)).update(INGEST_VERSION).digest('hex').slice(0, 16);
  const cached = path.join(CACHE, `${path.basename(file)}.${hash}.json`);
  if (useCache && existsSync(cached)) return JSON.parse(readFileSync(cached, 'utf8')) as DocTokens;
  const ext = path.extname(file).toLowerCase();
  const doc = ext === '.pdf' ? await ingestPdf(file) : ext === '.docx' ? await ingestDocx(file) : ['.txt', '.csv', '.tsv'].includes(ext) ? typedTextToDoc(readFileSync(file, 'utf8'), 'Text file') : await ingestImage(file);
  // Only the fictitious fixtures are cached. Anything else (a real record being debugged) is never written to disk.
  if (useCache && path.resolve(file).startsWith(path.resolve('fixtures/fake'))) {
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(cached, JSON.stringify(doc));
  }
  return doc;
}
