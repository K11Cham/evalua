// Browser ingest: a File → positioned text tokens + page previews. Everything happens on this device.
import type { DocTokens, PageInfo } from '../core/types.ts';
import { estimateSkew, SKEW_WIDTH } from './deskew.ts';
import { docxHtmlToDoc } from './docx.ts';
import { typedTextToDoc } from './typed.ts';
import { OCR_MODELS, type OcrModelId } from './ocrModels.ts';
import { segmentsToTokens } from './ocrTokens.ts';
import { greyStretch, hasColouredInk, maskBars } from './prepare.ts';
import { darkBoxes, hiddenItems, looksScanned, pdfItemsToTokens, type PdfTextItem } from './pdfText.ts';
import type { OcrRequest, OcrResponse } from './ocr.worker.ts';

export interface Ingested {
  doc: DocTokens;
  /** One preview image per page (absent for Word files, which are shown as reconstructed text). */
  previews: (Blob | null)[];
}

export type Progress = (message: string) => void;

const MAX_SIDE = 2600;

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (r: Extract<OcrResponse, { ok: true }>) => void; reject: (e: Error) => void; progress: Progress }>();

function ocrWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./ocr.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<OcrResponse>) => {
      const m = e.data;
      const p = pending.get(m.id);
      if (!p) return;
      if ('progress' in m) return p.progress(m.progress);
      pending.delete(m.id);
      if (m.ok) p.resolve(m);
      else p.reject(new Error(m.error));
    };
    worker.onerror = (e) => {
      for (const p of pending.values()) p.reject(new Error(e.message || 'The reading engine could not start.'));
      pending.clear();
      worker = null;
    };
  }
  return worker;
}

function ocr(image: ArrayBuffer, hint: OcrModelId | 'auto', progress: Progress) {
  return new Promise<Extract<OcrResponse, { ok: true }>>((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject, progress });
    const req: OcrRequest = { id, image, hint };
    ocrWorker().postMessage(req, [image]);
  });
}

const toBlob = (canvas: HTMLCanvasElement, type = 'image/jpeg', q = 0.85) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the page image.'))), type, q));

function skewOf(canvas: HTMLCanvasElement): number {
  const w = SKEW_WIDTH;
  const h = Math.max(1, Math.round((canvas.height / canvas.width) * w));
  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const ctx = small.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(canvas, 0, 0, w, h);
  const rgba = ctx.getImageData(0, 0, w, h).data;
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) gray[i] = (rgba[i * 4] * 299 + rgba[i * 4 + 1] * 587 + rgba[i * 4 + 2] * 114) / 1000;
  return estimateSkew(gray, w, h);
}

async function ocrCanvas(canvas: HTMLCanvasElement, page: number, hint: OcrModelId | 'auto', progress: Progress) {
  // OCR reads a greyscale, contrast-stretched copy; the colour page stays as the preview.
  const prepared = document.createElement('canvas');
  prepared.width = canvas.width;
  prepared.height = canvas.height;
  const pctx = prepared.getContext('2d', { willReadFrequently: true })!;
  pctx.drawImage(canvas, 0, 0);
  const img = pctx.getImageData(0, 0, prepared.width, prepared.height);
  const coloured = hasColouredInk(img.data);
  if (coloured) greyStretch(img.data);
  // Redaction bars are painted out, so they cannot swallow the lines next to them.
  const bars = maskBars(img.data, prepared.width, prepared.height);
  if (coloured || bars) pctx.putImageData(img, 0, 0);
  const png = await toBlob(prepared, 'image/png');
  const res = await ocr(await png.arrayBuffer(), hint, progress);
  const info: PageInfo = { width: canvas.width, height: canvas.height, skew: skewOf(canvas) };
  return { tokens: segmentsToTokens(res.lines, page), info, model: res.model, bars };
}

async function imageToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas;
}

async function ingestImage(file: Blob, hint: OcrModelId | 'auto', progress: Progress): Promise<Ingested> {
  const canvas = await imageToCanvas(file);
  const r = await ocrCanvas(canvas, 0, hint, progress);
  return {
    doc: { kind: 'ocr', pages: [r.info], tokens: r.tokens, engine: OCR_MODELS[r.model].label, warnings: [], redactionBars: r.bars || undefined },
    previews: [await toBlob(canvas)],
  };
}

async function ingestPdf(file: Blob, hint: OcrModelId | 'auto', progress: Progress): Promise<Ingested> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const doc: DocTokens = { kind: 'pdf-text', pages: [], tokens: [], engine: 'PDF text layer', warnings: [] };
  const previews: (Blob | null)[] = [];
  let model: OcrModelId | 'auto' = hint;
  if (pdf.numPages > 40) doc.warnings.push(`This file has ${pdf.numPages} pages; only the first 40 were read.`);
  for (let p = 1; p <= Math.min(pdf.numPages, 40); p++) {
    progress(`Page ${p} of ${pdf.numPages}`);
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_SIDE / Math.max(vp.width, vp.height));
    const v2 = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(v2.width);
    canvas.height = Math.ceil(v2.height);
    await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport: v2 }).promise;
    previews.push(await toBlob(canvas));
    const tc = await page.getTextContent();
    // Text under a black box that does not show on the page is a failed redaction: not read, and reported.
    const items = tc.items as unknown as PdfTextItem[];
    const boxes = darkBoxes(await page.getOperatorList(), pdfjs.OPS as unknown as Record<string, number>, vp.width, vp.height);
    const hidden = await hiddenItems(items, boxes, vp.height, async () => ({ rgba: canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height, scale }));
    if (hidden.size) doc.hiddenText = { pages: [...(doc.hiddenText?.pages ?? []), p - 1], count: (doc.hiddenText?.count ?? 0) + hidden.size };
    const toks = pdfItemsToTokens(hidden.size ? items.filter((it) => !hidden.has(it)) : items, vp.height, p - 1);
    if (!looksScanned(toks)) {
      doc.pages.push({ width: vp.width, height: vp.height });
      doc.tokens.push(...toks);
    } else {
      const r = await ocrCanvas(canvas, p - 1, model, progress);
      model = r.model;
      doc.kind = 'ocr';
      doc.engine = OCR_MODELS[r.model].label;
      doc.pages.push(r.info);
      doc.tokens.push(...r.tokens);
      if (r.bars) doc.redactionBars = (doc.redactionBars ?? 0) + r.bars;
    }
  }
  return { doc, previews };
}

async function ingestDocx(file: Blob): Promise<Ingested> {
  const mammoth = await import('mammoth/mammoth.browser');
  const { value } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  return { doc: docxHtmlToDoc(value), previews: [null] };
}

/** Reads several files as one document (for example, one phone photo per page). */
export async function ingestMany(files: File[], hint: OcrModelId | 'auto', progress: Progress): Promise<Ingested> {
  if (files.length === 1) return ingestFile(files[0], hint, progress);
  const out: Ingested = { doc: { kind: 'pdf-text', pages: [], tokens: [], engine: '', warnings: [] }, previews: [] };
  const engines = new Set<string>();
  for (let i = 0; i < files.length; i++) {
    const part = await ingestFile(files[i], hint, (m) => progress(`File ${i + 1} of ${files.length}: ${m}`));
    const offset = out.doc.pages.length;
    (out.doc.parts ??= []).push({ name: files[i].name, firstPage: offset });
    out.doc.pages.push(...part.doc.pages);
    out.doc.tokens.push(...part.doc.tokens.map((t) => ({ ...t, page: t.page + offset })));
    out.doc.warnings.push(...part.doc.warnings);
    if (part.doc.redactionBars) out.doc.redactionBars = (out.doc.redactionBars ?? 0) + part.doc.redactionBars;
    if (part.doc.hiddenText) out.doc.hiddenText = { pages: [...(out.doc.hiddenText?.pages ?? []), ...part.doc.hiddenText.pages.map((x) => x + offset)], count: (out.doc.hiddenText?.count ?? 0) + part.doc.hiddenText.count };
    out.previews.push(...part.previews);
    engines.add(part.doc.engine);
    if (part.doc.kind === 'ocr') out.doc.kind = 'ocr';
    else if (i === 0) out.doc.kind = part.doc.kind;
  }
  out.doc.engine = [...engines].join(' + ');
  return out;
}

export const ACCEPT ='.pdf,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp,.txt,.csv,.tsv,application/pdf,image/*,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** A typed table (from "Type a table") or a .txt / .csv / .tsv file: one subject and grade per line. */
async function ingestText(file: Blob, name: string): Promise<Ingested> {
  const text = await file.text();
  return { doc: typedTextToDoc(text, name.startsWith('typed table') ? 'Typed by hand' : 'Text file'), previews: [null] };
}

export async function ingestFile(file: File, hint: OcrModelId | 'auto', progress: Progress): Promise<Ingested> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return ingestPdf(file, hint, progress);
  if (name.endsWith('.docx')) return ingestDocx(file);
  if (/\.(txt|csv|tsv)$/.test(name) || file.type === 'text/plain' || file.type === 'text/csv') return ingestText(file, name);
  if (name.endsWith('.doc')) throw new Error('Old .doc files are not supported. Save the file as .docx or PDF and try again.');
  if (name.endsWith('.heic') || name.endsWith('.heif') || /hei[cf]/.test(file.type)) {
    progress('Converting the HEIC photo…');
    const { heicTo } = await import('heic-to');
    const jpeg = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 });
    return ingestImage(jpeg, hint, progress);
  }
  if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|gif)$/.test(name)) return ingestImage(file, hint, progress);
  throw new Error('This file type is not supported. Use a PDF, a Word .docx file, a JPG, PNG or HEIC image, or a .txt or .csv file with one subject and grade per line.');
}
