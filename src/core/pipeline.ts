// The whole rules pipeline in one call: tokens → extraction (+ items to verify).
import { extract, type ExtractOptions } from './extract.ts';
import { verify } from './verify.ts';
import type { DocTokens, Extraction, KnowledgeBase } from './types.ts';

export function runExtraction(doc: DocTokens, kb: KnowledgeBase, opts: ExtractOptions = {}): Extraction {
  const { extraction, tables } = extract(doc, kb, opts);
  extraction.flags = verify(extraction, doc, tables);
  return extraction;
}

export { evaluate, type Override } from './evaluate.ts';
