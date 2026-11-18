import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/core/evaluate.ts';
import { assessInstruction, printedInstruction, translationMarker } from '../src/core/instruction.ts';
import { combine, kb, sys, termReport, rows } from './helpers.ts';

const jcps = kb.districts.find((d) => d.id === 'ky-jcps')!;
const conceptOf = (ex: ReturnType<typeof combine>, ev: ReturnType<typeof evaluate>, name: RegExp) =>
  ev.suggestions.find((s) => name.test(ex.courses.find((c) => c.id === s.courseId)!.name.original ?? ''))!;

describe('every system profile says what language its schools teach in', () => {
  it('has a sourced entry, and says "unknown" rather than guess', () => {
    for (const s of kb.systems) {
      expect(s.instruction, s.id).toBeDefined();
      expect(s.instruction.provenance.source.url, s.id).toMatch(/^https:\/\//);
      expect(s.instruction.provenance.addedOn, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (!s.instruction.languages.length) expect(s.instruction.varies, s.id).toBe('unknown');
    }
    expect(sys('waec').instruction.languages).toEqual(['en']);
    expect(sys('generic').instruction.languages).toEqual([]);
  });
});

describe('statements printed on a record', () => {
  it('reads a printed language of instruction in several languages', () => {
    expect(printedInstruction('Medium of Instruction: English')?.languages).toEqual(['en']);
    expect(printedInstruction("Langue d'enseignement : français")?.languages).toEqual(['fr']);
    expect(printedInstruction('Idioma de instrucción: español')?.languages).toEqual(['es']);
    expect(printedInstruction('Medium of instruction: Hindi / English')?.languages.sort()).toEqual(['en', 'hi']);
    expect(printedInstruction('English Language 72 B3')).toBeNull();
  });
  it('recognises a translator’s statement', () => {
    expect(translationMarker('CERTIFIED TRANSLATION from Spanish into English')).toBeTruthy();
    expect(translationMarker('I certify that this is a true and accurate translation of the original')).toBeTruthy();
    expect(translationMarker('Traducción oficial')).toBeTruthy();
    expect(translationMarker('Tradução juramentada')).toBeTruthy();
    expect(translationMarker('English Language 72 B3')).toBeNull();
  });
});

describe('the language of instruction of a record', () => {
  it('an English-medium system: taught in English, and English Language is English language arts', () => {
    const ex = combine(termReport('SECOND TERM', 'GRADE 11', [...rows, ['ENGLISH LANGUAGE', 66, 'B']]));
    const ev = evaluate(ex, kb, jcps);
    expect(ev.instruction).toMatchObject({ english: true, strength: 'system', translated: false });
    expect(ev.instruction.summary).toMatch(/^Taught in English: The Gambia’s secondary schools teach in English/);
    const eng = conceptOf(ex, ev, /^ENGLISH LANGUAGE$/);
    expect(eng.conceptId).toBe('ela.english');
    expect(eng.requirementId).toBe('ela');
    expect(eng.reasons.some((r) => /Taught in English .* English language arts/.test(r.text))).toBe(true);
  });
  it('a statement printed on the record is the strongest evidence, and settles a system that varies by school', () => {
    const cbse = `<p>CENTRAL BOARD OF SECONDARY EDUCATION</p><p>Senior School Certificate Examination</p><p>Medium of Instruction: English</p><p>Name: ARORA Meera</p>` +
      `<table><tr><th>Subject</th><th>Marks</th><th>Grade</th></tr><tr><td>English Core</td><td>88</td><td>A2</td></tr><tr><td>Mathematics</td><td>91</td><td>A1</td></tr></table>`;
    const ex = combine(cbse);
    expect(ex.stated?.instruction?.languages).toEqual(['en']);
    const ev = evaluate(ex, kb, jcps);
    expect(ev.instruction).toMatchObject({ english: true, strength: 'printed' });
    // Without the statement the same system only says "English or Hindi".
    const bare = evaluate(combine(cbse.replace('<p>Medium of Instruction: English</p>', '')), kb, jcps).instruction;
    expect(bare).toMatchObject({ english: null, strength: 'system-varies' });
  });
  it('a certified English translation of a Spanish-medium record: English is a foreign-language subject', () => {
    const tr = `<p>CERTIFIED TRANSLATION FROM SPANISH INTO ENGLISH</p><p>Original: Certificado de Terminación de Estudios, Secretaría de Educación Pública, Bachillerato General</p>` +
      `<p>Name: ORTEGA RUIZ Valeria</p><p>FIRST SEMESTER</p><table><tr><th>Subject</th><th>Grade</th></tr><tr><td>Mathematics I</td><td>9</td></tr><tr><td>English I</td><td>10</td></tr><tr><td>Chemistry I</td><td>8</td></tr><tr><td>Literature I</td><td>8</td></tr></table>` +
      `<p>I certify that this is a true and accurate translation of the original document. Certified translator.</p>`;
    const ex = combine(tr);
    expect(ex.systemId.value).toBe('mx-sep');
    expect(ex.stated?.translation).toBeDefined();
    const ev = evaluate(ex, kb, jcps);
    expect(ev.instruction).toMatchObject({ english: false, translated: true, languages: ['es'] });
    const eng = conceptOf(ex, ev, /^English I$/);
    expect(eng.conceptId).toBe('ela.efl');
    expect(eng.reasons.some((r) => /foreign-language subject\. The record is a translation/.test(r.text))).toBe(true);
    // Literature on a translated Spanish record is Spanish literature, not English.
    expect(conceptOf(ex, ev, /^Literature I$/).conceptId).toBe('wl.native');
    // The profile's English names are known, so a translated course keeps its subject.
    expect(conceptOf(ex, ev, /^Mathematics I$/).conceptId).toBe('math.algebra1');
  });
  it('an unrecognised system in English: only weak evidence, and no answer', () => {
    const a = assessInstruction({ language: 'en', country: { value: '', confidence: 0 } }, sys('generic'));
    expect(a).toMatchObject({ english: null, strength: 'document' });
    expect(a.summary).toMatch(/Not known/);
  });
  it('a counselor’s own choice of subject is never overridden', () => {
    const ex = combine(termReport('SECOND TERM', 'GRADE 11', [...rows, ['ENGLISH LANGUAGE', 66, 'B']]));
    const id = ex.courses.find((c) => c.name.original === 'ENGLISH LANGUAGE')!.id;
    const ev = evaluate(ex, kb, jcps, { [id]: { conceptId: 'ela.efl' } });
    expect(ev.suggestions.find((s) => s.courseId === id)!.conceptId).toBe('ela.efl');
  });
});

describe('the district’s English-learner process', () => {
  it('JCPS cites how English learners are identified, and country of origin is not part of it', () => {
    const p = jcps.policies.find((x) => x.id === 'el-identification')!;
    expect(p.text).toMatch(/Home Language Survey/);
    expect(p.text).toMatch(/WIDA Screener/);
    expect(p.text).toMatch(/Country of origin is not part of the process/);
    expect([p.source, ...(p.more ?? [])].map((s) => s.url)).toEqual(expect.arrayContaining([expect.stringMatching(/jefferson\.kyschools\.us/), expect.stringMatching(/KY-ID-Placement-Guidance/)]));
  });
});
