import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/core/evaluate.ts';
import { bandFromRemark } from '../src/core/extract.ts';
import { gradeFromWords, splitGrade } from '../src/core/lexicon.ts';
import { caseFlags } from '../src/core/verify.ts';
import { combine, kb, sys } from './helpers.ts';

describe('grades printed as "1(One)" and misread by OCR', () => {
  it('recovers the digit when the opening bracket was read as a letter or a zero', () => {
    expect(splitGrade('1(One)')).toMatchObject({ grade: '1', rest: 'One' });
    expect(splitGrade('10One)')).toMatchObject({ grade: '1', repaired: true });
    expect(splitGrade('1jOma)')).toMatchObject({ grade: '1', repaired: true });
    expect(splitGrade('2[Two)')).toMatchObject({ grade: '2', repaired: true });
    expect(splitGrade('1(Om]')).toMatchObject({ grade: '1' });
    // A real two-digit grade with its words keeps both digits.
    expect(splitGrade('10 (Diez)')).toMatchObject({ grade: '10', rest: 'Diez' });
    expect(splitGrade('10')).toMatchObject({ grade: '10' });
  });
  it('reads short number words with one OCR slip, only when one number fits', () => {
    expect(gradeFromWords('0ne')).toBe(1);
    expect(gradeFromWords('Twm')).toBe(2);
    expect(gradeFromWords('doz')).toBeNull(); // "dos" (2) or "dez" (10)
  });
});

describe('remarks that name a grade band', () => {
  const gabece = sys('gabece');
  it('maps a remark to the one grade it names on the system scale, even when misread', () => {
    expect(bandFromRemark('Excellent', gabece)).toEqual({ value: '1', values: ['1'] });
    expect(bandFromRemark('EMcellem', gabece)?.value).toBe('1');
    expect(bandFromRemark('Very Good', gabece)?.value).toBe('2');
    // "Credit" covers grades 4 to 6: it confirms them but cannot fill one in.
    expect(bandFromRemark('Credit', gabece)).toEqual({ value: '', values: ['4', '5', '6'] });
    expect(bandFromRemark('Keep it up', gabece)).toBeNull();
  });
});

// A fictitious WAEC result-checker printout of a GABECE result.
const slip = (grades: [string, string, string][], aggregate: string) =>
  `<p>The West African Examinations Council</p><p>Result Checking</p><p>Gambia Basic Education Certificate Examination (GABECE)</p>` +
  `<p>Candidate's Details</p><table><tr><td>Candidate Number</td><td>72000001</td></tr><tr><td>Candidate Name</td><td>JALLOW Isatou</td></tr><tr><td>School</td><td>KOTU UPPER BASIC SCHOOL</td></tr></table>` +
  `<p>Results</p><table><tr><th>Subject</th><th>Grade</th><th>Interpretation</th></tr>` +
  grades.map(([s, g, i]) => `<tr><td>${s}</td><td>${g}</td><td>${i}</td></tr>`).join('') +
  `</table><p>Aggregate ${aggregate}</p>`;
const rows: [string, string, string][] = [
  ['ENGLISH LANGUAGE', '2(Two)', 'Very Good'], ['MATHEMATICS', '1(One)', 'Excellent'], ['SCIENCE', '3(Three)', 'Good'], ['SOCIAL AND ENV. STUDIES', '2(Two)', 'Very Good'],
  ['ISLAMIC REL. STUDIES', '1(One)', 'Excellent'], ['AGRICULTURAL SCIENCE', '4(Four)', 'Credit'], ['PHYSICAL & HEALTH EDUC.', '2(Two)', 'Very Good'], ['ART AND CRAFT', '3(Three)', 'Good'], ['FRENCH', '5(Five)', 'Credit'],
];
const jcps = kb.districts.find((d) => d.id === 'ky-jcps')!;

describe('a GABECE result', () => {
  it('reads the slip, checks the aggregate, and shares credit out to one normal year', () => {
    const ex = combine(slip(rows, '11'));
    expect(ex.systemId.value).toBe('gabece');
    expect(ex.student.name.value).toBe('Jallow Isatou');
    expect(ex.school.name.value).toBe('KOTU UPPER BASIC SCHOOL');
    expect(ex.courses.map((c) => c.grade.value)).toEqual(['2', '1', '3', '2', '1', '4', '2', '3', '5']);
    expect(ex.aggregate?.value).toBe(11);
    const ev = evaluate(ex, kb, jcps);
    // Core 2 + 1 + 3 + 2, best two others 1 + 2.
    const agg = ev.flags.find((f) => f.id === 'aggregate')!;
    expect(agg.severity).toBe('info');
    expect(agg.title).toMatch(/Aggregate 11, matches the grades/);
    const total = ev.suggestions.reduce((a, s) => a + s.credits, 0);
    expect(total).toBeLessThanOrEqual(jcps.typicalCreditsPerYear + 0.5);
    expect(ev.flags.some((f) => f.id.startsWith('load-'))).toBe(false);
    expect(ev.suggestions[0].reasons.some((r) => /shared out/.test(r.text))).toBe(true);
    // Abbreviated subject names on WAEC printouts map to their subjects.
    const concept = (n: string) => ev.suggestions.find((s) => s.courseId === ex.courses.find((c) => c.name.original === n)!.id)!.conceptId;
    expect(concept('SOCIAL AND ENV. STUDIES')).toBe('ss.social');
    expect(concept('ISLAMIC REL. STUDIES')).toBe('ss.religion');
  });
  it('says so when the printed aggregate does not match the grades', () => {
    const ex = combine(slip(rows, '9'));
    const f = evaluate(ex, kb, jcps).flags.find((x) => x.id === 'aggregate')!;
    expect(f.severity).toBe('check');
    expect(f.title).toMatch(/\(9\) does not match the grades \(11\)/);
  });
  it('flags a full name read as one run-together word', () => {
    const ex = combine(slip(rows, '11').replace('JALLOW Isatou', 'JALLOWISATOU'));
    expect(caseFlags(ex, evaluate(ex, kb, jcps).flags).some((f) => f.id === 'name-unsure')).toBe(true);
  });
});
