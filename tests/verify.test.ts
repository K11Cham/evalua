import { describe, expect, it } from 'vitest';
import { runExtraction } from '../src/core/pipeline.ts';
import type { Extraction } from '../src/core/types.ts';
import { caseFlags, courseFlags } from '../src/core/verify.ts';
import { docxHtmlToDoc } from '../src/ingest/docx.ts';
import { kb, rows, termReport } from './helpers.ts';

const base = (): Extraction => runExtraction(docxHtmlToDoc(termReport('Second Term', '11 S1', rows)), kb);
const ids = (ex: Extraction) => courseFlags(ex).map((f) => f.id);

describe('items to verify', () => {
  it('one doubtful grade is its own item; several become one item that lists them', () => {
    const one = base();
    one.courses[0].grade.confidence = 0.5;
    expect(ids(one)).toContain(`grade-lowconf-${one.courses[0].id}`);
    const many = base();
    for (const c of many.courses.slice(0, 4)) c.grade.confidence = 0.5;
    const f = courseFlags(many).filter((x) => x.id.startsWith('grade-lowconf'));
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ id: 'grade-lowconf', title: '4 grades may be misread', courseIds: many.courses.slice(0, 4).map((c) => c.id) });
  });
  it('groups unreadable grades the same way', () => {
    const ex = base();
    for (const c of ex.courses.slice(0, 3)) c.grade.value = '';
    const f = courseFlags(ex).filter((x) => x.id.startsWith('grade-missing'));
    expect(f.map((x) => [x.id, x.severity, x.courseIds?.length])).toEqual([['grade-missing', 'important', 3]]);
  });
  it('raises a specific item when a grade and its words disagree', () => {
    const ex = base();
    ex.courses[0].gradeWords = { text: 'SIETE', value: 7, agrees: false };
    const f = courseFlags(ex).find((x) => x.id === `grade-words-${ex.courses[0].id}`);
    expect(f?.severity).toBe('important');
    expect(f?.detail).toMatch(/“SIETE” \(7\)/);
  });
  it('marks a name that looks misread, and stops once it is edited', () => {
    const ex = base();
    ex.student.name = { value: 'Oluwasen Bolane DEEm', confidence: 0.9 };
    expect(ids(ex)).toContain('name-unsure');
    ex.student.name = { value: 'BENMANSouR Inès', confidence: 0.95 };
    expect(ids(ex)).toContain('name-unsure');
    ex.student.name = { value: 'Oluwaseun Bolanle Adeyemi', confidence: 1, edited: true };
    expect(ids(ex)).not.toContain('name-unsure');
    for (const ok of ['Awa B. Sanneh', 'Ian McDonald', 'DeShawn Ortiz', 'BENMANSOUR Inès', 'Touray M.L Amie', 'يوسف أحمد']) {
      ex.student.name = { value: ok, confidence: 0.95 };
      expect([ok, ids(ex).includes('name-unsure')]).toEqual([ok, false]);
    }
  });
  it('never shows a stored copy of a live check', () => {
    const ex = base();
    ex.flags.push({ id: 'grade-lowconf', severity: 'check', title: 'stale', detail: '' }, { id: 'system-unsure', severity: 'check', title: 'kept', detail: '' });
    const shown = caseFlags(ex, []).map((f) => f.title);
    expect(shown).toContain('kept');
    expect(shown).not.toContain('stale');
  });
});
