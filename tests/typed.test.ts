import { describe, expect, it } from 'vitest';
import { runExtraction } from '../src/core/pipeline.ts';
import { evaluate } from '../src/core/evaluate.ts';
import { groupByPeriod } from '../src/core/periods.ts';
import type { DocTokens } from '../src/core/types.ts';
import { parseTypedTable, typedTableText, typedTextToDoc } from '../src/ingest/typed.ts';
import { kb } from './helpers.ts';

describe('typed or pasted subject and grade pairs', () => {
  it('reads every common way of writing a pair, mixed in one paste', () => {
    const t = parseTypedTable(['Mathematics: 85', 'English Language\t72\t1', '"Biology, Advanced",64', 'Chemistry - B+', 'Física — 7,5', 'History   68', 'Geography 15/20', 'Civic Education A1'].join('\n'));
    expect(t.rows).toEqual([
      ['Mathematics', '85', ''],
      ['English Language', '72', '1'],
      ['Biology, Advanced', '64', ''],
      ['Chemistry', 'B+', ''],
      ['Física', '7,5', ''],
      ['History', '68', ''],
      ['Geography', '15/20', ''],
      ['Civic Education', 'A1', ''],
    ]);
  });
  it('keeps header lines apart from courses, including a course whose name could look like a label', () => {
    const t = parseTypedTable('Student: Fatou Kebbeh\nClass: Grade 10\nSchool year: 2024-2025\nFIRST TERM\nSubject, Mark, Credits\nMathematics: 80\nScience: 77');
    expect(t.fields.map((f) => f.label)).toEqual(['Student', 'Class', 'School year']);
    expect(t.headings).toEqual(['FIRST TERM']);
    expect(t.columns).toEqual(['Subject', 'Mark', 'Credits']);
    expect(t.rows.map((r) => r[0])).toEqual(['Mathematics', 'Science']);
  });
  it('says what to do when nothing looks like a subject and a grade', () => {
    expect(() => typedTextToDoc('Just some notes about the student')).toThrow(/one subject and its grade on each line/);
  });
});

describe('a typed table read like any other document', () => {
  const read = (...texts: string[]) => {
    const parts = texts.map((t) => typedTextToDoc(t));
    const doc: DocTokens = { kind: 'docx', pages: [], tokens: [], engine: 'Typed by hand', warnings: [], parts: [] };
    parts.forEach((p, i) => {
      const off = doc.pages.length;
      doc.parts!.push({ name: `typed-${i}.txt`, firstPage: off });
      doc.pages.push(...p.pages);
      doc.tokens.push(...p.tokens.map((x) => ({ ...x, page: x.page + off })));
    });
    return runExtraction(doc, kb);
  };
  it('finds the courses, grades, grade level, school year and term from the typed header', () => {
    const form = typedTableText(
      [{ label: 'Student', value: 'KEBBEH Fatou' }, { label: 'School', value: 'Bakau Senior Secondary School' }, { label: 'Class', value: 'Grade 10' }, { label: 'Year', value: '2024-2025' }],
      [['Mathematics', '80', ''], ['English Language', '70', ''], ['Biology', '60', ''], ['', '', '']],
      'FIRST TERM',
    );
    const ex = read(form);
    expect(ex.student.name.value).toBe('Kebbeh Fatou');
    expect(ex.courses.map((c) => [c.name.original, c.grade.value, c.level, c.term, c.academicYear])).toEqual([
      ['Mathematics', '80', 10, '1', '2024-2025'],
      ['English Language', '70', 10, '1', '2024-2025'],
      ['Biology', '60', 10, '1', '2024-2025'],
    ]);
    const ev = evaluate(ex, kb, kb.districts.find((d) => d.id === 'ky-jcps')!);
    expect(ev.suggestions.find((s) => s.courseId === ex.courses[0].id)?.conceptId).toMatch(/^math/);
  });
  it('keeps typed terms of different years apart when added to the same case', () => {
    const t1 = typedTableText([{ label: 'Class', value: 'Grade 10' }, { label: 'Year', value: '2024-2025' }], [['Mathematics', '80', ''], ['Biology', '60', '']], 'FIRST TERM');
    const t2 = typedTableText([{ label: 'Class', value: 'Grade 11' }, { label: 'Year', value: '2025-2026' }], [['Mathematics', '75', ''], ['Biology', '66', '']], 'FIRST TERM');
    const groups = groupByPeriod(read(t1, t2).courses);
    expect(groups.map((g) => [g.items[0].level, g.items[0].term, g.items.length])).toEqual([[10, '1', 2], [11, '1', 2]]);
  });
});
