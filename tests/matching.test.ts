// Subject matching and credit for records typed by hand (the fallback when a scan cannot be read), from the systems
// in the JCPS counselors' examples. Every record here is fictitious; subject names are the systems' own.
import { describe, expect, it } from 'vitest';
import { evaluate, runExtraction } from '../src/core/pipeline.ts';
import { parseTypedTable, typedTextToDoc } from '../src/ingest/typed.ts';
import { kb } from './helpers.ts';

const jcps = kb.districts.find((d) => d.id === 'ky-jcps')!;
const read = (text: string) => {
  const ex = runExtraction(typedTextToDoc(text), kb);
  const ev = evaluate(ex, kb, jcps);
  return {
    system: ex.systemId.value,
    rows: ex.courses.map((c) => {
      const s = ev.suggestions.find((x) => x.courseId === c.id)!;
      return { name: c.name.original!, level: c.level, concept: s.conceptId, req: s.requirementId, credits: s.credits, letter: s.grade.letter };
    }),
  };
};
const row = (r: ReturnType<typeof read>, name: string) => r.rows.find((x) => x.name === name)!;

describe('typed tables', () => {
  it('keeps a subject whose name has a colon of its own', () => {
    expect(parseTypedTable('Segunda Lengua: Inglés III: 7.2\nHistoria II: 7.5').rows.map((r) => [r[0], r[1]])).toEqual([
      ['Segunda Lengua: Inglés III', '7.2'],
      ['Historia II', '7.5'],
    ]);
  });
});

describe('Kenya (Form 1–4, KCSE)', () => {
  const r = read('Country: Kenya\nClass: Form 3\nSchool year: 2014-2015\nEnglish: 54\nKiswahili: 52\nMathematics: 64\nChemistry: 45\nHistory & Government: 70\nIRE: 90\nBusiness Studies: 66');
  it('is recognised, Form 3 is grade 11, and marks convert by the KCSE table', () => {
    expect(r.system).toBe('ke');
    expect(r.rows.every((x) => x.level === 11)).toBe(true);
    expect([row(r, 'English').letter, row(r, 'Mathematics').letter, row(r, 'Chemistry').letter, row(r, 'IRE').letter]).toEqual(['C', 'B', 'C', 'A']);
  });
  it('counts English as English (taught in English) and knows the Kenyan subjects', () => {
    expect(row(r, 'English')).toMatchObject({ concept: 'ela.english', req: 'ela' });
    expect(row(r, 'Kiswahili').concept).toBe('wl.other');
    expect(row(r, 'History & Government').concept).toBe('ss.social');
    expect(row(r, 'IRE').concept).toBe('ss.religion');
    expect(row(r, 'Business Studies').concept).toBe('cte.business');
  });
});

describe('Mexico, secundaria', () => {
  const r = read('Country: México\nClass: 3 grado de secundaria\nEspañol III: 7.7\nSegunda Lengua: Inglés III: 7.2\nMatemáticas III: 7.1\nCiencias III (énfasis en Química): 6.7\nHistoria II: 7.5\nFormación Cívica y Ética II: 7.8');
  it('is recognised from the country named, and the year is grade 9', () => {
    expect(r.system).toBe('mx-sep');
    expect(r.rows.every((x) => x.level === 9)).toBe(true);
  });
  it('reads the secundaria subjects as the middle-school sequence, not bachillerato', () => {
    expect(row(r, 'Matemáticas III').concept).toBe('math.general');
    expect(row(r, 'Ciencias III (énfasis en Química)').concept).toBe('sci.chemistry');
    expect(row(r, 'Segunda Lengua: Inglés III').concept).toBe('ela.efl');
    expect(row(r, 'Historia II').concept).toBe('ss.history.national');
    expect(row(r, 'Formación Cívica y Ética II')).toMatchObject({ concept: 'ss.civics', req: 'elective' });
  });
  it('keeps the bachillerato meaning in grades 10–12', () => {
    expect(row(read('Country: México\nPrimer semestre\nMatemáticas III: 8'), 'Matemáticas III').concept).toBe('math.algebra2');
  });
  it('reads a science named by its emphasis as that science', () => {
    expect(row(read('Country: México\nClass: 1 grado de secundaria\nCiencias (énfasis en Física): 8'), 'Ciencias (énfasis en Física)').concept).toBe('sci.physics');
  });
});

describe('hours a week', () => {
  const r = read('Country: Cuba\nClass: 10mo grado\nSubject, Grade, Hours per week\nMatemática, 87, 5\nFísica, 80, 4\nIdioma Extranjero, 90, 3\nEducación Física, 95, 2\nEducación Laboral, 92, 1');
  it('give credit over a 36-week year: 120 hours a full credit, 60 a half', () => {
    expect(r.rows.map((x) => [x.name, x.credits])).toEqual([
      ['Matemática', 1],
      ['Física', 1],
      ['Idioma Extranjero', 0.5],
      ['Educación Física', 0.5],
      ['Educación Laboral', 0],
    ]);
    expect(row(r, 'Educación Laboral').concept).toBe('cte.technology');
  });
});

describe('typed tables from the counselors’ examples', () => {
  it('reads comma-separated rows with numbers, and a Units or Hrs. Sem. heading', () => {
    expect(parseTypedTable('Subject,Grade,Units\nFilipino,84.75,1\nElective - Foreign Language,88.75,0.5')).toMatchObject({
      columns: ['Subject', 'Grade', 'Units'],
      rows: [['Filipino', '84.75', '1'], ['Elective - Foreign Language', '88.75', '0.5']],
    });
    expect(parseTypedTable('Subject,Grade,Hrs. Sem.\nEspañol,3.3,5').rows).toEqual([['Español', '3.3', '5']]);
  });
  it('keeps the three terms of one subject in one US course, so their credit adds up to one', () => {
    const docs = [1, 2, 3].map((t) => typedTextToDoc(`Country: Kenya\nClass: Form 3\nSchool year: 2014-2015\nTerm: Term ${t}\nMathematics: ${[70, 51, 73][t - 1]}\nPhysics: 60`));
    const all = { ...docs[0], pages: docs.flatMap((d) => d.pages), tokens: docs.flatMap((d, i) => d.tokens.map((k) => ({ ...k, page: k.page + i }))), parts: docs.map((_, i) => ({ name: `t${i + 1}`, firstPage: i })) };
    const ex = runExtraction(all, kb);
    const ev = evaluate(ex, kb, jcps);
    const math = ev.suggestions.filter((s) => ex.courses.find((c) => c.id === s.courseId)!.name.original === 'Mathematics');
    expect(new Set(math.map((s) => s.usCourse?.id)).size).toBe(1);
    expect(Math.round(math.reduce((a, s) => a + s.credits, 0) * 100) / 100).toBe(1);
  });
});
