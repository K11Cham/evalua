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
