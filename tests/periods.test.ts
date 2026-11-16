import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/core/evaluate.ts';
import { groupByPeriod, periodKey, periodLabel } from '../src/core/periods.ts';
import { caseFlags } from '../src/core/verify.ts';
import { combine, kb } from './helpers.ts';

describe('periods across files', () => {
  it('treats the same term of different years as different periods: groups, duplicates and printed totals', () => {
    const gm = (term: string, cls: string, year: string, maths: string, total: string) =>
      `<p>BAKAU UPPER BASIC AND SENIOR SECONDARY SCHOOL</p><p>${term} REPORT</p><p>NAME: KEBBEH Fatou</p><p>CLASS: ${cls}</p><p>YEAR: ${year}</p>` +
      `<table><tr><th>Subject</th><th>Total %</th></tr><tr><td>English Language</td><td>70</td></tr><tr><td>Mathematics</td><td>${maths}</td></tr><tr><td>Biology</td><td>60</td></tr><tr><td>Total</td><td>${total}</td></tr></table>`;
    const ex6 = combine(gm('FIRST TERM', 'GRADE 10', '2024-2025', '80', '210'), gm('SECOND TERM', 'GRADE 10', '2024-2025', '80', '210'), gm('FIRST TERM', 'GRADE 11', '2025-2026', '80', '219'));
    const groups = groupByPeriod(ex6.courses);
    expect(groups.map((g) => [g.items[0].level, g.items[0].term, g.items.length])).toEqual([[10, '1', 3], [10, '2', 3], [11, '1', 3]]);
    expect(groups[0].label).toContain('2024-2025');
    const ev6 = evaluate(ex6, kb, kb.districts[0]);
    const all = caseFlags(ex6, ev6.flags);
    expect(all.filter((f) => f.id.startsWith('dup-'))).toEqual([]);
    // Only the third report's total is off (70 + 80 + 60 = 210, printed 219).
    const totals = all.filter((f) => f.id.startsWith('total-mismatch'));
    expect(totals).toHaveLength(1);
    expect(totals[0].source?.page).toBe(2);
    // A course really listed twice in one report is still caught, and an old stored copy of the check is ignored.
    const twice = { ...ex6, courses: [...ex6.courses, { ...ex6.courses[0], id: 'again' }], flags: [...ex6.flags, { id: 'dup-old', severity: 'check' as const, title: 'Listed twice: stale', detail: '' }] };
    const flags = caseFlags(twice, evaluate(twice, kb, kb.districts[0]).flags);
    expect(flags.filter((f) => f.id.startsWith('dup-')).map((f) => f.id)).toEqual(['dup-again']);
  });
});

describe('period keys, labels and order', () => {
  const c = (period: string, level: number | null, academicYear?: string, term?: string) => ({ period: { value: period, confidence: 1 }, level, academicYear, term });
  it('keys a period by its label, grade level and school year', () => {
    expect(periodKey(c('First term', 10, '2024-2025'))).not.toBe(periodKey(c('First term', 11, '2025-2026')));
    expect(periodKey(c('First term', 10, '2024-2025'))).toBe(periodKey(c('First term', 10, '2024-2025')));
  });
  it('adds the school year to the label only when the label does not show it', () => {
    expect(periodLabel(c('First term', 10, '2024-2025'))).toBe('First term · 2024-2025');
    expect(periodLabel(c('SS 2 (2022/2023)', 11, '2022-2023'))).toBe('SS 2 (2022/2023)');
    expect(periodLabel(c('', 10, '2024-2025'))).toBe('2024-2025');
    expect(periodLabel(c('Grade 9', 9))).toBe('Grade 9');
  });
  it('puts periods in school order when each says where it falls', () => {
    const g = groupByPeriod([c('First term', 11, '2025-2026', '1'), c('Second term', 10, '2024-2025', '2'), c('First term', 10, '2024-2025', '1'), c('First term', 11, '2025-2026', '1')]);
    expect(g.map((x) => [x.items[0].level, x.items[0].term, x.items.length])).toEqual([[10, '1', 1], [10, '2', 1], [11, '1', 2]]);
  });
  it('keeps the document’s order when a period does not say where it falls', () => {
    const g = groupByPeriod([c('Año 2', null), c('Año 1', null)]);
    expect(g.map((x) => x.label)).toEqual(['Año 2', 'Año 1']);
  });
});
