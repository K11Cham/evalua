// Fake records for the language-of-instruction checks. All FICTITIOUS.
import { mxSep } from './specs-b.ts';
import type { FakeSpec } from './types.ts';

const enWords = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'];

/**
 * A certified English translation of the Mexican certificate, as a family might bring it. It is written in English,
 * but the student was taught in Spanish: English is a foreign-language subject, and the language-arts courses are
 * Spanish language arts.
 */
export const mxSepTranslation: FakeSpec = {
  ...mxSep,
  id: 'mx-sep-translation',
  lang: 'en',
  formats: ['pdf', 'scan-jpg'],
  twoUp: true,
  issuer: ['CERTIFIED TRANSLATION FROM SPANISH INTO ENGLISH', 'Original: Secretaría de Educación Pública — Dirección General del Bachillerato'],
  title: 'CERTIFICATE OF COMPLETION OF STUDIES',
  subtitle: 'GENERAL BACCALAUREATE (BACHILLERATO GENERAL) — SEMESTER PLAN',
  info: [
    { label: 'Student name', value: 'HERNÁNDEZ ZAVALA DIEGO ALEJANDRO', role: 'name' },
    { label: 'CURP', value: 'HEZD070921HJCRVG04', role: 'id' },
    { label: 'Date of birth', value: '21 September 2007', role: 'dob' },
    { label: 'School', value: 'Preparatoria Valle de Atemajac', role: 'school' },
    { label: 'Place and date of issue', value: 'Zapopan, Jalisco, 11 July 2025', role: 'issued' },
  ],
  cols: [
    { h: 'SUBJECT', f: 'n' },
    { h: 'GRADE', f: 'g', align: 'c' },
    { h: 'IN WORDS', f: 'x.letra' },
    { h: 'CREDITS', f: 'cr', align: 'c' },
  ],
  years: mxSep.years.map((y) => ({
    ...y,
    label: y.label.replace('PRIMER', 'FIRST').replace('SEGUNDO', 'SECOND').replace('TERCER', 'THIRD').replace('CUARTO', 'FOURTH').replace('QUINTO', 'FIFTH').replace('SEXTO', 'SIXTH').replace('SEMESTRE', 'SEMESTER'),
    courses: y.courses.map((c) => ({
      ...c,
      n: c.en,
      x: { letra: enWords[Number(c.g)] },
      // Taught in Spanish: English is a foreign language, and language arts are Spanish language arts.
      k: /^English/.test(c.en) ? 'ela.efl' : c.k,
    })),
  })),
  notes: [
    'The grading scale is 5 to 10; 6 is the minimum passing grade.',
    'I certify that this is a true and accurate translation of the original document in Spanish, which I have seen.',
    'Certified translator: M. Ruiz (fictitious), translator’s seal no. 0000.',
  ],
  signatures: ['Certified translator'],
  instruction: { english: false, translated: true },
};

export const specsC: FakeSpec[] = [mxSepTranslation];
