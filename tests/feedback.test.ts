import { describe, expect, it } from 'vitest';
import { buildFeedback, feedbackText } from '../src/export/feedback.ts';
import type { CaseRecord } from '../src/store/db.ts';
import { combine, kb, rows, termReport } from './helpers.ts';

const jcps = kb.districts.find((d) => d.id === 'ky-jcps')!;

// A fictitious case with every kind of correction, and personal data in every place it can be.
function editedCase(): CaseRecord {
  const ex = combine(termReport('SECOND TERM', 'GRADE 11', rows));
  const fix = <T extends { value: string; confidence: number; edited?: boolean; read?: { value: string; confidence: number } }>(f: T, v: string) => {
    f.read = { value: f.value, confidence: f.confidence };
    f.value = v;
    f.edited = true;
    f.confidence = 1;
  };
  fix(ex.student.name, 'SANNEH Awa Binta Corrected');
  fix(ex.student.dob, '2008-03-14');
  fix(ex.student.id, 'KR117-XYZ');
  fix(ex.school.name, 'Kotu Ridge Senior Secondary School (corrected)');
  fix(ex.courses[1].grade, '67');
  fix(ex.courses[2].name, 'Physics (corrected)');
  ex.courses.push({ id: 'm-abc12345', name: { value: 'Civic Education', original: 'Civic Education', confidence: 1, edited: true }, translation: 'same', grade: { value: '72', confidence: 1, edited: true }, period: ex.courses[0].period, level: 11 });
  return {
    id: 'case-1', number: 7, createdAt: '2026-11-18T10:00:00Z', updatedAt: '2026-11-18T10:00:00Z', status: 'reviewed',
    fileName: 'SANNEH_Awa_report_card.pdf', fileType: 'application/pdf', engine: 'PDF text layer', districtId: jcps.id,
    extraction: ex,
    overrides: { [ex.courses[0].id]: { conceptId: 'math.geometry', credits: 0.5 }, [ex.courses[3].id]: { accepted: true }, [ex.courses[4].id]: { exclude: true } },
    resolved: [],
    notes: [{ id: 'n1', at: '2026-11-18T10:00:00Z', by: 'J. Rivera', text: 'Mother Mariama Sanneh phoned; address 14 Kairaba Avenue, Serrekunda' }],
    log: [{ at: '2026-11-18T10:00:00Z', by: 'J. Rivera', action: 'Changed student name', detail: '“Sanneh Awa Binta” → “SANNEH Awa Binta Corrected”' }],
  } as unknown as CaseRecord;
}

describe('export corrections for feedback', () => {
  it('lists what was corrected beside what evalua read, with the reading context', () => {
    const f = buildFeedback(editedCase(), kb, jcps, [{ name: 'SANNEH_Awa_report_card.pdf', type: 'application/pdf' }], new Date('2026-11-18T12:00:00Z'));
    expect(f).toMatchObject({ format: 'evalua-feedback/1', exported: '2026-11-18', educationSystem: 'waec', fileTypes: ['pdf'], district: 'ky-jcps', acceptedUnchanged: 1 });
    const fields = f.corrections.map((r) => r.field);
    expect(fields).toEqual(expect.arrayContaining(['student name', 'date of birth', 'student ID', 'school name', 'grade', 'course name', 'course added by hand (missed by the reader)', 'US subject', 'credits', 'course left out']));
    const grade = f.corrections.find((r) => r.field === 'grade')!;
    expect(grade).toMatchObject({ printedSubject: 'ENGLISH LANGUAGE', evaluaValue: 'B', correctedValue: '67' });
    expect(grade.confidence).toBeGreaterThan(0.5);
    // A corrected student field says only that it was corrected.
    const name = f.corrections.find((r) => r.field === 'student name')!;
    expect(name.evaluaValue).toMatch(/excluded/);
    expect(name.correctedValue).toMatch(/excluded/);
  });
  it('never contains the student’s name, ID, date of birth, school, file name, notes, addresses or signatures', () => {
    const rec = editedCase();
    const text = feedbackText(buildFeedback(rec, kb, jcps, [{ name: rec.fileName, type: rec.fileType }]));
    const ex = rec.extraction!;
    const forbidden = [
      'SANNEH', 'Sanneh', 'Awa', 'Binta', 'KR117', '2008-03-14', 'Kotu Ridge', 'KOTU RIDGE', 'report_card', 'Mariama', 'Kairaba', 'Serrekunda', 'J. Rivera', 'Rivera',
      ex.student.name.read!.value, ex.student.id.read!.value, ex.school.name.read!.value,
    ].filter(Boolean);
    for (const s of forbidden) expect(text, `the export contains “${s}”`).not.toContain(s);
    // Nothing that looks like an image, a page or a signature.
    expect(text).not.toMatch(/data:image|base64|signature|tokens|previews|"notes"|"log"/i);
  });
});
