// Looking again at a page that read as text but not as a table, shared by the browser and the test harness.
//
// Two things in the OCR library lose dense, ruled tables on phone photos:
//  - Detection: it shrinks a large page to at most 1920 px before finding text, which closes the narrow gaps between
//    columns, so a subject and its marks come back as one piece of text ("ESPAÑOL (5) 7.0 8.08.0"). Finding text at the
//    size the page is read at (MAX_SIDE) keeps the gaps open.
//  - Recognition: it joins the boxes on one line into a single crop and reads it once, and drops any reading below 50%
//    confidence. A line of a ruled table (a subject, its marks, the rules between them) reads badly as a whole, so the
//    whole row disappears. Reading each box on its own keeps it.
// Measured on six real phone-scanned transcripts: a Mexican boleta went from 0 courses to 10 with full-size
// detection; on a Panamanian certificate, rows with marks went from 4 to 16 when each box is read on its own.
//
// Neither is better everywhere (on the fake photos, whose text is larger, full-size detection changes a few readings
// for the worse), so a page is read the library's way first. Only when the table reader finds almost nothing on it is
// it read again, each of these ways, and the reading with the most courses is kept.
import { isGradeLike } from '../core/lexicon.ts';
import { readTables } from '../core/tables.ts';
import type { PageInfo, Token } from '../core/types.ts';
import { MAX_SIDE } from './prepare.ts';

/** Longest side text is found at when a page is looked at again. */
export const FINE_SIDE = MAX_SIDE;
/** A page with fewer courses than this, and enough text to hold a table, is looked at again. */
const RETRY_BELOW = 3;
const MIN_TOKENS = 30;

/** One way of reading a page again. */
export interface Look {
  /** Find text at this longest side instead of the library's own choice. */
  side?: number;
  /** Read each detected box on its own instead of whole lines. */
  perBox?: boolean;
  label: string;
}
export const SECOND_LOOKS: Look[] = [
  { side: FINE_SIDE, label: 'finding text at full size' },
  { perBox: true, label: 'reading each piece of text on its own' },
  { side: FINE_SIDE, perBox: true, label: 'both' },
];

/** Courses with a readable grade that the table reader finds on one page on its own. */
export function coursesOnPage(tokens: Token[], info: PageInfo): number {
  const { courses } = readTables({ kind: 'ocr', pages: [info], tokens: tokens.map((t) => ({ ...t, page: 0 })), engine: '', warnings: [] });
  // A row whose "grade" is not one (a merged piece of text, a stray word) is what a failed reading looks like.
  return courses.filter((c) => c.grade && isGradeLike(c.grade.text)).length;
}

export function worthLookingAgain(tokens: Token[], info: PageInfo): boolean {
  return tokens.length >= MIN_TOKENS && coursesOnPage(tokens, info) < RETRY_BELOW;
}

/** The reading with the most courses; the first one wins ties, so a page is changed only when another is better. */
export function bestReading<T extends { tokens: Token[] }>(readings: T[], info: PageInfo): T {
  let best = readings[0];
  let most = coursesOnPage(best.tokens, info);
  for (const r of readings.slice(1)) {
    const n = coursesOnPage(r.tokens, info);
    if (n > most) {
      best = r;
      most = n;
    }
  }
  return best;
}
