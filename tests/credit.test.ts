import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/core/evaluate.ts';
import { roundToStep } from '../src/core/coverage.ts';
import { runExtraction } from '../src/core/pipeline.ts';
import { docxHtmlToDoc } from '../src/ingest/docx.ts';
import { kb, rows, termReport } from './helpers.ts';

describe('credit follows what was covered', () => {
  const ex = runExtraction(docxHtmlToDoc(termReport('Second Term', '11 S1', rows)), kb);
  const jcps = kb.districts.find((d) => d.id === 'ky-jcps')!;
  it('reads a numbered term report: names without row numbers, the term and the class', () => {
    expect(ex.systemId.value).toBe('waec');
    expect(ex.courses.map((c) => c.name.original)).toEqual(rows.map((r) => r[0]));
    expect(ex.courses.every((c) => c.term === '2' && c.level === 11)).toBe(true);
    expect(ex.student.id.value).toBe('KR117');
    expect(ex.student.name.value).toBe('Awa Binta Sanneh');
  });
  it('converts the percentage mark when the school letter is not a WAEC grade', () => {
    const ev = evaluate(ex, kb, jcps);
    const pe = ev.suggestions.find((s) => s.conceptId === 'pe')!;
    expect(pe.grade.letter).toBe('D'); // 40% = E8 Pass in the WAEC percentage bands, not F
    expect(ev.suggestions.find((s) => s.conceptId === 'cs')).toBeTruthy(); // "&" no longer breaks the match
  });
  it('documents one term of three, so no credit is suggested yet in half-credit steps', () => {
    const ev = evaluate(ex, kb, jcps);
    expect(ev.suggestions.every((s) => s.share === 0.33)).toBe(true);
    expect(ev.totalEarned).toBe(0);
    expect(ev.flags.some((f) => f.id === 'partial-year')).toBe(true);
    expect(ev.flags.some((f) => f.id === 'completed-abroad')).toBe(false);
  });
  it('counts two of three terms as one semester when the earlier term is confirmed', () => {
    const ev = evaluate(ex, kb, jcps, {}, { earlierTermsDone: [11] });
    const math = ev.suggestions.find((s) => s.conceptId === 'math.general')!;
    expect(math.share).toBe(0.67);
    expect(math.credits).toBe(0.5);
  });
  it('adds up term reports of the same course into a full year', () => {
    const both = runExtraction(docxHtmlToDoc(termReport('First Term', '11 S1', rows) + termReport('Second Term', '11 S1', rows) + termReport('Third Term', '11 S1', rows)), kb);
    const ev = evaluate(both, kb, jcps);
    const maths = ev.suggestions.filter((s) => s.conceptId === 'math.general');
    expect(maths).toHaveLength(3);
    expect(maths.reduce((a, s) => a + s.credits, 0)).toBeCloseTo(1, 2);
    expect(ev.totalEarned).toBeGreaterThanOrEqual(5);
  });
  it('reads several term reports uploaded together, each page with its own term', () => {
    // A multi-file upload becomes one record with one page per file.
    const pages = ['First Term', 'Second Term', 'Third Term'].map((t) => docxHtmlToDoc(termReport(t, '11 S1', rows)));
    const doc = { kind: 'docx' as const, pages: [] as typeof pages[0]['pages'], tokens: [] as typeof pages[0]['tokens'], engine: 'test', warnings: [] as string[] };
    for (const p of pages) {
      const off = doc.pages.length;
      doc.pages.push(...p.pages);
      doc.tokens.push(...p.tokens.map((t) => ({ ...t, page: t.page + off })));
    }
    const combined = runExtraction(doc, kb);
    const maths = combined.courses.filter((c) => c.name.original === 'MATHEMATICS');
    expect(maths.map((c) => c.term)).toEqual(['1', '2', '3']);
    const ev = evaluate(combined, kb, jcps);
    const mathCredit = ev.suggestions.filter((s) => s.conceptId === 'math.general').reduce((a, s) => a + s.credits, 0);
    expect(mathCredit).toBeCloseTo(1, 5);
    expect(ev.flags.some((f) => f.id === 'partial-year')).toBe(false);
  });
  it('strips row numbers page by page when combined files number rows differently', () => {
    const numbered = docxHtmlToDoc(termReport('Second Term', '11 S1', rows));
    const plain = docxHtmlToDoc(
      `<p>KOTU RIDGE SENIOR SECONDARY SCHOOL</p><p>Third Term</p><p>CLASS: 11 S1</p><table><tr><th>Subject</th><th>Mark(%)</th><th>Grade</th></tr>` +
        rows.map(([s, m, g]) => `<tr><td>${s}</td><td>${m}</td><td>${g}</td></tr>`).join('') + '</table>',
    );
    const doc = { ...numbered, pages: [...numbered.pages, ...plain.pages], tokens: [...numbered.tokens, ...plain.tokens.map((t) => ({ ...t, page: t.page + 1 }))] };
    const ex2 = runExtraction(doc, kb);
    expect(ex2.courses.map((c) => c.name.original)).toEqual([...rows.map((r) => r[0]), ...rows.map((r) => r[0])]);
  });
  it('places mathematics on the US course sequence and suggests where to continue', () => {
    const ev = evaluate(ex, kb, jcps);
    // WAEC mathematics is a spiral course: year 2 of 3 (SS2 = grade 11) stands for the second US course.
    expect(ev.suggestions.find((s) => s.conceptId === 'math.general')!.usCourse?.title).toBe('Geometry');
    expect(ev.suggestions.find((s) => s.conceptId === 'math.advanced')!.usCourse?.title).toBe('Pre-Calculus');
    const p = ev.placements.find((x) => x.ladder === 'math')!;
    // Further Mathematics covers most of Algebra II; Geometry's circle theorems and similarity come later.
    expect(p.completed).toEqual(['Algebra I', 'Algebra II']);
    expect(p.continueIn?.title).toBe('Geometry');
    expect(p.continueIn?.catalogTitle).toBe('Geometry');
    expect(p.steps.find((s) => s.title === 'Geometry')!.missing).toContain('circle theorems (arcs, chords, angles)');
    expect(p.reasons.some((r) => /12th week|twelfth week/.test(r.text))).toBe(true);
  });
  it('falls back to the usual US grade-level sequence, at low confidence, when no syllabus is on file', () => {
    const doc = docxHtmlToDoc('<p>Lycée de la Colline — Bulletin</p><p>Classe de Première</p><table><tr><th>Matières</th><th>Moyenne élève /20</th></tr><tr><td>Mathématiques</td><td>14</td></tr></table>');
    const fr = runExtraction(doc, kb);
    const ev = evaluate(fr, kb, jcps);
    expect(ev.suggestions[0].usCourse?.title).toBe('Algebra II');
    expect(ev.placements[0].confidence).toBeLessThan(0.5);
  });
  it('moves later years of a subject up the ladder instead of repeating the same US course', () => {
    const years = runExtraction(docxHtmlToDoc(
      '<p>MEXICO SECRETARÍA DE EDUCACIÓN PÚBLICA BACHILLERATO</p><p>PRIMER SEMESTRE</p><table><tr><th>ASIGNATURA</th><th>CALIF.</th></tr><tr><td>Matemáticas I</td><td>9</td></tr></table>' +
      '<p>SEGUNDO SEMESTRE</p><table><tr><th>ASIGNATURA</th><th>CALIF.</th></tr><tr><td>Matemáticas II</td><td>9</td></tr></table>'), kb);
    const ev = evaluate(years, kb, jcps);
    expect(ev.suggestions.map((s) => s.usCourse?.title)).toEqual(['Algebra I', 'Geometry']);
    expect(ev.suggestions.map((s) => s.credits)).toEqual([0.5, 0.5]);
  });
  it('checks JCPS’s named courses: Algebra II and U.S. History', () => {
    const ev = evaluate(ex, kb, jcps);
    const math = ev.progress.find((p) => p.requirementId === 'math')!;
    expect(math.includes?.map((i) => i.label)).toEqual(['Algebra I', 'Geometry', 'Algebra II']);
    const social = ev.progress.find((p) => p.requirementId === 'social')!;
    expect(social.includes?.find((i) => i.label === 'U.S. History')?.met).toBe(false);
    // With the earlier term confirmed: one English row is half a credit, so English I is in progress and English II not.
    const ev2 = evaluate(ex, kb, jcps, {}, { earlierTermsDone: [11] });
    const ela = ev2.progress.find((p) => p.requirementId === 'ela')!;
    expect(ela.includes?.map((i) => [i.met, !!i.partial])).toEqual([[false, true], [false, false]]);
    // Algebra I has no credit on this record, but the WAEC sequence says it is covered: the requirement says so.
    const alg1 = ev2.progress.find((p) => p.requirementId === 'math')!.includes!.find((i) => i.label === 'Algebra I')!;
    expect(alg1.met).toBe(false);
    expect(alg1.expected).toMatch(/expected to be covered by earlier years/);
  });
  it('flags JCPS’s rule for students who finished secondary school abroad', () => {
    const wassce = runExtraction(docxHtmlToDoc('<p>THE WEST AFRICAN EXAMINATIONS COUNCIL — WASSCE</p><table><tr><th>SUBJECT</th><th>GRADE</th></tr><tr><td>ENGLISH LANGUAGE</td><td>B3</td></tr><tr><td>MATHEMATICS</td><td>C4</td></tr><tr><td>BIOLOGY</td><td>B2</td></tr></table>'), kb);
    expect(evaluate(wassce, kb, jcps).flags.some((f) => f.id === 'completed-abroad')).toBe(true);
  });
  it('rounds to the district step with slack for two of three terms', () => {
    expect(roundToStep(1 / 3, 0.5)).toBe(0);
    expect(roundToStep(2 / 3, 0.5)).toBe(0.5);
    expect(roundToStep(1, 0.5)).toBe(1);
    expect(roundToStep(0.5, 0.5)).toBe(0.5);
  });
});
