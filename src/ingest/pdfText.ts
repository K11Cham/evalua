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

export function pdfItemsToTokens(items: PdfTextItem[], pageHeight: number, page: number): Token[] {
  const out: Token[] = [];
  // The PDF marks real word spaces itself: a narrow space item between words of one phrase, a wide one (or none)
  // between table columns. Words joined by a narrow space stay one token, whatever the font's spacing:
  // a typewriter font's spaces are as wide as a tight column gap, so gap widths alone cannot tell them apart.
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
    if (joinNext && last) {
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

/** A page with almost no text layer is treated as a scan and sent to OCR. */
export function looksScanned(tokens: Token[]): boolean {
  const letters = tokens.reduce((a, t) => a + (t.text.match(/[\p{L}\p{N}]/gu) ?? []).length, 0);
  return letters < 25;
}
