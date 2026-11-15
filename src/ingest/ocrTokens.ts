// Converts OCR output into positioned tokens, repairing right-to-left text.
import type { Token } from '../core/types.ts';
import type { OcrSegment } from './ocrModels.ts';

const RTL = /[֐-ࣿיִ-﷿ﹰ-ﻼ]/;
const BRACKETS: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{' };

/**
 * PP-OCR returns Arabic/Hebrew in visual order (characters reversed). This restores logical order,
 * keeping numbers and Latin runs readable.
 */
export function fixRtl(text: string): string {
  if (!RTL.test(text)) return text;
  const clusters = text.match(/\P{M}\p{M}*/gu) ?? [];
  const reversed = clusters.reverse().join('');
  const flip = (s: string) => [...s].reverse().join('');
  return reversed
    .replace(/[0-9٠-٩۰-۹A-Za-z][0-9٠-٩۰-۹A-Za-z.,:/%-]*[0-9٠-٩۰-۹A-Za-z]|[0-9٠-٩۰-۹A-Za-z]/g, flip)
    .replace(/[()[\]{}]/g, (b) => BRACKETS[b] ?? b);
}

export function segmentsToTokens(lines: OcrSegment[][], page: number): Token[] {
  const out: Token[] = [];
  for (const line of lines) {
    for (const s of line) {
      const text = fixRtl(s.text.trim());
      if (!text) continue;
      out.push({ text, page, x: s.box.x, y: s.box.y, w: s.box.width, h: s.box.height, conf: Math.max(0, Math.min(1, s.confidence)) });
    }
  }
  return out;
}
