import { describe, expect, it } from 'vitest';
import type { Suggestion, VerifyFlag } from '../src/core/types.ts';
import { rowDoubts } from '../src/ui/doubts.ts';
import { flagKind, groupFlags } from '../src/ui/flagGroups.ts';
import { course } from './helpers.ts';

const flag = (id: string, severity: VerifyFlag['severity'], title: string): VerifyFlag => ({ id, severity, title, detail: '' });

describe('items to verify', () => {
  it('gathers flags of one kind into one item and puts the most serious first', () => {
    const g = groupFlags([
      flag('dob', 'info', 'Date of birth not found'),
      flag('dup-1', 'check', 'Listed twice: CIVIC EDUCATION'),
      flag('dup-2', 'check', 'Listed twice: CHEMISTRY'),
      flag('words-1', 'important', 'The grade and its words disagree: Física I'),
      flag('dup-3', 'check', 'Listed twice: PHYSICS'),
    ]);
    expect(g.map((x) => [x.severity, x.title, x.flags.length])).toEqual([
      ['important', 'The grade and its words disagree: Física I', 1],
      ['check', 'Listed twice', 3],
      ['info', 'Date of birth not found', 1],
    ]);
    // A lone flag keeps its own id, so "Mark checked" stays tied to it.
    expect(g[0].key).toBe('words-1');
  });
  it('does not merge the same words at different severities', () => {
    expect(groupFlags([flag('a', 'check', 'X: 1'), flag('b', 'important', 'X: 2')])).toHaveLength(2);
  });
  it('splits a title into its kind and the item it is about', () => {
    expect(flagKind(flag('a', 'check', 'Listed twice: Ética I'))).toEqual({ kind: 'Listed twice', item: 'Ética I' });
    expect(flagKind(flag('a', 'info', 'Date of birth not found'))).toEqual({ kind: 'Date of birth not found', item: '' });
  });
});

describe('why a row is uncertain', () => {
  const sug = (extra: Partial<Suggestion> = {}): Suggestion => ({
    courseId: 'c1', conceptId: 'math.algebra1', conceptLabel: 'Algebra I', requirementId: 'math', requirementLabel: 'Mathematics', catalogTitle: null,
    share: 1, credits: 1, grade: { letter: 'A', table: 't', reasons: [] } as unknown as Suggestion['grade'], confidence: 0.95, reasons: [], needsReview: false, ...extra,
  });
  it('says nothing about a row that was read cleanly', () => {
    expect(rowDoubts(course('9'), sug())).toEqual([]);
  });
  it('names each reason in words, the serious ones as low', () => {
    expect(rowDoubts(course(''), sug({ grade: { letter: null } as unknown as Suggestion['grade'] }))).toEqual([{ text: 'Grade not readable', level: 'low', field: 'grade' }]);
    expect(rowDoubts(course('8', { gradeWords: { text: 'NUEVE', value: 9, agrees: false } }), sug())[0]).toEqual({ text: 'Grade and its words disagree', level: 'low', field: 'grade' });
    expect(rowDoubts(course('8', { translation: 'model' }), sug({ conceptId: 'elective.other' })).map((d) => d.text)).toEqual(['English name from the model', 'Subject not recognised']);
  });
  it('drops a doubt once the counselor has fixed that field', () => {
    expect(rowDoubts(course('', { grade: { value: '', confidence: 1, edited: true } }), sug())).toEqual([]);
    expect(rowDoubts(course('8'), sug({ conceptId: 'elective.other' }), true)).toEqual([]);
  });
});
