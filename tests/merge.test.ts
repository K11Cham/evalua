import { describe, expect, it } from 'vitest';
import { carryOver } from '../src/core/merge.ts';
import { runExtraction } from '../src/core/pipeline.ts';
import { docxHtmlToDoc } from '../src/ingest/docx.ts';
import { evaluate } from '../src/core/evaluate.ts';
import { kb, rows, termReport } from './helpers.ts';

describe('adding documents to a case', () => {
  const jcps = kb.districts.find((d) => d.id === 'ky-jcps')!;
  it('adds documents to a case and keeps the counselor’s work', () => {
    const page = (t: string) => docxHtmlToDoc(termReport(t, '11 S1', rows));
    const first = page('Second Term');
    const before = runExtraction(first, kb);
    // The counselor's work on the case so far.
    const edited = structuredClone(before);
    edited.student.name = { value: 'Awa B. Sanneh', original: 'SANNEH, Awa Binta', confidence: 1, edited: true };
    const physics = edited.courses.find((c) => c.name.original === 'PHYSICS')!;
    physics.grade = { ...physics.grade, value: '92', edited: true };
    const chem = edited.courses.find((c) => c.name.original === 'FURTHER MATHEMATICS')!;
    edited.courses.push({ id: 'm-hand01', name: { value: 'Arabic', original: 'Arabic', confidence: 1, edited: true }, translation: 'same', grade: { value: '85', confidence: 1, edited: true }, period: { value: 'Second term', confidence: 1 }, level: 11 });
    const overrides = { [chem.id]: { credits: 0.5, accepted: true }, 'm-hand01': { conceptId: 'wl.other' } };
    const resolved = ['system-unsure', `grade-lowconf-${physics.id}`];

    // A third-term report is added: its pages go after the earlier ones.
    const added = page('Third Term');
    const doc = { ...first, pages: [...first.pages, ...added.pages], tokens: [...first.tokens, ...added.tokens.map((t) => ({ ...t, page: t.page + first.pages.length }))] };
    const after = runExtraction(doc, kb);
    // A grade level the counselor set stays; one an earlier reader got wrong is read again.
    edited.courses.find((c) => c.name.original === 'MATHEMATICS')!.level = 12;
    Object.assign(edited.courses.find((c) => c.name.original === 'ENGLISH LANGUAGE')!, { level: 9, levelByHand: true });
    const r = carryOver(edited, after, overrides, resolved);
    expect(r.extraction.courses.find((c) => c.name.original === 'MATHEMATICS' && c.term === '2')!.level).toBe(11);
    expect(r.extraction.courses.find((c) => c.name.original === 'ENGLISH LANGUAGE' && c.term === '2')!.level).toBe(9);

    expect(r.kept).toBe(rows.length);
    expect(r.added).toBe(rows.length);
    expect(r.lost).toEqual([]);
    expect(r.extraction.student.name.value).toBe('Awa B. Sanneh');
    const physicsAfter = r.extraction.courses.filter((c) => c.name.original === 'PHYSICS');
    // The corrected grade stays on the second-term row; the new third-term row is as read (letter A, mark 91%).
    expect(physicsAfter.map((c) => [c.term, c.grade.value, c.score?.value])).toEqual([['2', '92', '91'], ['3', 'A', '91']]);
    // Decisions follow their rows; the hand-added course stays.
    const chemAfter = r.extraction.courses.find((c) => c.name.original === 'FURTHER MATHEMATICS' && c.term === '2')!;
    expect(r.overrides[chemAfter.id]).toEqual({ credits: 0.5, accepted: true });
    expect(r.extraction.courses.some((c) => c.id === 'm-hand01')).toBe(true);
    expect(r.overrides['m-hand01']).toEqual({ conceptId: 'wl.other' });
    const physicsId = physicsAfter.find((c) => c.term === '2')!.id;
    expect(r.resolved).toEqual(['system-unsure', `grade-lowconf-${physicsId}`]);
    // With the third term added, Mathematics has two of three terms: one semester of credit.
    const ev = evaluate(r.extraction, kb, jcps, r.overrides);
    expect(ev.suggestions.filter((s) => s.conceptId === 'math.general').reduce((a, s) => a + s.credits, 0)).toBe(0.5);
  });
});

describe('reading a case again', () => {
  const read = (r: typeof rows) => runExtraction(docxHtmlToDoc(termReport('Second Term', '11 S1', r)), kb);
  it('reports rows that are no longer found and keeps everything else', () => {
    const before = read(rows);
    const after = read(rows.filter(([s]) => s !== 'PHYSICS'));
    const r = carryOver(before, after, {}, []);
    expect(r.lost).toEqual(['PHYSICS']);
    expect(r.kept).toBe(rows.length - 1);
    expect(r.added).toBe(0);
  });
  it('moves decisions and checked items to the same rows after a re-read, and keeps grouped items', () => {
    const before = read(rows);
    const maths = before.courses.find((c) => c.name.original === 'MATHEMATICS')!;
    const after = read([['ECONOMICS', 70, 'B'], ...rows]);
    const r = carryOver(before, after, { [maths.id]: { credits: 1 } }, [`dup-${maths.id}`, 'grade-lowconf', 'system-unsure']);
    const mathsAfter = r.extraction.courses.find((c) => c.name.original === 'MATHEMATICS')!;
    expect(mathsAfter.id).not.toBe(maths.id);
    expect(r.overrides[mathsAfter.id]).toEqual({ credits: 1 });
    expect(r.resolved).toEqual([`dup-${mathsAfter.id}`, 'grade-lowconf', 'system-unsure']);
    expect(r.added).toBe(1);
  });
});
