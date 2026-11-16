// Carrying a counselor's work over to a fresh reading of a case after documents are added.
// The earlier pages are unchanged, so each earlier course is found again by page, name and grade as printed.
// What carries over: corrected fields (student, course name, grade), grade levels, decisions (overrides), courses
// added by hand, and checked items to verify. Everything new on the added pages comes in as read.
import type { Override } from './evaluate.ts';
import type { ExtractedCourse, Extraction } from './types.ts';

export interface CarryResult {
  extraction: Extraction;
  overrides: Record<string, Override>;
  resolved: string[];
  /** Earlier courses found again on the new reading. */
  kept: number;
  /** Earlier courses (not added by hand) that could not be found again; their decisions are dropped. */
  lost: string[];
  /** Courses that are new on this reading. */
  added: number;
}

// A leading row number ("1 MATHEMATICS") is ignored, in case one reading strips it and another does not.
const norm = (s: string | undefined) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/^\(?\d{1,2}[.)]?\s*(?=\p{L})/u, '');
const strict = (c: ExtractedCourse) => `${c.name.source?.page ?? '-'}|${norm(c.name.original)}|${norm(c.grade.original ?? c.grade.value)}`;
const loose = (c: ExtractedCourse) => `${c.name.source?.page ?? '-'}|${norm(c.name.original)}`;

/** Course-specific "items to verify" carry the course id at the end of their own id. */
const COURSE_FLAG = /^(grade-missing|grade-lowconf|name-lowconf|grade-words|dup|fail)-(.+)$/;

export function carryOver(before: Extraction, after: Extraction, overrides: Record<string, Override>, resolved: string[]): CarryResult {
  const next: Extraction = structuredClone(after);
  // Student and document fields the counselor corrected.
  const fields: [keyof Extraction['student'] | 'school' | 'country', (e: Extraction) => Extraction['country']][] = [
    ['name', (e) => e.student.name],
    ['dob', (e) => e.student.dob],
    ['id', (e) => e.student.id],
    ['school', (e) => e.school.name],
    ['country', (e) => e.country],
  ];
  for (const [, get] of fields) {
    const old = get(before);
    if (old.edited || (!get(next).value && old.value)) Object.assign(get(next), structuredClone(old));
  }

  // Match earlier courses to the new reading: exact first, then by page and name alone.
  const idMap = new Map<string, string>();
  const taken = new Set<string>();
  const handAdded: ExtractedCourse[] = [];
  for (const pass of [strict, loose]) {
    for (const old of before.courses) {
      if (idMap.has(old.id)) continue;
      if (!old.name.source) continue;
      const hit = next.courses.find((c) => !taken.has(c.id) && pass(c) === pass(old));
      if (hit) {
        idMap.set(old.id, hit.id);
        taken.add(hit.id);
      }
    }
  }
  const lost: string[] = [];
  for (const old of before.courses) {
    const id = idMap.get(old.id);
    if (!id) {
      if (!old.name.source) handAdded.push(structuredClone(old));
      else lost.push(old.name.original || old.name.value);
      continue;
    }
    const c = next.courses.find((x) => x.id === id)!;
    if (old.name.edited) ((c.name = structuredClone(old.name)), (c.translation = old.translation));
    if (old.grade.edited) c.grade = structuredClone(old.grade);
    // A grade level the counselor set stands; one the reader set is read again.
    if (old.levelByHand) ((c.level = old.level), (c.levelByHand = true));
  }
  // Courses added by hand keep their own ids (they cannot collide with read ones, which are c1, c2, …).
  next.courses.push(...handAdded);
  for (const h of handAdded) idMap.set(h.id, h.id);

  const nextOverrides: Record<string, Override> = {};
  for (const [oldId, ov] of Object.entries(overrides)) {
    const id = idMap.get(oldId);
    if (id) nextOverrides[id] = ov;
  }
  const nextResolved: string[] = [];
  for (const f of resolved) {
    const m = COURSE_FLAG.exec(f);
    if (!m) nextResolved.push(f);
    else if (idMap.has(m[2])) nextResolved.push(`${m[1]}-${idMap.get(m[2])}`);
  }
  // A system the counselor chose is kept (the caller re-reads with it); the date-of-birth note follows the field.
  return {
    extraction: next,
    overrides: nextOverrides,
    resolved: nextResolved,
    kept: idMap.size - handAdded.length,
    lost,
    added: next.courses.length - (idMap.size - handAdded.length) - handAdded.length,
  };
}
