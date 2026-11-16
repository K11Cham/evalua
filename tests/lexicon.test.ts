import { describe, expect, it } from 'vitest';
import { academicYear, detectTerm, genericLevel, gradeFromWords, headerRole, infoField, isGradeLike, isPeriodLabel, isSummaryLabel, labelWithoutColon, splitGrade, termOf } from '../src/core/lexicon.ts';

describe('document vocabulary', () => {
  it('classifies column headers in many languages; the longest phrase wins', () => {
    expect(headerRole('ASIGNATURA')).toBe('name');
    expect(headerRole('科目')).toBe('name');
    expect(headerRole('Наименование учебных предметов')).toBe('name');
    expect(headerRole('Moyenne classe')).toBe('ignore');
    expect(headerRole('Moyenne élève /20')).toBe('grade');
    expect(headerRole('SEM FINAL GRADE')).toBe('final');
    expect(headerRole('TOTAL IN WORDS')).toBe('words');
    expect(headerRole('POSITIONAL GRADE')).toBe('rank');
    expect(headerRole('Cả năm')).toBe('final');
    expect(headerRole('C.H.')).toBe('hours');
    expect(headerRole('단위수')).toBe('credits');
    expect(headerRole('النهاية العظمى')).toBe('max');
    expect(headerRole('प्राप्तांक')).toBe('grade');
    expect(headerRole('ENGLISH LANGUAGE')).toBeNull();
  });
  it('recognises field labels, including ones OCR has damaged', () => {
    expect(infoField('Date of Birth (MM/DD/YYYY)')).toBe('dob');
    expect(infoField('Date ofBirth')).toBe('dob');
    expect(infoField('Nombre del alumno')).toBe('name');
    expect(infoField('اسم الطالب')).toBe('name');
    expect(infoField('学籍号')).toBe('id');
    expect(infoField('Centre')).toBe('school');
    expect(infoField('Sex')).toBe('other');
  });
  it('recognises year and term headings', () => {
    for (const s of ['PRIMER SEMESTRE', 'SS 2 (2022/2023)', '高二上', '1ª Série', '1º Série', '2학년 1학기', 'Lớp 11 — Năm học 2024 - 2025', 'Lóp 11', 'Classe de Terminale', 'Qualifikationsphase 1', 'कक्षा १०']) {
      expect(isPeriodLabel(s), s).toBe(true);
    }
    expect(isPeriodLabel('ENGLISH LANGUAGE')).toBe(false);
    expect(academicYear('Year 11 — 2022/2023')).toBe('2022-2023');
    expect(termOf('GRADE LEVEL: 11 SY: 2024-2025 SEM: 2nd')).toBe('2');
    expect(termOf('高一上')).toBe('1');
    expect(genericLevel('Class XII')).toBe(12);
    expect(genericLevel('कक्षा १०')).toBe(10);
  });
  it('tells grades from other cells and splits grade + description', () => {
    for (const g of ['B3', '13,5', '087', 'A*', 'sehr gut', 'Đ', '5 (отлично)', 'A(287)']) expect(isGradeLike(g), g).toBe(true);
    for (const g of ['ENGLISH LANGUAGE', 'Élève sérieuse, bon travail.']) expect(isGradeLike(g), g).toBe(false);
    expect(splitGrade('5 (отлично)')).toEqual({ grade: '5', rest: 'отлично' });
    expect(splitGrade('A(287)').grade).toBe('A');
    expect(isSummaryLabel('AGGREGATE SCORE')).toBe(true);
  });
});

describe('year and term words', () => {
  it('finds a term, semester, trimester or quarter in every supported language', () => {
    const cases: [string, number, string][] = [
      ['Second Term', 2, 'term'], ['Term 3', 3, 'term'], ['3rd Quarter', 3, 'quarter'], ['Semester 1', 1, 'semester'],
      ['PRIMER SEMESTRE', 1, 'semester'], ['TERCER SEMESTRE', 1, 'semester'], ['2e trimestre', 2, 'trimester'], ['1er trimestre', 1, 'trimester'],
      ['1º bimestre', 1, 'quarter'], ['2. Halbjahr', 2, 'semester'], ['erstes Halbjahr', 1, 'semester'], ['GRADE LEVEL: 11 SY: 2024-2025 SEM: 2nd', 2, 'semester'],
      ['Học kỳ II', 2, 'semester'], ['HK1', 1, 'semester'], ['1학년 2학기', 2, 'semester'], ['第二学期', 2, 'semester'], ['高一下', 2, 'semester'],
      ['2 четверть', 2, 'quarter'], ['II полугодие', 2, 'semester'], ['الفصل الدراسي الثاني', 2, 'semester'],
    ];
    for (const [text, index, unit] of cases) expect([text, detectTerm(text)?.index, detectTerm(text)?.unit]).toEqual([text, index, unit]);
    for (const text of ['Termly Remark', 'Long-term plan', 'SS 2 (2022/2023)', 'Senior High School', 'Bon trimestre.']) expect(detectTerm(text)).toBeNull();
  });
  it('does not read school-type names as US class standing', () => {
    expect(genericLevel('ASANTEMAN VALLEY SENIOR HIGH SCHOOL')).toBeNull();
    expect(genericLevel('Nusrat Senior Secondary School')).toBeNull();
    expect(genericLevel('Junior High School')).toBeNull();
    expect(genericLevel('Senior year')).toBe(12);
    expect(genericLevel('Class: Junior')).toBe(11);
  });
});

describe('grades written in words and labels without a colon', () => {
  it('reads a grade written out in words, in several languages and with OCR case slips', () => {
    const cases: [string, number | null][] = [['OCHO', 8], ['ocHo', 8], ['NUEvE', 9], ['DIEZ', 10], ['отлично', 5], ['хорошо', 4], ['удовлетворительно', 3], ['huit', 8], ['ZERO EIGHT SEVEN', 87], ['SEVEN', 7], ['Excellent', null], ['SIETE PUNTO CINCO', null], ['', null]];
    for (const [t, v] of cases) expect([t, gradeFromWords(t)]).toEqual([t, v]);
  });
  it('finds a known label at the start of a line whose colon was lost', () => {
    expect(labelWithoutColon('اسم الطالب يوسف أحمد')?.label).toBe('اسم الطالب');
    expect(labelWithoutColon('Date of Birth 14-Nov-2006')).toEqual({ label: 'Date of Birth', value: '14-Nov-2006' });
    expect(labelWithoutColon('STUDENT ACADEMIC TRANSCRIPT')).toBeNull();
    expect(labelWithoutColon('MATHEMATICS 71')).toBeNull();
  });
});
