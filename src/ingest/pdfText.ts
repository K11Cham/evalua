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
  return fixRtl(visual.normalize('NFKC'));
}

export function pdfItemsToTokens(items: PdfTextItem[], pageHeight: number, page: number): Token[] {
  const out: Token[] = [];
  for (const it of items) {
    const text = repairArabic(it.str);
    if (!text || !text.trim()) continue;
    // Rotated text is a watermark or stamp, not part of the record's reading order.
    if (Math.abs(it.transform[1]) > 0.25 * Math.abs(it.transform[0] || 1)) continue;
    const h = it.height || Math.abs(it.transform[3]) || 10;
    out.push({ text, page, x: it.transform[4], y: pageHeight - it.transform[5] - h, w: it.width, h, conf: 1 });
  }
  return out;
}

/** A page with almost no text layer is treated as a scan and sent to OCR. */
export function looksScanned(tokens: Token[]): boolean {
  const letters = tokens.reduce((a, t) => a + (t.text.match(/[\p{L}\p{N}]/gu) ?? []).length, 0);
  return letters < 25;
}
