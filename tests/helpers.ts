// Shared fixtures for the unit tests. Every record here is fictitious.
import { convertGrade } from '../src/core/convert.ts';
import { runExtraction } from '../src/core/pipeline.ts';
import type { DocTokens, ExtractedCourse, USLetter } from '../src/core/types.ts';
import { docxHtmlToDoc } from '../src/ingest/docx.ts';
import { seedKb } from '../src/kb/index.ts';

export const kb = seedKb();
export const sys = (id: string) => kb.systems.find((s) => s.id === id)!;
export const generic = sys('generic');
export const course = (grade: string, extra: Partial<ExtractedCourse> = {}): ExtractedCourse => ({
  id: 'c1', name: { value: 'X', original: 'X', confidence: 1 }, translation: 'same', grade: { value: grade, original: grade, confidence: 1 },
  period: { value: '', confidence: 1 }, level: 10, ...extra,
});
export const letter = (system: string, grade: string, ctx: { grades?: string[]; hint?: string } = {}, extra: Partial<ExtractedCourse> = {}): USLetter | null =>
  convertGrade(course(grade, extra), sys(system), generic, { grades: ctx.grades ?? [grade], hintText: ctx.hint ?? '' }).letter;

// A fictitious West African term report: row numbers, a percentage column and the school's own letters.
export const termReport = (term: string, cls: string, rows: [string, number, string][]) =>
  `<p>KOTU RIDGE SENIOR SECONDARY SCHOOL</p><p>Banjul, The Gambia</p><p>${term}</p>` +
  `<p>STUDENT: SANNEH, Awa Binta</p><p>NUMBER: KR117</p><p>CLASS: ${cls}</p><p>YEAR: 2025/2026 Academic Year</p>` +
  `<table><tr><th>#</th><th>Subject</th><th>Mark(%)</th><th>Grade</th><th>Remark</th></tr>` +
  rows.map(([s, m, g], i) => `<tr><td>${i + 1}</td><td>${i + 1}${s}</td><td>${m}</td><td>${g}</td><td>Excellent</td></tr>`).join('') +
  `</table><p>Overall Termly Grade: A</p>`;
export const rows: [string, number, string][] = [['MATHEMATICS', 100, 'A'], ['ENGLISH LANGUAGE', 66, 'B'], ['PHYSICS', 91, 'A'], ['FURTHER MATHEMATICS', 94, 'A'], ['PHYSICAL EDUCATION', 40, 'E'], ['INFORMATION & COMMUNICATION TECHNOLOGY', 81, 'A']];

/** Several Word-style reports combined into one record, the way a multi-file upload does. */
export function combineDocs(...htmls: string[]): DocTokens {
  const parts = htmls.map((h) => docxHtmlToDoc(h));
  const doc: DocTokens = { kind: 'docx', pages: [], tokens: [], engine: 'test', warnings: [], parts: [] };
  parts.forEach((p, i) => {
    const off = doc.pages.length;
    doc.parts!.push({ name: `f${i}`, firstPage: off });
    doc.pages.push(...p.pages);
    doc.tokens.push(...p.tokens.map((t) => ({ ...t, page: t.page + off })));
  });
  return doc;
}
export const combine = (...htmls: string[]) => runExtraction(combineDocs(...htmls), kb);
