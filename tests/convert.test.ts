import { describe, expect, it } from 'vitest';
import { chooseScale } from '../src/core/convert.ts';
import { course, generic, letter, sys } from './helpers.ts';
import { convertGrade } from '../src/core/convert.ts';
import type { ExtractedCourse } from '../src/core/types.ts';

describe('grade conversion (cited tables)', () => {
  it('WAEC A1–F9 (Scholaro, Gambia/Nigeria)', () => {
    expect(['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'].map((g) => letter('waec', g))).toEqual(['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D', 'F']);
  });
  it('GABECE 1–9', () => {
    expect(['1', '2', '3', '4', '6', '7', '9'].map((g) => letter('gabece', g))).toEqual(['A', 'A', 'B', 'B', 'C', 'D', 'F']);
  });
  it('JAMB scores are never turned into letter grades', () => {
    expect(letter('jamb', '64')).toBe('NC');
  });
  it('IB 1–7 and core A–E', () => {
    expect(['7', '6', '5', '4', '3', '2'].map((g) => letter('ib', g, { grades: ['7', '6', '5', '4', '3', '2', 'B'] }))).toEqual(['A', 'A', 'B', 'C', 'D', 'F']);
    expect(letter('ib', 'B', { grades: ['7', '5', 'B'] })).toBe('B');
  });
  it('UK GCSE 9–1 and A level, chosen by the section heading', () => {
    expect(['9', '7', '6', '5', '4', '3', '1'].map((g) => letter('uk', g, { grades: ['9', '7', '6', '5', '4', '3'], hint: 'Summer 2023 — Year 11' }))).toEqual(['A', 'A', 'B', 'C', 'C', 'D', 'D']);
    expect(['A*', 'B', 'C', 'E'].map((g) => letter('uk', g, { grades: ['A*', 'B', 'C'], hint: 'Summer 2025 — Year 13' }))).toEqual(['A', 'B', 'B', 'C']);
  });
  it('CBSE marks out of 100', () => {
    expect([95, 82, 77, 61, 45, 35, 20].map((m) => letter('in-cbse', String(m), { grades: ['95', '82', '77'] }))).toEqual(['A', 'A', 'B', 'B', 'C', 'D', 'F']);
  });
  it('China 100-point and five-level results', () => {
    expect([92, 85, 74, 61, 40].map((m) => letter('cn', String(m), { grades: ['92', '85', '74'] }))).toEqual(['A', 'B', 'C', 'D', 'F']);
    expect(letter('cn', '良好')).toBe('B');
  });
  it('Mexico 0–10 with 6 as the pass mark', () => {
    expect(['10', '9', '8', '7', '6', '5'].map((g) => letter('mx-sep', g))).toEqual(['A', 'A', 'B', 'C', 'C', 'F']);
  });
  it('France marks out of 20', () => {
    expect(['16.5', '14', '12.5', '10', '9.5'].map((g) => letter('fr', g))).toEqual(['A', 'A', 'B', 'C', 'F']);
  });
  it('Germany: words, 1–6 marks, and 15-point scale only where the section calls for it', () => {
    expect(['sehr gut', 'gut', 'befriedigend', 'ausreichend', 'mangelhaft'].map((g) => letter('de', g))).toEqual(['A', 'A', 'B', 'C', 'D']);
    expect(letter('de', '2', { grades: ['1', '2', '3', '4'], hint: 'Jahreszeugnis Klasse 9' })).toBe('A');
    expect(letter('de', '8', { grades: ['11', '13', '8', '5'], hint: 'Qualifikationsphase 1' })).toBe('B');
    expect(letter('de', '5', { grades: ['11', '13', '8', '5'], hint: 'Qualifikationsphase 1' })).toBe('C');
  });
  it('Philippines, Brazil, Korea, Vietnam, Russia', () => {
    expect([96, 91, 86, 81, 76, 70].map((m) => letter('ph-k12', String(m), { grades: ['96', '91', '86'] }))).toEqual(['A', 'B', 'B', 'C', 'C', 'F']);
    expect(['9.5', '7.5', '6.5', '5.5', '4'].map((g) => letter('br', g))).toEqual(['A', 'B', 'C', 'D', 'F']);
    expect(['A', 'B', 'C', 'D', 'E'].map((g) => letter('kr', g))).toEqual(['A', 'A', 'B', 'C', 'D']);
    expect(['9.3', '8', '7.2', '6', '5.1', '4.9', 'Đ'].map((g) => letter('vn', g, { grades: ['9.3', '8', '7.2'] }))).toEqual(['A', 'A', 'B', 'B', 'C', 'F', 'P']);
    expect(['5', '4', '3', '2'].map((g) => letter('ru', g))).toEqual(['A', 'B', 'C', 'F']);
  });
  it('Egypt: a raw mark is divided by the printed maximum first', () => {
    expect(letter('eg', '68', {}, { maxMark: { value: 80, confidence: 1 } })).toBe('B'); // 85%
    expect(letter('eg', '55', {}, { maxMark: { value: 60, confidence: 1 } })).toBe('A'); // 91.7%
    expect(letter('eg', '39', {}, { maxMark: { value: 60, confidence: 1 } })).toBe('B'); // 65%
  });
  it('unprofiled systems: percentage of a printed maximum, grade words, otherwise nothing', () => {
    const conv = (c: ExtractedCourse) => convertGrade(c, generic, generic, { grades: [c.grade.value], hintText: '' });
    const pct = conv(course('82', { maxMark: { value: 100, confidence: 1 } }));
    expect(pct.letter).toBe('B');
    expect(pct.confidence).toBeLessThan(0.6);
    expect(conv(course('5', { grade: { value: '5', original: '5 (отлично)', confidence: 1 } })).letter).toBe('A');
    expect(conv(course('4')).letter).toBeNull();
  });
  it('names the table it used', () => {
    const c = convertGrade(course('B3'), sys('waec'), generic, { grades: ['B3'], hintText: '' });
    expect(c.table).toContain('WAEC');
    expect(c.reasons[0].source?.url).toContain('scholaro.com');
  });
  it('picks the scale that fits the whole section', () => {
    expect(chooseScale(sys('de'), { grades: ['gut', 'sehr gut'], hintText: '' })?.id).toBe('de-words');
    expect(chooseScale(sys('waec'), { grades: ['68', '74', '81'], hintText: '' })?.id).toBe('waec-percent');
  });
});
