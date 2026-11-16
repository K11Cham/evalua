import { describe, expect, it } from 'vitest';
import { roundToStep, spans } from '../src/core/coverage.ts';
import type { ExtractedCourse } from '../src/core/types.ts';
import { course, sys } from './helpers.ts';

const row = (id: string, name: string, level: number, term?: string, extra: Partial<ExtractedCourse> = {}) =>
  course('80', { id, name: { value: name, original: name, confidence: 1 }, level, term, ...extra });

describe('share of the school year each row documents', () => {
  const waec = sys('waec');
  it('one term of a three-term year is a third of a year', () => {
    const s = spans([row('a', 'MATHEMATICS', 11, '2')], waec).get('a')!;
    expect([s.share, s.index, s.perYear, s.unit]).toEqual([1 / 3, 2, 3, 'term']);
    expect(s.reasons[0].text).toMatch(/Earlier terms of this year are not on the document/);
  });
  it('a row with no term, or a whole-year column, is a full year', () => {
    const m = spans([row('a', 'PHYSICS', 10), row('b', 'CHEMISTRY', 10, '2', { wholeYear: true })], waec);
    expect([m.get('a')!.share, m.get('b')!.share]).toEqual([1, 1]);
  });
  it('rows for several terms of one subject each count their own term', () => {
    const m = spans([row('a', 'MATHEMATICS', 10, '1'), row('b', 'MATHEMATICS', 10, '2'), row('c', 'MATHEMATICS', 10, '3')], waec);
    expect([...m.values()].reduce((a, s) => a + s.share, 0)).toBeCloseTo(1, 10);
  });
  it('confirmed earlier terms make a later report stand for the year so far', () => {
    const s = spans([row('a', 'MATHEMATICS', 11, '2')], waec, { earlierTermsDone: [11] }).get('a')!;
    expect(s.share).toBeCloseTo(2 / 3, 10);
    expect(s.reasons[0].text).toMatch(/counselor confirmed/);
    // Only in the confirmed grade level.
    expect(spans([row('a', 'MATHEMATICS', 10, '2')], waec, { earlierTermsDone: [11] }).get('a')!.share).toBeCloseTo(1 / 3, 10);
  });
  it('does not count earlier terms twice when they are already on the record', () => {
    const m = spans([row('a', 'MATHEMATICS', 11, '1'), row('b', 'MATHEMATICS', 11, '2')], waec, { earlierTermsDone: [11] });
    expect(m.get('b')!.share).toBeCloseTo(1 / 3, 10);
  });
  it('uses the system calendar, and the document’s own word over it', () => {
    expect(spans([row('a', 'Matemáticas II', 10, '2')], sys('mx-sep')).get('a')!.share).toBe(0.5);
    expect(spans([row('a', 'MATHEMATICS', 11, '1', { termUnit: 'semester' })], waec).get('a')!.share).toBe(0.5);
    expect(spans([row('a', 'Math', 9, '3', { termUnit: 'quarter' })], undefined).get('a')!.share).toBe(0.25);
  });
});

describe('rounding to the district credit step', () => {
  it('two of three terms earn a semester, one term earns nothing yet', () => {
    expect(roundToStep(1 / 3, 0.5)).toBe(0);
    expect(roundToStep(2 / 3, 0.5)).toBe(0.5);
    expect(roundToStep(0.96, 0.5)).toBe(1);
  });
  it('never more than one credit per course-year, never negative', () => {
    expect(roundToStep(1.5, 0.5)).toBe(1);
    expect(roundToStep(0, 0.5)).toBe(0);
    expect(roundToStep(-1, 0.5)).toBe(0);
  });
  it('follows a quarter-credit step', () => {
    expect(roundToStep(1 / 3, 0.25)).toBe(0.25);
    expect(roundToStep(0.5, 0.25)).toBe(0.5);
  });
});
