// Unit tests for parsing, conversion and matching. Expected values are written by hand from the cited tables.
import { describe, expect, it } from 'vitest';
import { parseCatalog } from '../src/core/catalog.ts';
import { chooseScale, convertGrade } from '../src/core/convert.ts';
import { evaluate } from '../src/core/evaluate.ts';
import { roundToStep } from '../src/core/coverage.ts';
import { detectSystem } from '../src/core/extract.ts';
import { academicYear, genericLevel, headerRole, infoField, isGradeLike, isPeriodLabel, isSummaryLabel, splitGrade, termOf } from '../src/core/lexicon.ts';
import { buildMatcher, fixOcrNumerals } from '../src/core/match.ts';
import { runExtraction } from '../src/core/pipeline.ts';
import { asciiDigits, displayName, key, parseDate, parseNumber, sameName, similarity } from '../src/core/text.ts';
import type { ExtractedCourse, USLetter } from '../src/core/types.ts';
import { docxHtmlToDoc } from '../src/ingest/docx.ts';
import { estimateSkew } from '../src/ingest/deskew.ts';
import { routeOcr, type OcrSegment } from '../src/ingest/ocrModels.ts';
import { fixRtl } from '../src/ingest/ocrTokens.ts';
import { repairArabic } from '../src/ingest/pdfText.ts';
import { seedKb } from '../src/kb/index.ts';

const kb = seedKb();
const sys = (id: string) => kb.systems.find((s) => s.id === id)!;
const generic = sys('generic');
const course = (grade: string, extra: Partial<ExtractedCourse> = {}): ExtractedCourse => ({
  id: 'c1', name: { value: 'X', original: 'X', confidence: 1 }, translation: 'same', grade: { value: grade, original: grade, confidence: 1 },
  period: { value: '', confidence: 1 }, level: 10, ...extra,
});
const letter = (system: string, grade: string, ctx: { grades?: string[]; hint?: string } = {}, extra: Partial<ExtractedCourse> = {}): USLetter | null =>
  convertGrade(course(grade, extra), sys(system), generic, { grades: ctx.grades ?? [grade], hintText: ctx.hint ?? '' }).letter;

describe('text', () => {
  it('normalises digits from other scripts', () => {
    expect(asciiDigits('٣١٨٦٤٢')).toBe('318642');
    expect(asciiDigits('१०वीं')).toBe('10वीं');
    expect(asciiDigits('数学Ⅱ ９')).toBe('数学II 9');
  });
  it('builds matching keys that ignore case, accents and punctuation', () => {
    expect(key('Matemáticas  III.')).toBe('matematicas iii');
    expect(key('Địa lí')).toBe('dia li');
    expect(key('الأحياء')).toBe(key('الاحياء'));
    expect(similarity('Quimical', 'Química I')).toBeGreaterThan(0.8);
  });
  it('parses numbers with decimal commas and leading zeros', () => {
    expect(parseNumber('13,5')).toBe(13.5);
    expect(parseNumber('087')).toBe(87);
    expect(parseNumber('B3')).toBeNull();
  });
  it('parses dates in the formats the seeded systems print', () => {
    expect(parseDate('17/08/2007')?.iso).toBe('2007-08-17');
    expect(parseDate('04/26/2008', 'mdy')?.iso).toBe('2008-04-26');
    expect(parseDate('21 de septiembre de 2007')?.iso).toBe('2007-09-21');
    expect(parseDate('3rd February, 2006')?.iso).toBe('2006-02-03');
    expect(parseDate('2007年3月14日')?.iso).toBe('2007-03-14');
    expect(parseDate('2008년 7월 3일')?.iso).toBe('2008-07-03');
    expect(parseDate('11 tháng 01 năm 2008')?.iso).toBe('2008-01-11');
    expect(parseDate('6 июня 2007 года')?.iso).toBe('2007-06-06');
    expect(parseDate('19.10.2007')?.iso).toBe('2007-10-19');
    expect(parseDate('14-Nov-2006')?.iso).toBe('2006-11-14');
    expect(parseDate('٢٠٠٧/٠٤/٢٥')?.iso).toBe('2007-04-25');
    expect(parseDate('2 février 2008')?.iso).toBe('2008-02-02');
  });
  it('flags day/month ambiguity only when it exists', () => {
    expect(parseDate('05/12/2007')?.ambiguous).toBe(true);
    expect(parseDate('25/12/2007')?.ambiguous).toBe(false);
  });
  it('tidies names without changing their order unless there is a comma', () => {
    expect(displayName('JALLOW, Fatoumatta Binta')).toBe('Fatoumatta Binta Jallow');
    expect(displayName('Akosua Serwaa MENSAH')).toBe('Akosua Serwaa Mensah');
    expect(displayName('HERNÁNDEZ ZAVALA DIEGO')).toBe('Hernández Zavala Diego');
    expect(sameName('Hernández Zavala Diego Alejandro', 'Diego Alejandro Hernández Zavala')).toBe(true);
  });
});

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

describe('subject matching', () => {
  const m = (system: string | undefined, name: string, english = false) => buildMatcher(kb, system ? sys(system) : undefined, english)(name);
  it('uses the system profile first', () => {
    expect(m('mx-sep', 'Matemáticas III').conceptId).toBe('math.algebra2');
    expect(m('mx-sep', 'Matemáticas III').en).toBe('Mathematics III (Analytic Geometry)');
    expect(m('kr', '수학Ⅰ').conceptId).toBe('math.algebra2');
    expect(m('fr', 'Spécialité Mathématiques').conceptId).toBe('math.advanced');
  });
  it('falls back to the multilingual subject dictionary', () => {
    expect(m(undefined, 'गणित').conceptId).toBe('math.general');
    expect(m(undefined, 'Физика').conceptId).toBe('sci.physics');
    expect(m(undefined, 'اللغة الأجنبية الأولى (الإنجليزية)').conceptId).toBe('ela.efl');
    expect(m('waec', 'FURTHER MATHEMATICS', true).conceptId).toBe('math.advanced');
    expect(m('ib', 'EXTENDED ESSAY (History)', true).conceptId).toBe('elective.other');
  });
  it('tolerates OCR damage and keeps course numbers', () => {
    expect(fixOcrNumerals('Matemáticas1')).toBe('Matemáticas I');
    expect(fixOcrNumerals('Química ll')).toBe('Química II');
    expect(m('mx-sep', 'Quimica ll').conceptId).toBe('sci.chemistry');
    expect(m('vn', 'Toan').conceptId).toBe('math.general');
    expect(m('ph-k12', 'General Biology 2', true).conceptId).toBe('sci.biology');
  });
  it('separates home-language courses, English as a foreign language and other languages', () => {
    expect(m('mx-sep', 'Taller de Lectura y Redacción II').conceptId).toBe('wl.native');
    expect(m('mx-sep', 'Inglés IV').conceptId).toBe('ela.efl');
    expect(m('waec', 'Yoruba Language', true).conceptId).toBe('wl.native');
    expect(m('gabece', 'ARABIC', true).conceptId).toBe('wl.other');
  });
  it('says so when it does not know', () => {
    const r = m(undefined, 'Zzyzx Qwertology');
    expect(r.conceptId).toBe('elective.other');
    expect(r.confidence).toBeLessThan(0.5);
    expect(r.translation).toBe('none');
  });
});

describe('system detection', () => {
  it('identifies documents by their own wording', () => {
    expect(detectSystem('THE WEST AFRICAN EXAMINATIONS COUNCIL WASSCE statement of result', kb.systems).profile?.id).toBe('waec');
    expect(detectSystem('GAMBIA BASIC EDUCATION CERTIFICATE EXAMINATION (GABECE)', kb.systems).profile?.id).toBe('gabece');
    expect(detectSystem('JOINT ADMISSIONS AND MATRICULATION BOARD UTME 2025', kb.systems).profile?.id).toBe('jamb');
    expect(detectSystem('普通高中学生成绩单 学籍号', kb.systems).profile?.id).toBe('cn');
    expect(detectSystem('HISTÓRICO ESCOLAR — ENSINO MÉDIO carga horária', kb.systems).profile?.id).toBe('br');
    expect(detectSystem('a shopping list', kb.systems).profile).toBeUndefined();
  });
});

describe('whole pipeline on a Word-style document', () => {
  const html = `
    <p>SECRETARÍA DE EDUCACIÓN PÚBLICA</p><p>CERTIFICADO DE TERMINACIÓN DE ESTUDIOS — BACHILLERATO GENERAL</p>
    <p>Nombre del alumno: <strong>LÓPEZ MARTÍNEZ ANA SOFÍA</strong></p><p>Fecha de nacimiento: 5 de mayo de 2008</p><p>CURP: LOMA080505MDFPRN07</p><p>Plantel: Preparatoria Ejemplo</p>
    <p>PRIMER SEMESTRE</p>
    <table><tr><th>ASIGNATURA</th><th>CALIF.</th><th>CRÉDITOS</th></tr>
      <tr><td>Matemáticas I</td><td>9</td><td>10</td></tr><tr><td>Química I</td><td>7</td><td>10</td></tr><tr><td>Inglés I</td><td>5</td><td>6</td></tr></table>
    <p>TERCER SEMESTRE</p>
    <table><tr><th>ASIGNATURA</th><th>CALIF.</th><th>CRÉDITOS</th></tr>
      <tr><td>Biología I</td><td>8</td><td>8</td></tr><tr><td>Historia de México I</td><td>10</td><td>6</td></tr></table>`;
  const ex = runExtraction(docxHtmlToDoc(html), kb);
  const district = kb.districts.find((d) => d.id === 'tx-foundation')!;
  const ev = evaluate(ex, kb, district);

  it('reads the student, the system and every course', () => {
    expect(ex.systemId.value).toBe('mx-sep');
    expect(ex.student.name.value).toBe('López Martínez Ana Sofía');
    expect(ex.student.dob.value).toBe('2008-05-05');
    expect(ex.student.id.value).toBe('LOMA080505MDFPRN07');
    expect(ex.school.name.value).toBe('Preparatoria Ejemplo');
    expect(ex.courses.map((c) => c.name.original)).toEqual(['Matemáticas I', 'Química I', 'Inglés I', 'Biología I', 'Historia de México I']);
    expect(ex.courses.map((c) => c.grade.value)).toEqual(['9', '7', '5', '8', '10']);
    expect(ex.courses.map((c) => c.level)).toEqual([10, 10, 10, 11, 11]);
    expect(ex.courses[0].credits?.value).toBe(10);
    expect(ex.courses[0].name.source?.page).toBe(0);
  });
  it('flags the missing year without calling anything fake', () => {
    expect(ex.flags.some((f) => /fake|forg|fraud/i.test(f.title + f.detail))).toBe(false);
  });
  it('suggests credit with reasons, sources and confidence', () => {
    const math = ev.suggestions[0];
    expect(math.conceptId).toBe('math.algebra1');
    expect(math.requirementId).toBe('math');
    expect(math.grade.letter).toBe('A');
    expect(math.credits).toBe(0.5); // 10 créditos × 8 h = 80 h ÷ 120 = 0.67 of a course → rounded down to the 0.5 step
    expect(math.usCourse?.title).toBe('Algebra I');
    expect(math.reasons.length).toBeGreaterThanOrEqual(4);
    expect(math.reasons.some((r) => r.source?.url)).toBe(true);
    expect(math.confidence).toBeGreaterThan(0.8);
  });
  it('gives no credit for a failing grade and treats policy questions as needing review', () => {
    const english = ev.suggestions[2];
    expect(english.grade.letter).toBe('F');
    expect(english.credits).toBe(0);
    expect(english.needsReview).toBe(true);
  });
  it('tracks graduation requirements and respects counselor overrides', () => {
    const math = ev.progress.find((p) => p.requirementId === 'math')!;
    expect(math.earned).toBe(0.5);
    expect(math.remaining).toBe(2.5);
    const changed = evaluate(ex, kb, district, { [ex.courses[0].id]: { credits: 1, letter: 'B', accepted: true } });
    expect(changed.suggestions[0].credits).toBe(1);
    expect(changed.suggestions[0].grade.letter).toBe('B');
    expect(changed.suggestions[0].needsReview).toBe(false);
    expect(evaluate(ex, kb, district, { [ex.courses[0].id]: { exclude: true } }).suggestions).toHaveLength(4);
  });
  it('never suggests credit for an entrance test', () => {
    const jamb = runExtraction(docxHtmlToDoc('<p>JOINT ADMISSIONS AND MATRICULATION BOARD — UTME 2025 RESULT SLIP</p><table><tr><th>SUBJECT</th><th>SCORE</th></tr><tr><td>USE OF ENGLISH</td><td>64</td></tr><tr><td>MATHEMATICS</td><td>71</td></tr><tr><td>PHYSICS</td><td>58</td></tr></table>'), kb);
    const e = evaluate(jamb, kb, district);
    expect(jamb.systemId.value).toBe('jamb');
    expect(e.totalEarned).toBe(0);
    expect(e.suggestions.every((s) => s.grade.letter === 'NC')).toBe(true);
  });
});

describe('credit follows what was covered', () => {
  // A fictitious West African term report: row numbers, a percentage column and the school's own letters.
  const termReport = (term: string, cls: string, rows: [string, number, string][]) =>
    `<p>KOTU RIDGE SENIOR SECONDARY SCHOOL</p><p>Banjul, The Gambia</p><p>${term}</p>` +
    `<p>STUDENT: SANNEH, Awa Binta</p><p>NUMBER: KR117</p><p>CLASS: ${cls}</p><p>YEAR: 2025/2026 Academic Year</p>` +
    `<table><tr><th>#</th><th>Subject</th><th>Mark(%)</th><th>Grade</th><th>Remark</th></tr>` +
    rows.map(([s, m, g], i) => `<tr><td>${i + 1}</td><td>${i + 1}${s}</td><td>${m}</td><td>${g}</td><td>Excellent</td></tr>`).join('') +
    `</table><p>Overall Termly Grade: A</p>`;
  const rows: [string, number, string][] = [['MATHEMATICS', 100, 'A'], ['ENGLISH LANGUAGE', 66, 'B'], ['PHYSICS', 91, 'A'], ['FURTHER MATHEMATICS', 94, 'A'], ['PHYSICAL EDUCATION', 40, 'E'], ['INFORMATION & COMMUNICATION TECHNOLOGY', 81, 'A']];
  const ex = runExtraction(docxHtmlToDoc(termReport('Second Term', '11 S1', rows)), kb);
  const jcps = kb.districts.find((d) => d.id === 'ky-jcps')!;

  it('reads a numbered term report: names without row numbers, the term and the class', () => {
    expect(ex.systemId.value).toBe('waec');
    expect(ex.courses.map((c) => c.name.original)).toEqual(rows.map((r) => r[0]));
    expect(ex.courses.every((c) => c.term === '2' && c.level === 11)).toBe(true);
    expect(ex.student.id.value).toBe('KR117');
    expect(ex.student.name.value).toBe('Awa Binta Sanneh');
  });
  it('converts the percentage mark when the school letter is not a WAEC grade', () => {
    const ev = evaluate(ex, kb, jcps);
    const pe = ev.suggestions.find((s) => s.conceptId === 'pe')!;
    expect(pe.grade.letter).toBe('D'); // 40% = E8 Pass in the WAEC percentage bands, not F
    expect(ev.suggestions.find((s) => s.conceptId === 'cs')).toBeTruthy(); // "&" no longer breaks the match
  });
  it('documents one term of three, so no credit is suggested yet in half-credit steps', () => {
    const ev = evaluate(ex, kb, jcps);
    expect(ev.suggestions.every((s) => s.share === 0.33)).toBe(true);
    expect(ev.totalEarned).toBe(0);
    expect(ev.flags.some((f) => f.id === 'partial-year')).toBe(true);
    expect(ev.flags.some((f) => f.id === 'completed-abroad')).toBe(false);
  });
  it('counts two of three terms as one semester when the earlier term is confirmed', () => {
    const ev = evaluate(ex, kb, jcps, {}, { earlierTermsDone: [11] });
    const math = ev.suggestions.find((s) => s.conceptId === 'math.general')!;
    expect(math.share).toBe(0.67);
    expect(math.credits).toBe(0.5);
  });
  it('adds up term reports of the same course into a full year', () => {
    const both = runExtraction(docxHtmlToDoc(termReport('First Term', '11 S1', rows) + termReport('Second Term', '11 S1', rows) + termReport('Third Term', '11 S1', rows)), kb);
    const ev = evaluate(both, kb, jcps);
    const maths = ev.suggestions.filter((s) => s.conceptId === 'math.general');
    expect(maths).toHaveLength(3);
    expect(maths.reduce((a, s) => a + s.credits, 0)).toBeCloseTo(1, 2);
    expect(ev.totalEarned).toBeGreaterThanOrEqual(5);
  });
  it('places mathematics on the US course sequence and suggests where to continue', () => {
    const ev = evaluate(ex, kb, jcps);
    // WAEC mathematics is a spiral course: year 2 of 3 (SS2 = grade 11) stands for the second US course.
    expect(ev.suggestions.find((s) => s.conceptId === 'math.general')!.usCourse?.title).toBe('Geometry');
    expect(ev.suggestions.find((s) => s.conceptId === 'math.advanced')!.usCourse?.title).toBe('Pre-Calculus');
    const p = ev.placements.find((x) => x.ladder === 'math')!;
    // Further Mathematics covers most of Algebra II; Geometry's circle theorems and similarity come later.
    expect(p.completed).toEqual(['Algebra I', 'Algebra II']);
    expect(p.continueIn?.title).toBe('Geometry');
    expect(p.continueIn?.catalogTitle).toBe('Geometry');
    expect(p.steps.find((s) => s.title === 'Geometry')!.missing).toContain('circle theorems (arcs, chords, angles)');
    expect(p.reasons.some((r) => /12th week|twelfth week/.test(r.text))).toBe(true);
  });
  it('falls back to the usual US grade-level sequence, at low confidence, when no syllabus is on file', () => {
    const doc = docxHtmlToDoc('<p>Lycée de la Colline — Bulletin</p><p>Classe de Première</p><table><tr><th>Matières</th><th>Moyenne élève /20</th></tr><tr><td>Mathématiques</td><td>14</td></tr></table>');
    const fr = runExtraction(doc, kb);
    const ev = evaluate(fr, kb, jcps);
    expect(ev.suggestions[0].usCourse?.title).toBe('Algebra II');
    expect(ev.placements[0].confidence).toBeLessThan(0.5);
  });
  it('moves later years of a subject up the ladder instead of repeating the same US course', () => {
    const years = runExtraction(docxHtmlToDoc(
      '<p>MEXICO SECRETARÍA DE EDUCACIÓN PÚBLICA BACHILLERATO</p><p>PRIMER SEMESTRE</p><table><tr><th>ASIGNATURA</th><th>CALIF.</th></tr><tr><td>Matemáticas I</td><td>9</td></tr></table>' +
      '<p>SEGUNDO SEMESTRE</p><table><tr><th>ASIGNATURA</th><th>CALIF.</th></tr><tr><td>Matemáticas II</td><td>9</td></tr></table>'), kb);
    const ev = evaluate(years, kb, jcps);
    expect(ev.suggestions.map((s) => s.usCourse?.title)).toEqual(['Algebra I', 'Geometry']);
    expect(ev.suggestions.map((s) => s.credits)).toEqual([0.5, 0.5]);
  });
  it('checks JCPS’s named courses: Algebra II and U.S. History', () => {
    const ev = evaluate(ex, kb, jcps);
    const math = ev.progress.find((p) => p.requirementId === 'math')!;
    expect(math.includes?.map((i) => i.label)).toEqual(['Algebra I', 'Geometry', 'Algebra II']);
    const social = ev.progress.find((p) => p.requirementId === 'social')!;
    expect(social.includes?.find((i) => i.label === 'U.S. History')?.met).toBe(false);
    // With the earlier term confirmed: one English row is half a credit, so English I is in progress and English II not.
    const ev2 = evaluate(ex, kb, jcps, {}, { earlierTermsDone: [11] });
    const ela = ev2.progress.find((p) => p.requirementId === 'ela')!;
    expect(ela.includes?.map((i) => [i.met, !!i.partial])).toEqual([[false, true], [false, false]]);
    // Algebra I has no credit on this record, but the WAEC sequence says it is covered: the requirement says so.
    const alg1 = ev2.progress.find((p) => p.requirementId === 'math')!.includes!.find((i) => i.label === 'Algebra I')!;
    expect(alg1.met).toBe(false);
    expect(alg1.expected).toMatch(/expected to be covered by earlier years/);
  });
  it('flags JCPS’s rule for students who finished secondary school abroad', () => {
    const wassce = runExtraction(docxHtmlToDoc('<p>THE WEST AFRICAN EXAMINATIONS COUNCIL — WASSCE</p><table><tr><th>SUBJECT</th><th>GRADE</th></tr><tr><td>ENGLISH LANGUAGE</td><td>B3</td></tr><tr><td>MATHEMATICS</td><td>C4</td></tr><tr><td>BIOLOGY</td><td>B2</td></tr></table>'), kb);
    expect(evaluate(wassce, kb, jcps).flags.some((f) => f.id === 'completed-abroad')).toBe(true);
  });
  it('rounds to the district step with slack for two of three terms', () => {
    expect(roundToStep(1 / 3, 0.5)).toBe(0);
    expect(roundToStep(2 / 3, 0.5)).toBe(0.5);
    expect(roundToStep(1, 0.5)).toBe(1);
    expect(roundToStep(0.5, 0.5)).toBe(0.5);
  });
});

describe('ingest helpers', () => {
  it('restores Arabic that OCR returns in visual order', () => {
    expect(fixRtl('ةيبرعلا ةغللا')).toBe('اللغة العربية');
    expect(fixRtl('٢٥ ةجرد')).toBe('درجة ٢٥');
    expect(fixRtl('Mathematics')).toBe('Mathematics');
  });
  it('repairs presentation-form Arabic from PDF text layers', () => {
    expect(repairArabic('ﺔﯿﺑﺮﻌﻟا ﺔﻐﻠﻟا')).toBe('اللغة العربية');
    expect(repairArabic('plain')).toBe('plain');
  });
  it('estimates page tilt from pixels', () => {
    const w = 320, h = 240;
    const img = new Uint8Array(w * h).fill(255);
    const slope = 0.05;
    for (let line = 30; line < 220; line += 22) for (let x = 20; x < 300; x++) for (let t = 0; t < 3; t++) img[Math.round(line + slope * (x - w / 2)) * w + x + t * w] = 20;
    expect(estimateSkew(img, w, h)).toBeCloseTo(slope, 2);
  });
  it('routes to a script-specific reader only when the main one cannot read the page', async () => {
    const seg = (text: string, confidence = 0.97): OcrSegment => ({ text, box: { x: 0, y: 0, width: 10, height: 10 }, confidence });
    const calls: string[] = [];
    const latin = await routeOcr(async (id) => (calls.push(id), [[seg('Mathematics'), seg('88')], [seg('English Language'), seg('91')], [seg('Physics'), seg('75')]]));
    expect(latin.model).toBe('main');
    expect(calls).toEqual(['main']);
    const korean = await routeOcr(async (id) => (id === 'korean' ? [[seg('국어 수학 영어 한국사 통합사회 통합과학 체육 음악 미술 기술가정 정보 문학')]] : [[seg(''), seg(''), seg('4')]]));
    expect(korean.model).toBe('korean');
  });
  it('reads a course catalog list', () => {
    const { courses, skipped } = parseCatalog('Course  Title  Credits\nMTH101  Algebra I  1.0\nSCI210, Biology, 1\n0471 AP Statistics\nPage 3', kb, kb.districts[0].requirements);
    expect(courses.map((c) => [c.code, c.title, c.credits, c.concepts[0]])).toEqual([
      ['MTH101', 'Algebra I', 1, 'math.algebra1'],
      ['SCI210', 'Biology', 1, 'sci.biology'],
      ['0471', 'AP Statistics', 1, 'math.statistics'],
    ]);
    expect(skipped).toBeGreaterThanOrEqual(1);
  });
});

describe('knowledge base integrity', () => {
  it('every stored fact carries a source, a school year and the date it was added', () => {
    for (const s of kb.systems) {
      expect(s.provenance.source.title, s.id).toBeTruthy();
      expect(s.provenance.schoolYear, s.id).toMatch(/^\d{4}-\d{2}$/);
      expect(s.provenance.addedOn, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const sc of s.scales) expect(sc.provenance.source.title, sc.id).toBeTruthy();
      for (const l of s.levels) expect(() => new RegExp(l.pattern, 'iu'), `${s.id}: ${l.pattern}`).not.toThrow();
      for (const c of s.courses) expect(kb.concepts.some((k) => k.id === c.concept), `${s.id}: ${c.concept}`).toBe(true);
    }
    for (const d of kb.districts) {
      expect(d.provenance.source.title, d.id).toBeTruthy();
      expect(d.requirements.some((r) => r.id === 'elective'), d.id).toBe(true);
      for (const c of d.catalog) for (const k of c.concepts) expect(kb.concepts.some((x) => x.id === k), `${d.id}: ${k}`).toBe(true);
    }
  });
  it('seeds the systems the brief names, plus a generic fallback', () => {
    const ids = kb.systems.map((s) => s.id);
    for (const id of ['waec', 'gabece', 'jamb', 'ib', 'uk', 'in-cbse', 'in-cisce', 'cn', 'mx-sep', 'fr', 'de', 'ph-k12', 'br', 'kr', 'vn', 'generic']) expect(ids).toContain(id);
  });
});
