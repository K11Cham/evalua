// Looking again at a page that read as text but not as a table, shared by the browser and the test harness.
//
// The OCR library shrinks a large page to at most 1920 px before finding text. On a phone photo of a dense, ruled
// table that closes the narrow gaps between columns, and a subject and its marks come back as one piece of text
// ("ESPAÑOL (5) 7.0 8.08.0"): the table reader then finds no courses at all. Finding text on the page at the size it
// is read at (MAX_SIDE) keeps those gaps open. Measured on six real phone-scanned transcripts: a Mexican boleta went
// from 0 courses to 10 and a Philippine record from 0 to 22.
//
// It is not better everywhere: on the fake photos, whose text is larger, it changes a few readings for the worse. So a
// page is read at the library's size first, and looked at again at full size only when the table reader finds almost
// nothing on it. The second reading is kept only when more courses come out of it.
import { isGradeLike } from '../core/lexicon.ts';
import { readTables } from '../core/tables.ts';
import type { PageInfo, Token } from '../core/types.ts';
import { MAX_SIDE } from './prepare.ts';

/** Longest side text is found at when a page is looked at again. */
export const FINE_SIDE = MAX_SIDE;
/** A page with fewer courses than this, and enough text to hold a table, is looked at again. */
const RETRY_BELOW = 3;
const MIN_TOKENS = 30;

/** Courses with a readable grade that the table reader finds on one page on its own. */
export function coursesOnPage(tokens: Token[], info: PageInfo): number {
  const { courses } = readTables({ kind: 'ocr', pages: [info], tokens: tokens.map((t) => ({ ...t, page: 0 })), engine: '', warnings: [] });
  // A row whose "grade" is not one (a merged piece of text, a stray word) is what a failed reading looks like.
  return courses.filter((c) => c.grade && isGradeLike(c.grade.text)).length;
}

export function worthLookingAgain(tokens: Token[], info: PageInfo): boolean {
  return tokens.length >= MIN_TOKENS && coursesOnPage(tokens, info) < RETRY_BELOW;
}

/** The better of two readings of a page: the second only when it gives more courses. */
export function betterReading<T extends { tokens: Token[] }>(first: T, second: T, info: PageInfo): T {
  return coursesOnPage(second.tokens, info) > coursesOnPage(first.tokens, info) ? second : first;
}
