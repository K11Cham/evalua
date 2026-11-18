// The whole rules pipeline in one call: tokens → extraction (+ items to verify).
import { extract, type ExtractOptions } from './extract.ts';
import { verify } from './verify.ts';
import type { DocTokens, Extraction, KnowledgeBase } from './types.ts';

// Raised when the reading rules change in a way that makes a case read before worth reading again.
// 2: grade level, school year and term read per report when a record is made of several files.
// 3: language-of-instruction statements and translation notes, watermark-safe OCR, GABECE grades and aggregate.
export const READER_VERSION = 3;

export function runExtraction(doc: DocTokens, kb: KnowledgeBase, opts: ExtractOptions = {}): Extraction {
  const { extraction, tables } = extract(doc, kb, opts);
  extraction.flags = verify(extraction, doc, tables);
  extraction.reader = READER_VERSION;
  return extraction;
}

export { evaluate, type Override } from './evaluate.ts';
