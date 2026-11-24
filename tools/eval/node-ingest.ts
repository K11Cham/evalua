// Node version of the browser ingest: same shared code, with Node-side PDF rendering and ONNX runtime.
// Used by the golden-set evaluation and unit-test fixtures.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { DocTokens, Token } from '../../src/core/types.ts';
import { docxHtmlToDoc } from '../../src/ingest/docx.ts';
import { modelUrls, OCR_MODELS, routeOcr, type OcrModelId, type OcrSegment } from '../../src/ingest/ocrModels.ts';
import { bestReading, SECOND_LOOKS, worthLookingAgain } from '../../src/ingest/ocrRetry.ts';
import { segmentsToTokens } from '../../src/ingest/ocrTokens.ts';
import { installBoxFilter, withDetectionSide } from '../../src/ingest/detectFix.ts';
import { typedTextToDoc } from '../../src/ingest/typed.ts';
import { greyStretch, hasColouredInk, maskBars, MAX_SIDE } from '../../src/ingest/prepare.ts';
import { estimateSkew, SKEW_WIDTH } from '../../src/ingest/deskew.ts';
import { darkBoxes, hiddenItems, looksScanned, pdfItemsToTokens, type PdfTextItem } from '../../src/ingest/pdfText.ts';

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
  recognize(image: ArrayBuffer, options?: { noCache?: boolean; strategy?: string }): Promise<{ lines: OcrSegment[][] }>;
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

async function ocrImage(input: Buffer, page: number, hint: OcrModelId | 'auto'): Promise<{ tokens: Token[]; model: OcrModelId; bars: number }> {
  // Same preparation as the browser: greyscale with stretched contrast, only for pages with coloured ink.
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = new Uint8Array(data.buffer, data.byteOffset, data.length);
  let buf = input;
  const coloured = hasColouredInk(px);
  if (coloured) greyStretch(px);
  const bars = maskBars(px, info.width, info.height);
  if (coloured || bars) buf = await sharp(Buffer.from(px), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const routed = await routeOcr(async (id) => (await (await service(id)).recognize(ab.slice(0))).lines, hint);
  let read = { tokens: segmentsToTokens(routed.lines, page), model: routed.model };
  // As in the browser: text but almost no table, so look again with text found at full size (see ocrRetry.ts).
  const meta = { width: info.width, height: info.height };
  if (worthLookingAgain(read.tokens, meta)) {
    const readings = [read];
    for (const look of SECOND_LOOKS) {
      // The library caches results by image: a second look must not be answered from the first.
      const opts = { noCache: true, ...(look.perBox ? { strategy: 'per-box' } : {}) };
      const lines = await withDetectionSide(look.side ?? null, async () => (await (await service(routed.model)).recognize(ab.slice(0), opts)).lines);
      readings.push({ tokens: segmentsToTokens(lines, page), model: routed.model });
    }
    read = bestReading(readings, meta);
  }
  return { tokens: read.tokens, model: read.model, bars };
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
    // Same failed-redaction check as the browser: the page is rendered only when a dark box sits over text.
    const items = tc.items as unknown as PdfTextItem[];
    const boxes = darkBoxes(await page.getOperatorList(), pdfjs.OPS as unknown as Record<string, number>, vp.width, vp.height);
    const hidden = await hiddenItems(items, boxes, vp.height, async () => {
      const { createCanvas } = await import('@napi-rs/canvas');
      const v2 = page.getViewport({ scale: 2 });
      const canvas = createCanvas(Math.ceil(v2.width), Math.ceil(v2.height));
      const ctx = canvas.getContext('2d');
      await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport: v2 }).promise;
      return { rgba: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height, scale: 2 };
    });
    if (hidden.size) doc.hiddenText = { pages: [...(doc.hiddenText?.pages ?? []), p - 1], count: (doc.hiddenText?.count ?? 0) + hidden.size };
    const toks = pdfItemsToTokens(hidden.size ? items.filter((it) => !hidden.has(it)) : items, vp.height, p - 1);
    if (!looksScanned(toks)) {
      doc.pages.push({ width: vp.width, height: vp.height });
      doc.tokens.push(...toks);
      continue;
    }
    const { createCanvas } = await import('@napi-rs/canvas');
    // As in the browser: twice the page size, but never more than MAX_SIDE (a phone scan's page can be 3000 pt wide).
    const scale = Math.min(2, MAX_SIDE / Math.max(vp.width, vp.height));
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
    if (r.bars) doc.redactionBars = (doc.redactionBars ?? 0) + r.bars;
  }
  return doc;
}

async function ingestImage(file: string): Promise<DocTokens> {
  const sharp = (await import('sharp')).default;
  // As in the browser: turned upright from the photo's orientation tag, and scaled down to MAX_SIDE.
  const { data: buf, info } = await sharp(readFileSync(file)).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
  const r = await ocrImage(buf, 0, 'auto');
  return { kind: 'ocr', pages: [{ width: info.width, height: info.height, skew: await skewOf(buf) }], tokens: r.tokens, engine: OCR_MODELS[r.model].label, warnings: [], redactionBars: r.bars || undefined };
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
