// Turns the text of a district course catalog into catalog entries tagged with subject concepts.
import { buildMatcher } from './match.ts';
import type { CatalogCourse, KnowledgeBase, Requirement } from './types.ts';

const AREA_LABEL: Record<string, string> = {
  ela: 'English', math: 'Mathematics', science: 'Science', social: 'Social studies', world_language: 'World language', arts: 'Arts', pe: 'Physical education',
  health: 'Health', cte: 'Career and technical', elective: 'Elective',
};
export const AREAS = Object.keys(AREA_LABEL);
export const areaLabel = (a: string) => AREA_LABEL[a] ?? a;

export interface ParsedCatalog {
  courses: CatalogCourse[];
  /** Lines that did not look like a course. */
  skipped: number;
}

/**
 * One course per line. Understands an optional leading course code and an optional trailing credit value:
 *   "MTH201  Geometry  1.0"   "Biology, 1 credit"   "0471 AP Statistics"
 */
export function parseCatalog(text: string, kb: KnowledgeBase, requirements: Requirement[]): ParsedCatalog {
  const match = buildMatcher(kb, undefined, true);
  const seen = new Set<string>();
  const courses: CatalogCourse[] = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.replace(/\t+/g, '  ').replace(/[|;]/g, '  ').trim();
    if (!line) continue;
    // CSV rows: "code,title,credits"
    if (line.includes(',') && !/\s{2,}/.test(line)) line = line.split(',').map((s) => s.trim().replace(/^"|"$/g, '')).join('  ');
    let code: string | undefined;
    const cm = /^([A-Za-z]{0,5}[-.]?\d{2,7}[A-Za-z]{0,2})\s+/.exec(line);
    if (cm) {
      code = cm[1];
      line = line.slice(cm[0].length);
    }
    let credits = 1;
    const cr = /\s+(\d{1,2}(?:\.\d{1,2})?)\s*(?:cr(?:edits?)?\.?|units?|credit hours?)?$/i.exec(line);
    if (cr && +cr[1] <= 20) {
      credits = +cr[1];
      line = line.slice(0, cr.index);
    }
    const title = line.replace(/\s{2,}.*$/, '').replace(/[.:\-–]+$/, '').trim();
    const letters = (title.match(/\p{L}/gu) ?? []).length;
    if (letters < 3 || title.length > 90 || title.split(/\s+/).length > 12 || /^(page|course|code|title|credits?|department|grade|prerequisite)s?\b[\s:]*$/i.test(title)) {
      skipped++;
      continue;
    }
    const k = `${code ?? ''}|${title.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const look = match(title);
    const concept = kb.concepts.find((c) => c.id === look.conceptId);
    const req = requirements.find((r) => r.id !== 'elective' && concept && r.areas.includes(concept.area)) ?? requirements.find((r) => r.id === 'elective');
    const levels = [9, 10, 11, 12].filter((g) => new RegExp(`\\b${g}\\b`).test(title));
    courses.push({ code, title, credits, concepts: look.how === 'none' ? [] : [look.conceptId], requirement: req?.id ?? 'elective', levels: levels.length ? levels : undefined });
  }
  return { courses, skipped };
}
