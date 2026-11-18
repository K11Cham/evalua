// PDF text layer → tokens. `items` come from pdf.js getTextContent().
import type { Token } from '../core/types.ts';
import { fixRtl } from './ocrTokens.ts';

export interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

const PRESENTATION = /[ﭐ-﷿ﹰ-ﻼ]/;
const BASE_RUN = /[ء-يٮ-ۓ]+(?:\s+[ء-يٮ-ۓ]+)*/g;

/**
 * Some PDFs store Arabic as presentation-form glyphs in visual (left-to-right) order, and pdf.js then
 * re-orders only the plain letters among them. This undoes that and returns ordinary logical text.
 */
export function repairArabic(str: string): string {
  if (!PRESENTATION.test(str)) return str;
  const visual = str.replace(BASE_RUN, (run) => [...run].reverse().join(''));
  // Reverse first, then expand ligatures, so lam-alef pairs come out in the right order.
  return fixRtl(visual).normalize('NFKC').replace(/ی/g, 'ي').replace(/ھ/g, 'ه').replace(/ک/g, 'ك');
}

// Right-to-left scripts (Hebrew, Arabic, and Arabic presentation forms).
const RTL = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

export function pdfItemsToTokens(items: PdfTextItem[], pageHeight: number, page: number): Token[] {
  const out: Token[] = [];
  // The PDF marks real word spaces itself: a narrow space item between words of one phrase, a wide one (or none)
  // between table columns. Words joined by a narrow space stay one token, whatever the font's spacing:
  // a typewriter font's spaces are as wide as a tight column gap, so gap widths alone cannot tell them apart.
  // Right-to-left words are never joined here: items come in visual order and Arabic is repaired per item, so joining
  // moved letters across word boundaries ("اللغا ةلعربية"); the layout step puts right-to-left words in order instead.
  let joinNext = false;
  for (const it of items) {
    const raw = it.str;
    if (raw && !raw.trim()) {
      const last = out[out.length - 1];
      const h = it.height || Math.abs(it.transform[3]) || 10;
      const sameLine = last && Math.abs(pageHeight - it.transform[5] - h - last.y) < h * 0.4;
      joinNext = !!sameLine && it.width > 0 && it.width <= h * 1.2;
      continue;
    }
    const text = repairArabic(raw);
    if (!text || !text.trim()) continue;
    // Rotated text is a watermark or stamp, not part of the record's reading order.
    if (Math.abs(it.transform[1]) > 0.25 * Math.abs(it.transform[0] || 1)) continue;
    const last = out[out.length - 1];
    if (joinNext && last && !RTL.test(raw) && !RTL.test(last.text)) {
      const h0 = it.height || Math.abs(it.transform[3]) || 10;
      const x = it.transform[4];
      const y = pageHeight - it.transform[5] - h0;
      if (Math.abs(y - last.y) < h0 * 0.4 && x >= last.x + last.w - 1 && x - (last.x + last.w) <= h0 * 1.3) {
        last.text = `${last.text} ${text}`;
        last.w = x + it.width - last.x;
        joinNext = false;
        continue;
      }
    }
    joinNext = false;
    const h = it.height || Math.abs(it.transform[3]) || 10;
    out.push({ text, page, x: it.transform[4], y: pageHeight - it.transform[5] - h, w: it.width, h, conf: 1 });
  }
  return out;
}

// ── failed redactions ──
// A black box drawn over text in a PDF hides it on screen but leaves it in the file: anyone can select and copy it.
// Real redaction tools remove the text. evalua finds filled dark rectangles, then checks on the rendered page whether the
// text under one shows any light pixels (white text on a dark heading bar is visible, so it is kept). Hidden text is
// not read, and the counselor is warned without being shown it.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Matrix = [number, number, number, number, number, number];
const mul = (m: Matrix, t: Matrix): Matrix => [
  m[0] * t[0] + m[1] * t[2], m[0] * t[1] + m[1] * t[3], m[2] * t[0] + m[3] * t[2], m[2] * t[1] + m[3] * t[3], m[4] * t[0] + m[5] * t[2] + t[4], m[4] * t[1] + m[5] * t[3] + t[5],
];
const lumOfHex = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

/**
 * Filled dark rectangles on a page, in the same coordinates as the text tokens (top-left origin, scale 1). `ops` is
 * pdf.js `page.getOperatorList()`; `OPS` is pdf.js's operator table.
 */
export function darkBoxes(ops: { fnArray: number[]; argsArray: unknown[] }, OPS: Record<string, number>, pageWidth: number, pageHeight: number): Box[] {
  const fills = new Set([OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke]);
  const out: Box[] = [];
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  let lum = 0;
  const stack: { ctm: Matrix; lum: number }[] = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const a = ops.argsArray[i] as unknown[];
    if (fn === OPS.save) stack.push({ ctm, lum });
    else if (fn === OPS.restore) ({ ctm, lum } = stack.pop() ?? { ctm, lum });
    else if (fn === OPS.transform) ctm = mul(a as unknown as Matrix, ctm);
    else if (fn === OPS.setFillRGBColor || fn === OPS.setFillColor || fn === OPS.setFillColorN || fn === OPS.setFillCMYKColor) {
      if (typeof a?.[0] === 'string' && (a[0] as string).startsWith('#')) lum = lumOfHex(a[0] as string);
      else if (Array.isArray(a) && a.length >= 3 && a.every((v) => typeof v === 'number')) lum = (0.299 * (a[0] as number) + 0.587 * (a[1] as number) + 0.114 * (a[2] as number)) / (Math.max(...(a as number[])) > 1 ? 255 : 1);
    } else if (fn === OPS.setFillGray && typeof a?.[0] === 'number') lum = a[0] as number;
    else if (fn === OPS.constructPath && fills.has(a?.[0] as number) && lum < 0.2) {
      const mm = a?.[2] as ArrayLike<number> | undefined;
      if (!mm || mm.length < 4) continue;
      const pts = [[mm[0], mm[1]], [mm[2], mm[1]], [mm[0], mm[3]], [mm[2], mm[3]]].map(([x, y]) => [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]]);
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => pageHeight - p[1]);
      const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      // Not a table rule (thin), not the page itself.
      if (Math.min(box.w, box.h) >= 4 && box.w * box.h < pageWidth * pageHeight * 0.5) out.push(box);
    }
  }
  return out;
}

/** One text item as a token, before words are joined: the unit a redaction box covers. */
export function itemToken(it: PdfTextItem, pageHeight: number, page: number): Token {
  const h = it.height || Math.abs(it.transform[3]) || 10;
  return { text: it.str, page, x: it.transform[4], y: pageHeight - it.transform[5] - h, w: it.width, h, conf: 1 };
}

/**
 * The text items a failed redaction hides: under a dark box and not visible on the rendered page. `render` is only
 * called when some item sits under a box, and returns the page's pixels at `scale`.
 */
export async function hiddenItems(
  items: PdfTextItem[], boxes: Box[], pageHeight: number,
  render: () => Promise<{ rgba: Uint8ClampedArray | Uint8Array; width: number; height: number; scale: number }>,
): Promise<Set<PdfTextItem>> {
  const out = new Set<PdfTextItem>();
  if (!boxes.length) return out;
  const cand = items.filter((it) => it.str.trim() && tokensUnder([itemToken(it, pageHeight, 0)], boxes).length);
  if (!cand.length) return out;
  const img = await render();
  for (const it of cand) {
    const t = itemToken(it, pageHeight, 0);
    // Look only where the box covers the text (text boxes run a little past the drawn box), and only when it covers
    // most of it: a box that clips the edge of a word is not hiding it.
    for (const b of boxes) {
      const x0 = Math.max(t.x, b.x), y0 = Math.max(t.y, b.y), x1 = Math.min(t.x + t.w, b.x + b.w), y1 = Math.min(t.y + t.h, b.y + b.h);
      if (x1 <= x0 || y1 <= y0 || ((x1 - x0) * (y1 - y0)) / Math.max(1, t.w * t.h) < 0.6) continue;
      // One point in from each edge: the box's own anti-aliased border is not light text.
      const inset = Math.min(1, (x1 - x0) / 4, (y1 - y0) / 4);
      if (!inkVisible(img.rgba, img.width, img.height, img.scale, { ...t, x: x0 + inset, y: y0 + inset, w: x1 - x0 - 2 * inset, h: y1 - y0 - 2 * inset })) out.add(it);
      break;
    }
  }
  return out;
}

/** Tokens whose centre lies inside a dark box. */
export function tokensUnder(tokens: Token[], boxes: Box[]): Token[] {
  return tokens.filter((t) => {
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    return boxes.some((b) => cx > b.x && cx < b.x + b.w && cy > b.y && cy < b.y + b.h);
  });
}

/** True when a token's area on the rendered page shows light pixels: the text is visible (white on a dark bar). */
export function inkVisible(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number, scale: number, t: Token): boolean {
  const x0 = Math.max(0, Math.floor(t.x * scale)), y0 = Math.max(0, Math.floor(t.y * scale));
  const x1 = Math.min(width, Math.ceil((t.x + t.w) * scale)), y1 = Math.min(height, Math.ceil((t.y + t.h) * scale));
  let light = 0, n = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      n++;
      if (0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2] > 128) light++;
    }
  return n > 0 && light / n > 0.02;
}

/** A page with almost no text layer is treated as a scan and sent to OCR. */
export function looksScanned(tokens: Token[]): boolean {
  const letters = tokens.reduce((a, t) => a + (t.text.match(/[\p{L}\p{N}]/gu) ?? []).length, 0);
  return letters < 25;
}
