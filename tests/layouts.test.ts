// Report-card layouts from Latin America and Senegal, typed as Word-style tables. Every record is fictitious.
import { describe, expect, it } from 'vitest';
import { runExtraction } from '../src/core/pipeline.ts';
import { docxHtmlToDoc } from '../src/ingest/docx.ts';
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
