// Scores one pipeline result against a fake transcript's ground truth.
import { key, parseNumber, sameName, similarity } from '../../src/core/text.ts';
import type { Evaluation, Extraction } from '../../src/core/types.ts';
import type { Truth } from '../fakegen/types.ts';

export interface FileScore {
  file: string;
  format: string;
  system: string;
  lang: string;
  engine: string;
  ms: number;
  systemOk: boolean;
  nameOk: boolean;
  dobOk: boolean;
  idOk: boolean;
  schoolOk: boolean | null;
  truthCourses: number;
  extracted: number;
  /** Truth courses found (name ≥ 0.8 similar, same period). */
  found: number;
  /** Extracted rows that match no truth course. */
  spurious: number;
  exactName: number;
  gradeOk: number;
  creditsOk: number;
  creditsTotal: number;
  hoursOk: number;
  hoursTotal: number;
  levelOk: number;
  levelTotal: number;
  conceptOk: number;
  letterOk: number;
  translationOk: number;
  translationTotal: number;
  flags: number;
  misses: string[];
}

const gradeEq = (a: string, b: string) => {
  const x = parseNumber(a);
  const y = parseNumber(b);
  if (x != null && y != null) return Math.abs(x - y) < 1e-9;
  return key(a) === key(b) && a.trim().toLowerCase() === b.trim().toLowerCase();
};

export function scoreFile(truth: Truth, ex: Extraction, ev: Evaluation, engine: string, ms: number): FileScore {
  const used = new Set<string>();
  const s: FileScore = {
    file: truth.file, format: truth.format, system: truth.system, lang: truth.lang, engine, ms,
    systemOk: ex.systemId.value === truth.system,
    nameOk: sameName(ex.student.name.value, truth.student.name),
    dobOk: ex.student.dob.value === truth.student.dob,
    idOk: !truth.student.id || key(ex.student.id.value).replace(/ /g, '') === key(truth.student.id).replace(/ /g, ''),
    schoolOk: truth.school.name ? key(ex.school.name.value).includes(key(truth.school.name)) || similarity(ex.school.name.value, truth.school.name) >= 0.8 : null,
    truthCourses: truth.courses.length, extracted: ex.courses.length,
    found: 0, spurious: 0, exactName: 0, gradeOk: 0, creditsOk: 0, creditsTotal: 0, hoursOk: 0, hoursTotal: 0, levelOk: 0, levelTotal: 0,
    conceptOk: 0, letterOk: 0, translationOk: 0, translationTotal: 0, flags: ex.flags.length + ev.flags.length, misses: [],
  };
  if (!s.systemOk) s.misses.push(`system: got ${ex.systemId.value}, want ${truth.system}`);
  if (!s.nameOk) s.misses.push(`student: got “${ex.student.name.value}”, want “${truth.student.name}”`);
  if (!s.dobOk) s.misses.push(`dob: got “${ex.student.dob.value}” (${ex.student.dob.original ?? ''}), want ${truth.student.dob}`);
  if (!s.idOk) s.misses.push(`id: got “${ex.student.id.value}”, want ${truth.student.id}`);
  if (s.schoolOk === false) s.misses.push(`school: got “${ex.school.name.value}”`);

  for (const t of truth.courses) {
    // Best unused extracted course with a similar name; prefer the same period, then the same grade.
    let best: { c: (typeof ex.courses)[number]; score: number } | null = null;
    for (const c of ex.courses) {
      if (used.has(c.id)) continue;
      const sim = similarity(c.name.original ?? c.name.value, t.name);
      if (sim < 0.8) continue;
      const samePeriod = similarity(c.period.value, t.year) >= 0.8 || key(t.year).includes(key(c.period.value)) && c.period.value.length > 2 || key(c.period.value).includes(key(t.year));
      const score = sim + (samePeriod ? 1 : 0) + (gradeEq(c.grade.value, t.grade) ? 0.2 : 0);
      if (!best || score > best.score) best = { c, score };
    }
    if (!best) {
      s.misses.push(`missing: ${t.name} [${t.year}]`);
      continue;
    }
    const c = best.c;
    used.add(c.id);
    s.found++;
    if (key(c.name.original ?? '') === key(t.name)) s.exactName++;
    if (gradeEq(c.grade.value, t.grade)) s.gradeOk++;
    else s.misses.push(`grade: ${t.name} [${t.year}] got “${c.grade.value}”, want “${t.grade}”`);
    if (t.credits != null) {
      s.creditsTotal++;
      if (c.credits?.value === t.credits) s.creditsOk++;
      else s.misses.push(`credits: ${t.name} got ${c.credits?.value}, want ${t.credits}`);
    }
    if (t.hours != null) {
      s.hoursTotal++;
      if (c.hours?.value === t.hours) s.hoursOk++;
      else s.misses.push(`hours: ${t.name} got ${c.hours?.value}, want ${t.hours}`);
    }
    s.levelTotal++;
    if (c.level === t.level) s.levelOk++;
    else s.misses.push(`level: ${t.name} [${t.year}] got ${c.level}, want ${t.level}`);
    const sug = ev.suggestions.find((x) => x.courseId === c.id);
    if (sug?.conceptId === t.concept) s.conceptOk++;
    else s.misses.push(`subject: ${t.name} got ${sug?.conceptId}, want ${t.concept}`);
    if ((sug?.grade.letter ?? '—') === t.us) s.letterOk++;
    else s.misses.push(`US grade: ${t.name} (${t.grade}) got ${sug?.grade.letter}, want ${t.us}`);
    if (truth.lang !== 'en') {
      s.translationTotal++;
      if (similarity(c.name.value, t.en) >= 0.8) s.translationOk++;
    }
  }
  s.spurious = ex.courses.filter((c) => !used.has(c.id)).length;
  for (const c of ex.courses.filter((x) => !used.has(x.id))) s.misses.push(`extra row: “${c.name.original}” = “${c.grade.value}”`);
  return s;
}
