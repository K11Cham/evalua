// The bundled knowledge-base seed. The same data is published to D1 and served by /api/kb;
// this copy keeps the app working offline and when the API is unreachable.
import type { KnowledgeBase } from '../core/types.ts';
import { concepts } from './concepts.ts';
import { districts } from './districts.ts';
import { systems } from './systems.ts';

export const SCHOOL_YEAR = '2026-27';

export function seedKb(): KnowledgeBase {
  return { schoolYear: SCHOOL_YEAR, concepts, systems, districts };
}

export { concepts, districts, systems };
