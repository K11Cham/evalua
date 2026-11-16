import { describe, expect, it } from 'vitest';
import { detectSystem } from '../src/core/extract.ts';
import { evaluate } from '../src/core/evaluate.ts';
import { runExtraction } from '../src/core/pipeline.ts';
import { docxHtmlToDoc } from '../src/ingest/docx.ts';
import { combine, kb } from './helpers.ts';

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

describe('years and terms across files', () => {
  it('reads grade, school year and term per report, in other languages too', () => {
    const fr = (trim: string, classe: string, year: string) =>
      `<p>LYCÉE DES TROIS RIVIÈRES</p><p>Bulletin du ${trim}</p><p>Élève: BENALI Sami</p><p>Classe: ${classe}</p><p>Année scolaire: ${year}</p>` +
      `<table><tr><th>Matières</th><th>Moyenne élève /20</th></tr><tr><td>Mathématiques</td><td>14,0</td></tr><tr><td>Philosophie</td><td>12,5</td></tr></table>`;
    const ex2 = combine(fr('1er trimestre', 'Seconde', '2023-2024'), fr('2e trimestre', 'Seconde', '2023-2024'), fr('1er trimestre', 'Première', '2024-2025'));
    expect(ex2.systemId.value).toBe('fr');
    const maths = ex2.courses.filter((c) => c.name.original === 'Mathématiques');
    expect(maths.map((c) => [c.level, c.term, c.academicYear])).toEqual([[10, '1', '2023-2024'], [10, '2', '2023-2024'], [11, '1', '2024-2025']]);
    const vn = (hk: string, lop: string, year: string) =>
      `<p>SỞ GIÁO DỤC VÀ ĐÀO TẠO — TRƯỜNG THPT SÔNG HƯƠNG XANH</p><p>${hk}</p><p>Họ và tên: Trần Minh Anh</p><p>Lớp: ${lop}</p><p>Năm học: ${year}</p>` +
      `<table><tr><th>Môn học</th><th>Điểm</th></tr><tr><td>Toán</td><td>8,5</td></tr><tr><td>Ngữ văn</td><td>7,0</td></tr></table>`;
    const ex3 = combine(vn('Học kỳ I', '10', '2023-2024'), vn('Học kỳ II', '10', '2023-2024'), vn('Học kỳ I', '11', '2024-2025'));
    expect(ex3.courses.filter((c) => c.name.original === 'Toán').map((c) => [c.level, c.term, c.academicYear])).toEqual([[10, '1', '2023-2024'], [10, '2', '2023-2024'], [11, '1', '2024-2025']]);
  });
  it('never lets one file’s grade level leak into the next, and ignores “class on leaving”', () => {
    const ng = (period: string) =>
      `<p>GREENFIELD UNITY COLLEGE — SENIOR SECONDARY SCHOOL</p><p>${period}</p><p>Class on Leaving: SS 3 Science</p><table><tr><th>Subject</th><th>Grade</th></tr><tr><td>Mathematics</td><td>B2</td></tr></table>`;
    const ex4 = combine(ng('SS 1 (2021/2022)'), ng('SS 2 (2022/2023)'));
    expect(ex4.courses.map((c) => [c.level, c.academicYear])).toEqual([[10, '2021-2022'], [11, '2022-2023']]);
  });
  it('keeps wrapped subject names and wrapped comments inside the table', () => {
    // Layout as a text PDF gives it: a long name wraps around its marks, a comment wraps onto a second line.
    const tok = (text: string, x: number, y: number, w: number) => ({ text, page: 0, x, y, w, h: 9, conf: 1 });
    const doc = {
      kind: 'pdf-text' as const, engine: 'test', warnings: [] as string[], pages: [{ width: 600, height: 800 }],
      tokens: [
        tok('LYCÉE DES TROIS RIVIÈRES', 200, 40, 150), tok('Classe de Première — Année scolaire 2023-2024', 50, 90, 250),
        tok('Matières', 50, 120, 40), tok('Moyenne élève /20', 300, 120, 80), tok('Appréciations', 420, 120, 70),
        tok('Français', 50, 140, 40), tok('12,5', 320, 140, 20), tok('Travail régulier.', 420, 140, 80),
        tok('Résultats fragiles, ne pas se', 420, 156, 140), tok('Mathématiques', 50, 160, 70), tok('9,5', 320, 160, 15), tok('décourager.', 420, 165, 60),
        tok('Spécialité Sciences de la vie et de la', 50, 182, 190), tok('15,0', 320, 188, 20), tok('Très bon travail.', 420, 188, 80), tok('Terre', 50, 194, 30),
        tok('Notes sur 20. La moyenne est de 10/20.', 50, 230, 200),
      ],
    };
    const ex5 = runExtraction(doc, kb);
    expect(ex5.courses.map((c) => [c.name.original, c.grade.value])).toEqual([['Français', '12.5'], ['Mathématiques', '9.5'], ['Spécialité Sciences de la vie et de la Terre', '15.0']]);
  });
});

describe('headings and fields that OCR runs together', () => {
  // Synthetic text-layer tokens, laid out as a photo of a two-column-group certificate reads.
  const tok = (text: string, x: number, y: number, w: number) => ({ text, page: 0, x, y, w, h: 10, conf: 0.9 });
  const page = (tokens: ReturnType<typeof tok>[]) => ({ kind: 'ocr' as const, engine: 'test', warnings: [] as string[], pages: [{ width: 800, height: 600 }], tokens });
  it('splits one heading cell over several columns and cross-checks the grade against its words', () => {
    const t = [tok('CERTIFICADO DE TERMINACIÓN DE ESTUDIOS', 200, 20, 300), tok('BACHILLERATO GENERAL', 250, 40, 160), tok('SEGUNDO SEMESTRE', 60, 80, 120)];
    t.push(tok('ASIGNATURA', 60, 100, 80), tok('CALIF.LETRA CRÉDITOS', 300, 100, 190));
    const body: [string, string, string, string][] = [['Matemáticas II', '7', 'SIETE', '10'], ['Química II', '8', 'OCHO', '10'], ['Ética II', '9', 'NUEVE', '6'], ['Inglés II', '8', 'DIEZ', '6']];
    body.forEach(([n, g, w, cr], i) => t.push(tok(n, 60, 125 + i * 22, 110), tok(g, 305, 125 + i * 22, 10), tok(w, 360, 125 + i * 22, 50), tok(cr, 460, 125 + i * 22, 16)));
    const ex = runExtraction(page(t), kb, { systemId: 'mx-sep' });
    expect(ex.courses.map((c) => [c.name.original, c.grade.value, c.credits?.value])).toEqual(body.map(([n, g, , cr]) => [n, g, Number(cr)]));
    expect(ex.courses.map((c) => c.gradeWords?.agrees)).toEqual([true, true, true, false]);
    expect(ex.courses[0].grade.confidence).toBeGreaterThanOrEqual(0.95);
    expect(ex.courses[3].grade.confidence).toBeLessThanOrEqual(0.5);
  });
  it('reads a student line whose colons were lost instead of taking it for a table heading', () => {
    const t = [tok('JOINT ADMISSIONS AND MATRICULATION BOARD', 200, 20, 300), tok('Candidate Name ADEYEMI, Oluwaseun Bolanle', 60, 60, 260), tok('Registration Number 202550418837FA', 420, 60, 220)];
    t.push(tok('SUBJECT', 60, 100, 60), tok('SCORE', 420, 100, 40));
    [['USE OF ENGLISH', '64'], ['MATHEMATICS', '71'], ['PHYSICS', '58']].forEach(([n, s], i) => t.push(tok(n, 60, 122 + i * 20, 110), tok(s, 425, 122 + i * 20, 16)));
    const ex = runExtraction(page(t), kb);
    expect(ex.student.name.value).toBe('Oluwaseun Bolanle Adeyemi');
    expect(ex.student.id.value).toBe('202550418837FA');
    expect(ex.courses.map((c) => c.grade.value)).toEqual(['64', '71', '58']);
  });
});
