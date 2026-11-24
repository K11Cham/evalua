// Report-card layouts from Latin America and Senegal, typed as Word-style tables. Every record is fictitious.
import { describe, expect, it } from 'vitest';
import { runExtraction } from '../src/core/pipeline.ts';
import { docxHtmlToDoc } from '../src/ingest/docx.ts';
import { splitCells } from '../src/ingest/ocrTokens.ts';
import { kb } from './helpers.ts';

const t = (head: string[], rows: string[][]) => `<table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const CASES: [string, string][] = [
  ['ve-lapsos', '<p>República Bolivariana de Venezuela — Ministerio del Poder Popular para la Educación</p><p>Boletín, 4to año, Año escolar 2024-2025</p>' + t(['Asignatura', '1er Lapso', '2do Lapso', '3er Lapso', 'Definitiva'], [['Castellano y Literatura', '15', '16', '17', '16'], ['Matemática', '12', '14', '13', '13'], ['Física', '10', '11', '12', '11']])],
  ['co-boletin', '<p>República de Colombia — Institución Educativa La Esperanza</p><p>Informe final, Grado 10º, 2024</p>' + t(['Área / Asignatura', 'IH', 'P1', 'P2', 'P3', 'P4', 'Definitiva', 'Desempeño'], [['Matemáticas', '5', '4.0', '4.2', '3.8', '4.5', '4.1', 'Alto'], ['Química', '3', '3.0', '3.4', '3.2', '3.6', '3.3', 'Básico'], ['Inglés', '3', '4.8', '4.7', '4.9', '5.0', '4.9', 'Superior']])],
  ['ar-trim', '<p>Provincia de Buenos Aires — Dirección General de Cultura y Educación</p><p>Escuela de Educación Secundaria N.º 5 — 3º año — Ciclo lectivo 2024</p>' + t(['Espacio Curricular', '1º Trimestre', '2º Trimestre', '3º Trimestre', 'Nota Final'], [['Prácticas del Lenguaje', '7', '8', '8', '8'], ['Matemática', '6', '6', '7', '7'], ['Construcción de Ciudadanía', '9', '9', '10', '9']])],
  ['sn-bulletin', '<p>République du Sénégal — Inspection d’Académie de Dakar — Lycée Seydina Limamou Laye</p><p>Bulletin de notes — Classe de Première S1 — 2e trimestre 2024-2025</p>' + t(['Disciplines', 'Coef.', 'Moy.', 'Moy x Coef', 'Rang', 'Appréciation'], [['Mathématiques', '5', '14,50', '72,50', '3e', 'Bien'], ['Sciences Physiques', '5', '12,00', '60,00', '8e', 'Assez bien'], ['Français', '3', '11,25', '33,75', '12e', 'Passable'], ['Anglais', '2', '15,00', '30,00', '2e', 'Bien']])],
  ['pe-bimestres', '<p>Ministerio de Educación — UGEL 07 — Perú</p><p>Libreta de notas — 5º de secundaria — 2023</p>' + t(['Área curricular', 'I Bim.', 'II Bim.', 'III Bim.', 'IV Bim.', 'Promedio Final'], [['Matemática', '14', '15', '13', '16', '15'], ['Comunicación', '17', '16', '18', '17', '17'], ['Ciencia y Tecnología', '12', '13', '11', '14', '13']])],
  ['cl-years', '<p>República de Chile — Ministerio de Educación</p><p>Concentración de notas</p>' + t(['Asignatura', '1º Medio', '2º Medio', '3º Medio', '4º Medio', 'Promedio'], [['Matemática', '6,1', '5,9', '6,3', '6,0', '6,1'], ['Química', '5,5', '5,1', '5,8', '—', '5,5']])],
  ['do-grade-first', '<p>República Dominicana — MINERD — Distrito Educativo 15-02</p><p>Récord de calificaciones — 5to de Secundaria</p>' + t(['Calificación', 'Asignatura'], [['88', 'Lengua Española'], ['92', 'Matemática'], ['79', 'Ciencias Sociales']])],
];
const read = (name: string) => {
  const r = runExtraction(docxHtmlToDoc(CASES.find(([n]) => n === name)![1]), kb);
  return { system: r.systemId.value, rows: r.courses.map((c) => [c.name.original, c.grade.value, c.level] as [string, string, number | null]) };
};

describe('layouts with term or year columns', () => {
  it('term columns beside a final column give one course with the final grade, at the year printed above', () => {
    expect(read('ve-lapsos')).toEqual({ system: 've', rows: [['Castellano y Literatura', '16', 11], ['Matemática', '13', 11], ['Física', '11', 11]] });
    expect(read('ar-trim').rows).toEqual([['Prácticas del Lenguaje', '8', 10], ['Matemática', '7', 10], ['Construcción de Ciudadanía', '9', 10]]);
    expect(read('pe-bimestres').rows).toEqual([['Matemática', '15', 12], ['Comunicación', '17', 12], ['Ciencia y Tecnología', '13', 12]]);
    expect(read('co-boletin').rows).toEqual([['Matemáticas', '4.1', 11], ['Química', '3.3', 11], ['Inglés', '4.9', 11]]);
  });
  it('year columns stay separate, and an average across them is no year’s grade', () => {
    const { rows } = read('cl-years');
    expect(rows).toContainEqual(['Matemática', '5.9', 10]);
    expect(rows).toContainEqual(['Química', '5.8', 11]);
    expect(rows.filter(([n]) => n === 'Química')).toHaveLength(3);
  });
  it('reads a Senegalese bulletin with coefficients and ranks, and a grade-first record', () => {
    expect(read('sn-bulletin')).toEqual({ system: 'sn', rows: [['Mathématiques', '14.50', 11], ['Sciences Physiques', '12.00', 11], ['Français', '11.25', 11], ['Anglais', '15.00', 11]] });
    expect(read('do-grade-first').rows).toEqual([['Lengua Española', '88', 11], ['Matemática', '92', 11], ['Ciencias Sociales', '79', 11]]);
  });
});

const rowsOf = (cells: string[][]) => `<table>${cells.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;

describe('layouts without the usual heading row', () => {
  it('reads a certificate that names the student in a sentence and lists grades with no heading row', () => {
    const html =
      '<p>REPÚBLICA DE GUATEMALA — MINISTERIO DE EDUCACIÓN</p><p>CERTIFICACIÓN DE ESTUDIOS — Ciclo Diversificado</p>' +
      '<p>El infrascrito Director del Instituto Nacional Mixto Las Cumbres, CERTIFICA: que Carlos Enrique Xicará López, con código personal A123BCD, nacido(a) el 2 de marzo de 2006, cursó y aprobó los grados siguientes:</p>' +
      '<p>QUINTO GRADO DE BACHILLERATO — CICLO 2024</p>' +
      rowsOf([['Matemática', '71', 'setenta y uno'], ['Biología', '86', 'ochenta y seis'], ['Psicología', '93', 'noventa y tres'], ['Estadística', '62', 'sesenta y dos']]);
    const r = runExtraction(docxHtmlToDoc(html), kb);
    expect(r.student.name.value).toBe('Carlos Enrique Xicará López');
    expect(r.student.dob.value).toBe('2006-03-02');
    expect(r.student.id.value).toBe('A123BCD');
    expect(r.school.name.value).toBe('Instituto Nacional Mixto Las Cumbres');
    expect(r.courses.map((c) => [c.name.original, c.grade.value, c.level])).toEqual([['Matemática', '71', 12], ['Biología', '86', 12], ['Psicología', '93', 12], ['Estadística', '62', 12]]);
  });
  it('two stray label-and-number lines are not courses', () => {
    const r = runExtraction(docxHtmlToDoc('<p>Ministerio de Educación del Perú</p>' + rowsOf([['Asistencia', '96'], ['Tardanzas', '2']])), kb);
    expect(r.courses).toHaveLength(0);
  });
  it('reads a register with the year in its own column, and a "Curso" column that holds the courses', () => {
    const ar = runExtraction(docxHtmlToDoc('<p>Provincia de Buenos Aires — Dirección General de Cultura y Educación</p><p>Certificado Analítico</p>' +
      t(['Curso', 'Espacio Curricular', 'Calificación'], [['3º Año', 'Matemática', '7'], ['', 'Biología', '9'], ['5º Año', 'Física', '6']])), kb);
    expect(ar.courses.map((c) => [c.name.original, c.grade.value, c.level])).toEqual([['Matemática', '7', 10], ['Biología', '9', 10], ['Física', '6', 12]]);
    const pr = runExtraction(docxHtmlToDoc('<p>Departamento de Educación de Puerto Rico</p><p>Transcripción de Créditos — Escuela Superior</p>' +
      t(['Grado', 'Curso', 'Nota', 'Créditos'], [['10mo Grado', 'Español', 'A', '1'], ['10mo Grado', 'Matemáticas', 'B', '1'], ['11mo Grado', 'Química', 'C', '1']])), kb);
    expect(pr.courses.map((c) => [c.name.original, c.grade.value, c.level, c.credits?.value])).toEqual([['Español', 'A', 10, 1], ['Matemáticas', 'B', 10, 1], ['Química', 'C', 11, 1]]);
  });
  it('reads two tables side by side headed "Área | Nota"', () => {
    const r = runExtraction(docxHtmlToDoc('<p>Estado Plurinacional de Bolivia — Ministerio de Educación</p><p>Secundaria Comunitaria Productiva</p>' +
      t(['Área', 'Nota', 'Área', 'Nota'], [['Matemática', '66', 'Matemática', '70'], ['Física', '59', 'Física', '62'], ['Química', '72', 'Química', '77']])), kb);
    expect(r.courses.map((c) => [c.name.original, c.grade.value]).sort()).toEqual([['Física', '59'], ['Física', '62'], ['Matemática', '66'], ['Matemática', '70'], ['Química', '72'], ['Química', '77']]);
  });
});

// A fictitious Panamanian certificate as OCR reads a phone scan of it: "10°" over the first Hrs./Calif. pair, the
// later years' pairs left blank (dashes, a stray stroke read as "1"), one heading read as "CalifHrs.".
describe('a certificate with one year printed over several column sets', () => {
  const W = 1970;
  const lines: [number, [number, string][]][] = [
    [52, [[34, 'REPÚBLICA DE PANAMÁ']]],
    [102, [[32, 'MINISTERIO DE EDUCACIÓN']]],
    [219, [[30, 'Certificado de Estudios']]],
    [621, [[23, 'PERÍODO ESCOLAR'], [50, '2025']]],
    [668, [[23, 'ASIGNATURA'], [50, '10°']]],
    [715, [[47, 'Hrs.'], [52, 'Calif.'], [58, 'Hrs.'], [63, 'CalifHrs.'], [73, 'Calif.']]],
    [761, [[47, 'Sem.'], [58, 'Sem.'], [68, 'Sem.']]],
    [808, [[23, 'Español'], [48, '5'], [54, '3.3'], [60, '二'], [65, '一'], [70, '一'], [75, '一']]],
    [847, [[23, 'Inglés'], [49, '4'], [54, '3.5'], [60, '一'], [65, '一'], [70, '一'], [76, '1']]],
    [890, [[23, 'Geografía Física'], [49, '3'], [54, '3.4'], [60, '一'], [65, '二'], [70, '一'], [76, '--']]],
    [932, [[23, 'Geografía Humana'], [54, '一'], [60, '一'], [65, '一'], [70, '一'], [76, '一']]],
    [974, [[23, 'Historia Moderna'], [49, '3.'], [54, '3.7'], [60, '一'], [65, '二'], [70, '一'], [76, '一']]],
    [1015, [[24, 'Física'], [49, '4'], [54, '3.1'], [66, '-'], [71, '-'], [76, '1']]],
  ];
  const doc = {
    kind: 'ocr' as const,
    pages: [{ width: W, height: 2600 }],
    tokens: lines.flatMap(([y, cells]) => cells.map(([x, text]) => ({ text, page: 0, x: (x / 100) * W, y, w: text.length * 17, h: 36, conf: 0.95 }))),
    engine: 'test',
    warnings: [],
  };
  it('reads each subject once, with the printed year’s grade and hours, and skips a subject not taken', () => {
    const r = runExtraction(doc, kb);
    expect(r.systemId.value).toBe('pa');
    expect(r.courses.map((c) => [c.name.original, c.grade.value, c.hours?.value, c.level])).toEqual([
      ['Español', '3.3', 5, 10],
      ['Inglés', '3.5', 4, 10],
      ['Geografía Física', '3.4', 3, 10],
      ['Historia Moderna', '3.7', 3, 10],
      ['Física', '3.1', 4, 10],
    ]);
  });
});

// OCR-shaped fictitious records: positions in % of a 1970 px page.
const ocrDoc = (lines: [number, [number, string, number?][]][], h = 40) => {
  const W = 1970;
  return {
    kind: 'ocr' as const,
    pages: [{ width: W, height: 2600 }],
    tokens: lines.flatMap(([y, cells]) => cells.flatMap(([x, text, w]) => splitCells({ text, page: 0, x: (x / 100) * W, y, w: w ? (w / 100) * W : text.length * 11, h, conf: 0.95 }))),
    engine: 'test',
    warnings: [],
  };
};

describe('years printed under the hours and grade headings', () => {
  it('gives each year its own hours and grade, not the hours as the grade', () => {
    const r = runExtraction(ocrDoc([
      [52, [[34, 'REPÚBLICA DE PANAMÁ']]],
      [102, [[32, 'MINISTERIO DE EDUCACIÓN']]],
      [736, [[16, 'Periodo Escolar'], [36, '2021'], [44, 'Rev.'], [53, '2022'], [61, 'Rev.'], [69, '2023'], [78, 'Rev.']]],
      [779, [[33, 'Hras'], [39, 'Calif.'], [50, 'Hras'], [55, 'Calif.'], [67, 'Hras'], [72, 'Calif.']]],
      [824, [[15, 'asignaturas'], [34, '7° grado'], [51, '8° grado'], [68, '9° grado']]],
      [912, [[15, 'Español'], [34, '5'], [39, '4.1'], [51, '5'], [56, '3.8'], [68, '5'], [73, '3.2']]],
      [955, [[15, 'Matemática'], [34, '5'], [39, '3.1'], [51, '5'], [56, '3.9'], [68, '5'], [73, '4.2']]],
    ]), kb);
    expect(r.courses.map((c) => [c.name.original, c.grade.value, c.hours?.value, c.level])).toEqual([
      ['Español', '4.1', 5, 7], ['Español', '3.8', 5, 8], ['Español', '3.2', 5, 9],
      ['Matemática', '3.1', 5, 7], ['Matemática', '3.9', 5, 8], ['Matemática', '4.2', 5, 9],
    ]);
  });
});

describe('a two-up permanent record with quarter columns', () => {
  it('reads each half’s final grade at that half’s grade level', () => {
    const r = runExtraction(ocrDoc([
      [40, [[41, 'Republic of the Philippines']]],
      [86, [[42, 'Department of Education']]],
      [286, [[6, 'Classified As: GRADE 7'], [21, 'School Year: S.Y. 2014-2015'], [48, 'Classified As: GRADE 8'], [65, 'School Year: S.Y. 2015-2016']]],
      [449, [[5, 'SubjeCts'], [23, 'CLASS STANDING', 12], [41, 'ACTION'], [52, 'Subjects'], [69, 'LASS STANDING', 12], [84, 'UNIT'], [88, 'ACTION']]],
      [477, [[18, '1ST2ND 3RD 4THFINAL', 18], [38, 'UNIT'], [41, 'TAKEN'], [65, '15T'], [69, '2ND 3RD |4TH FINAL', 13], [88, 'TAKEN']]],
      [509, [[1, 'FILIPINO'], [18, '80.00'], [22, '82.00'], [26, '84.00'], [30, '86.00'], [34, '83.00'], [38, '1'], [41, 'Promoted'], [47, 'FILIPINO'], [64, '81.0083.00!'], [72, '85.00'], [76, '87.00'], [80, '84.00'], [85, '1'], [87, 'Promoted']]],
      [538, [[1, 'ENGLISH'], [18, '90.00'], [23, '88,00'], [25, '86.00'], [29, '84.00'], [34, '87.00'], [38, '1'], [41, 'Promoted'], [47, 'ENGLISH'], [64, '79.0081.00'], [72, '83.00'], [75, '85.00'], [80, '82.00'], [84, '1'], [87, 'Promoted']]],
      [628, [[1, 'MATHEMATICS'], [19, '75.0077.00 79.0081.00'], [34, '78.00'], [39, '1'], [41, 'Promoted'], [47, 'MATHEMATICS'], [64, '82.0084.0086.0088.00 85.00'], [84, '1'], [87, 'Promoted']]],
    ], 24), kb);
    expect(r.courses.map((c) => [c.name.original, c.grade.value, c.level])).toEqual([
      ['FILIPINO', '83.00', 7], ['ENGLISH', '87.00', 7], ['MATHEMATICS', '78.00', 7],
      ['FILIPINO', '84.00', 8], ['ENGLISH', '82.00', 8], ['MATHEMATICS', '85.00', 8],
    ]);
  });
});
