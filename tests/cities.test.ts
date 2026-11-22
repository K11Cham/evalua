import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/core/evaluate.ts';
import { runExtraction } from '../src/core/pipeline.ts';
import { docxHtmlToDoc } from '../src/ingest/docx.ts';
import { combine, kb } from './helpers.ts';

const district = (id: string) => kb.districts.find((d) => d.id === id)!;
const jcps = district('ky-jcps');
const cps = district('il-cps');
const nyc = district('ny-nycps');
const mdcps = district('fl-mdcps');
const hisd = district('tx-hisd');
const mcps = district('md-mcps');
const CITIES = [cps, nyc, mdcps, hisd, mcps];

// A certified translation of a Spanish-medium Mexican record: two semesters of one year.
const mexican = (semester = 'FIRST SEMESTER') =>
  combine(
    `<p>CERTIFIED TRANSLATION FROM SPANISH INTO ENGLISH</p><p>Original: Certificado de Terminación de Estudios, Secretaría de Educación Pública, Bachillerato General</p>` +
      `<p>Name: ORTEGA RUIZ Valeria</p><p>${semester}</p><table><tr><th>Subject</th><th>Grade</th></tr><tr><td>Mathematics I</td><td>9</td></tr><tr><td>English I</td><td>10</td></tr><tr><td>Chemistry I</td><td>8</td></tr><tr><td>Literature I</td><td>8</td></tr></table>` +
      `<p>I certify that this is a true and accurate translation of the original document. Certified translator.</p>`,
  );
const named = (ex: ReturnType<typeof combine>, ev: ReturnType<typeof evaluate>, name: RegExp) =>
  ev.suggestions.find((s) => name.test(ex.courses.find((c) => c.id === s.courseId)!.name.original ?? ''))!;

describe('published district profiles for five large districts', () => {
  it('are district profiles, not templates, whose requirements add up to the total', () => {
    expect(CITIES.every(Boolean)).toBe(true);
    for (const d of CITIES) {
      expect(d.kind, d.id).toBe('district');
      expect(d.requirements.reduce((a, r) => a + r.credits, 0), d.id).toBeCloseTo(d.totalCredits, 5);
      expect(d.provenance.addedOn, d.id).toBe('2026-11-21');
    }
  });
  it('say who evaluates a foreign transcript, and every rule links to an official source', () => {
    for (const d of CITIES) {
      expect(d.policies.find((p) => p.id === 'international-transcripts')?.text, d.id).toBeTruthy();
      for (const p of d.policies) for (const s of [p.source, ...(p.more ?? [])]) expect(s.url, `${d.id}: ${p.id}`).toMatch(/^https:\/\//);
    }
    expect(nyc.policies.find((p) => p.id === 'international-transcripts')!.text).toMatch(/principal/);
    expect(mdcps.policies.find((p) => p.id === 'international-transcripts')!.text).toMatch(/Foreign Records Department/);
    expect(mcps.policies.find((p) => p.id === 'international-transcripts')!.text).toMatch(/International Admissions and Enrollment/);
  });
});

describe('home-language and English coursework follow each district’s rule', () => {
  const ex = mexican();
  it('Miami-Dade counts language arts taken abroad as English, and English as a foreign language as foreign-language credit', () => {
    const ev = evaluate(ex, kb, mdcps);
    const lit = named(ex, ev, /^Literature I$/);
    expect(lit.conceptId).toBe('wl.native');
    expect(lit.requirementId).toBe('ela');
    expect(lit.reasons.some((r) => /awarded as an English credit/.test(r.text) && /ELL/.test(r.source?.title ?? ''))).toBe(true);
    const eng = named(ex, ev, /^English I$/);
    expect(eng.conceptId).toBe('ela.efl');
    expect(eng.requirementId).toBe('elective');
    expect(eng.reasons.some((r) => /foreign-language credit/.test(r.text))).toBe(true);
  });
  it('JCPS places the same Spanish literature as a world-language elective, not English', () => {
    expect(named(ex, evaluate(ex, kb, jcps), /^Literature I$/).requirementId).toBe('elective');
  });
  it('Chicago grants World Language credit for both, citing Board Policy 605.1', () => {
    const ev = evaluate(ex, kb, cps);
    for (const name of [/^Literature I$/, /^English I$/]) {
      const s = named(ex, ev, name);
      expect(s.requirementId, String(name)).toBe('world_language');
      expect(s.reasons.some((r) => /605\.1/.test(r.source?.title ?? '')), String(name)).toBe(true);
    }
  });
  it('New York City offers World Languages credit for schooling in another language, and keeps English as a foreign language as an elective', () => {
    const ev = evaluate(ex, kb, nyc);
    expect(named(ex, ev, /^Literature I$/).requirementId).toBe('world_language');
    expect(named(ex, ev, /^Literature I$/).reasons.some((r) => /up to 10 World Languages credits/.test(r.text))).toBe(true);
    expect(named(ex, ev, /^English I$/).requirementId).toBe('elective');
  });
});

describe('credit in each district’s own units', () => {
  it('New York City counts a semester course as one credit, so a semester abroad earns twice the Carnegie figure', () => {
    const ex = mexican();
    const math = (d: typeof nyc) => named(ex, evaluate(ex, kb, d), /^Mathematics I$/).credits;
    expect(math(jcps)).toBe(0.5);
    expect(math(nyc)).toBe(1);
  });
  it('Miami-Dade converts printed hours at Florida’s 135 hours per credit', () => {
    const html = '<p>THE WEST AFRICAN EXAMINATIONS COUNCIL</p><p>Senior Secondary School 2</p><table><tr><th>SUBJECT</th><th>HOURS</th><th>GRADE</th></tr><tr><td>BIOLOGY</td><td>135</td><td>B3</td></tr><tr><td>MATHEMATICS</td><td>120</td><td>C4</td></tr></table>';
    const ex = runExtraction(docxHtmlToDoc(html), kb);
    const ev = evaluate(ex, kb, mdcps);
    const bio = ev.suggestions.find((s) => s.conceptId === 'sci.biology')!;
    expect(bio.credits).toBe(1);
    expect(bio.reasons.some((r) => /135 hours per Carnegie unit/.test(r.text))).toBe(true);
    // 120 hours is less than a Florida credit: one semester.
    expect(ev.suggestions.find((s) => s.courseId !== bio.courseId)!.credits).toBe(0.5);
  });
});

describe('students who already finished secondary school abroad', () => {
  const wassce = runExtraction(docxHtmlToDoc('<p>THE WEST AFRICAN EXAMINATIONS COUNCIL — WASSCE</p><table><tr><th>SUBJECT</th><th>GRADE</th></tr><tr><td>ENGLISH LANGUAGE</td><td>B3</td></tr><tr><td>MATHEMATICS</td><td>C4</td></tr><tr><td>BIOLOGY</td><td>B2</td></tr></table>'), kb);
  it('Miami-Dade points to adult education, Chicago to its rule for visa students', () => {
    expect(evaluate(wassce, kb, mdcps).flags.find((f) => f.id === 'completed-abroad')?.detail).toMatch(/adult education/);
    expect(evaluate(wassce, kb, cps).flags.find((f) => f.id === 'completed-abroad')?.detail).toMatch(/F-1 and J-1/);
  });
  it('districts with no published rule raise no such flag', () => {
    for (const d of [nyc, hisd, mcps]) expect(evaluate(wassce, kb, d).flags.some((f) => f.id === 'completed-abroad'), d.id).toBe(false);
  });
});
