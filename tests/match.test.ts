import { describe, expect, it } from 'vitest';
import { buildMatcher, fixOcrNumerals } from '../src/core/match.ts';
import { kb, sys } from './helpers.ts';

describe('subject matching', () => {
  const m = (system: string | undefined, name: string, english = false) => buildMatcher(kb, system ? sys(system) : undefined, english)(name);
  it('uses the system profile first', () => {
    expect(m('mx-sep', 'Matemáticas III').conceptId).toBe('math.algebra2');
    expect(m('mx-sep', 'Matemáticas III').en).toBe('Mathematics III (Analytic Geometry)');
    expect(m('kr', '수학Ⅰ').conceptId).toBe('math.algebra2');
    expect(m('fr', 'Spécialité Mathématiques').conceptId).toBe('math.advanced');
  });
  it('falls back to the multilingual subject dictionary', () => {
    expect(m(undefined, 'गणित').conceptId).toBe('math.general');
    expect(m(undefined, 'Физика').conceptId).toBe('sci.physics');
    expect(m(undefined, 'اللغة الأجنبية الأولى (الإنجليزية)').conceptId).toBe('ela.efl');
    expect(m('waec', 'FURTHER MATHEMATICS', true).conceptId).toBe('math.advanced');
    expect(m('ib', 'EXTENDED ESSAY (History)', true).conceptId).toBe('elective.other');
  });
  it('tolerates OCR damage and keeps course numbers', () => {
    expect(fixOcrNumerals('Matemáticas1')).toBe('Matemáticas I');
    expect(fixOcrNumerals('Química ll')).toBe('Química II');
    expect(m('mx-sep', 'Quimica ll').conceptId).toBe('sci.chemistry');
    expect(m('vn', 'Toan').conceptId).toBe('math.general');
    expect(m('ph-k12', 'General Biology 2', true).conceptId).toBe('sci.biology');
  });
  it('separates home-language courses, English as a foreign language and other languages', () => {
    expect(m('mx-sep', 'Taller de Lectura y Redacción II').conceptId).toBe('wl.native');
    expect(m('mx-sep', 'Inglés IV').conceptId).toBe('ela.efl');
    expect(m('waec', 'Yoruba Language', true).conceptId).toBe('wl.native');
    expect(m('gabece', 'ARABIC', true).conceptId).toBe('wl.other');
  });
  it('says so when it does not know', () => {
    const r = m(undefined, 'Zzyzx Qwertology');
    expect(r.conceptId).toBe('elective.other');
    expect(r.confidence).toBeLessThan(0.5);
    expect(r.translation).toBe('none');
  });
});
