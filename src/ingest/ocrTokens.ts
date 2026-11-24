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

/** A mark as printed in a table cell: "7", "85", "7.5", "85.00", "8,5". */
const MARK = /^\d{1,3}(?:[.,]\d{1,2})?$/;

/**
 * Marks run together with no space ("85.0081.0085.0083.00", "7.55.0"), split back into marks. Only when every piece
 * has the same number of decimals and is at most 100, so a date, a year range or a code is never cut.
 */
export function unglueMarks(s: string): string[] | null {
  const m = /^\d+(?:[.,]\d+)+$/.exec(s);
  if (!m || !/[.,]\d+[.,]/.test(s)) return null;
  for (const k of [2, 1]) {
    const re = new RegExp(`\\d{1,3}[.,]\\d{${k}}`, 'y');
    const out: string[] = [];
    re.lastIndex = 0;
    while (re.lastIndex < s.length) {
      const start = re.lastIndex;
      const hit = re.exec(s);
      if (!hit || hit.index !== start) break;
      out.push(hit[0]);
    }
    if (out.join('') === s && out.length >= 2 && out.every((x) => parseFloat(x.replace(',', '.')) <= 100 && !/^0\d/.test(x))) return out;
  }
  return null;
}

/**
 * On a phone photo of a ruled table, OCR often reads neighbouring cells as one piece of text: a subject and its marks
 * ("ESPAÑOL (5) 7.0 8.0 8.0") or several marks ("8.6 7.0", "85.0081.00"). The pieces are split back into cells,
 * each placed at its share of the box's width, so the table reader sees the columns. Text is split only where it
 * ends in marks with a decimal point, or in two or more marks: "GRADE 7", "Days Present: 195" and "2013-2014" stay whole.
 */
export function splitCells(t: Token): Token[] {
  // A subject glued to its first mark: "TECNOLOGIA(3)10.0" → "TECNOLOGIA(3) 10.0". A table rule read beside a mark
  // ("85.00|81.00", "82.00!", "84.00l") is a space; positions stay the same, as one character stands for another.
  const text = t.text
    .replace(/([\p{L})])(?=\d{1,3}[.,]\d)/gu, '$1 ')
    .replace(/(?<=\d[.,]\d{2})[!|lI](?=\d|\s|$)/g, ' ')
    .replace(/(?<=^|\s)[!|lI](?=\d{1,3}[.,]\d{2})/g, ' ');
  const words: { s: string; at: number }[] = [];
  for (const m of text.matchAll(/\S+/g)) words.push({ s: m[0], at: m.index! });
  // The marks at the end of the text, each unglued.
  let first = words.length;
  const marks: { s: string; at: number }[] = [];
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    const parts = MARK.test(w.s) ? [w.s] : unglueMarks(w.s);
    if (!parts) break;
    let at = w.at;
    marks.unshift(...parts.map((p) => {
      const piece = { s: p, at };
      at += p.length;
      return piece;
    }));
    first = i;
  }
  const decimals = marks.some((p) => /[.,]/.test(p.s));
  if (!marks.length || (!decimals && marks.length < 2) || (first === 0 && marks.length < 2)) return [t];
  const lead = first > 0 ? text.slice(0, words[first].at).trim() : '';
  const len = text.length;
  const piece = (s: string, at: number): Token => ({ ...t, text: s, x: t.x + (t.w * at) / len, w: (t.w * s.length) / len, alone: true });
  return [...(lead ? [piece(lead, 0)] : []), ...marks.map((p) => piece(p.s, p.at))];
}

export function segmentsToTokens(lines: OcrSegment[][], page: number): Token[] {
  const out: Token[] = [];
  for (const line of lines) {
    for (const s of line) {
      const text = fixRtl(s.text.trim());
      if (!text) continue;
      out.push(...splitCells({ text, page, x: s.box.x, y: s.box.y, w: s.box.width, h: s.box.height, conf: Math.max(0, Math.min(1, s.confidence)) }));
    }
  }
  return out;
}
