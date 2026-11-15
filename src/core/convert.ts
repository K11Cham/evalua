// Grade conversion: foreign grade → US letter, 4.0 points and percentage, always naming the table used.
import { key, parseNumber } from './text.ts';
import { splitGrade } from './lexicon.ts';
import type { ExtractedCourse, GradeConversion, GradeScale, ScaleEntry, SystemProfile, USLetter } from './types.ts';

const GPA: Record<USLetter, number | null> = { A: 4, B: 3, C: 2, D: 1, F: 0, P: null, NC: null };
const PCT: Record<USLetter, number | null> = { A: 95, B: 85, C: 75, D: 65, F: 50, P: null, NC: null };

function entryFor(scale: GradeScale, grade: string): ScaleEntry | null {
  if (!grade) return null;
  if (scale.kind === 'labels') {
    const k = key(grade);
    const raw = grade.trim().toLowerCase();
    return scale.entries.find((e) => (e.labels ?? []).some((l) => key(l) === k && (key(l) !== '' || l.toLowerCase() === raw)) || (e.labels ?? []).some((l) => l.toLowerCase() === raw)) ?? null;
  }
  const n = parseNumber(grade);
  if (n == null) return null;
  if (scale.domain && (n < scale.domain[0] || n > scale.domain[1])) return null;
  return scale.entries.find((e) => n >= (e.min ?? -Infinity) && n <= (e.max ?? Infinity)) ?? null;
}

export interface SectionContext {
  /** All grades printed in the same section (year/term table). */
  grades: string[];
  /** Heading + column header text, used for scale hints. */
  hintText: string;
}

/** Picks the scale that explains the most grades in a section, honouring hints and disambiguation rules. */
export function chooseScale(profile: SystemProfile | undefined, ctx: SectionContext): GradeScale | null {
  if (!profile) return null;
  const grades = ctx.grades.filter(Boolean);
  if (!grades.length) return null;
  const nums = grades.map((g) => parseNumber(g)).filter((n): n is number => n != null);
  const maxSeen = nums.length ? Math.max(...nums) : -Infinity;
  let best: { scale: GradeScale; frac: number; hinted: boolean } | null = null;
  for (const scale of profile.scales) {
    const hinted = !!scale.hint && new RegExp(scale.hint, 'iu').test(ctx.hintText);
    const forced = scale.requiresAbove != null && maxSeen > scale.requiresAbove;
    if (scale.requiresAbove != null && !forced && !hinted) continue;
    if (scale.hint && !hinted && !forced) continue;
    const frac = grades.filter((g) => entryFor(scale, g)).length / grades.length;
    if (frac < 0.5) continue;
    if (!best || (hinted && !best.hinted) || (hinted === best.hinted && frac > best.frac + 1e-9)) best = { scale, frac, hinted };
  }
  return best?.scale ?? null;
}

const result = (letter: USLetter | null, table: string, confidence: number, reasons: GradeConversion['reasons'], descriptor?: string): GradeConversion => ({
  letter,
  gpa: letter ? GPA[letter] : null,
  percent: letter ? PCT[letter] : null,
  table,
  descriptor,
  confidence,
  reasons,
});

export function convertGrade(course: ExtractedCourse, profile: SystemProfile | undefined, generic: SystemProfile | undefined, ctx: SectionContext): GradeConversion {
  const grade = course.grade.value;
  if (!grade) {
    return result(null, '—', 0, [{ text: 'No grade could be read for this course.' }]);
  }
  const use = (scale: GradeScale, value: string, entry: ScaleEntry, conf: number, note?: string): GradeConversion =>
    result(entry.us, scale.label, conf, [
      { text: `${note ?? `“${value}”`} → ${entry.us}${entry.descriptor ? ` (${entry.descriptor})` : ''}, using the table “${scale.label}”.`, source: scale.provenance.source },
      ...(scale.note ? [{ text: scale.note }] : []),
    ], entry.descriptor);

  // 1. The section's scale from the system profile, then any other scale of that profile.
  if (profile && profile.id !== 'generic') {
    const chosen = chooseScale(profile, ctx);
    const order = chosen ? [chosen, ...profile.scales.filter((s) => s !== chosen && !s.hint && s.requiresAbove == null)] : profile.scales.filter((s) => !s.hint && s.requiresAbove == null);
    // A maximum mark printed on the row turns a raw mark into a percentage for percentage tables.
    const raw = parseNumber(grade);
    const max = course.maxMark?.value;
    if (raw != null && max && max > 0 && max !== 100 && raw <= max) {
      const p = Math.round((raw / max) * 1000) / 10;
      for (const scale of profile.scales) {
        if (scale.kind !== 'numeric' || scale.domain?.[1] !== 100) continue;
        const e = entryFor(scale, String(p));
        if (e) return use(scale, grade, e, 0.85, `${grade} out of ${max} = ${p}%`);
      }
    }
    for (const scale of order) {
      const e = entryFor(scale, grade);
      if (e) return use(scale, grade, e, scale === chosen ? 0.9 : 0.7);
    }
  }
  if (!generic) return result(null, '—', 0, [{ text: `No conversion table covers the grade “${grade}”.` }]);

  // 2. Unprofiled system: a maximum mark on the row gives a percentage.
  const pct = generic.scales.find((s) => s.id === 'generic-percent');
  const words = generic.scales.find((s) => s.id === 'generic-descriptors');
  const letters = generic.scales.find((s) => s.id === 'generic-letters');
  const n = parseNumber(grade);
  if (pct && n != null && course.maxMark && course.maxMark.value > 0 && n <= course.maxMark.value) {
    const p = Math.round((n / course.maxMark.value) * 1000) / 10;
    const e = entryFor(pct, String(p));
    if (e) return use(pct, grade, e, 0.5, `${grade} out of ${course.maxMark.value} = ${p}%`);
  }
  // 3. A grade word printed on the document ("отлично", "satisfactory").
  if (words) {
    const { rest } = splitGrade(course.grade.original ?? '');
    for (const candidate of [rest, grade]) {
      const e = candidate ? entryFor(words, candidate) : null;
      if (e) return use(words, candidate, e, 0.55, `“${course.grade.original ?? grade}”`);
    }
  }
  // 4. Plain letters, or a number that can only be a percentage.
  if (letters) {
    const e = entryFor(letters, grade);
    if (e) return use(letters, grade, e, 0.5);
  }
  if (pct && n != null && n > 10 && n <= 100) {
    const e = entryFor(pct, grade);
    if (e) return use(pct, grade, e, 0.35, `“${grade}” read as a percentage`);
  }
  return result(null, '—', 0, [{ text: `No conversion table covers the grade “${grade}”. Enter the US equivalent manually.` }]);
}
