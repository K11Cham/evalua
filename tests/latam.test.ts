// Latin American, Caribbean and Senegalese systems: each country's usual heading picks its own system, its year
// labels map to the right US grade, and its marks convert by its own scale. Every record here is fictitious.
import { describe, expect, it } from 'vitest';
import { detectSystem } from '../src/core/extract.ts';
import { runExtraction } from '../src/core/pipeline.ts';
import { docxHtmlToDoc } from '../src/ingest/docx.ts';
import { kb, letter, sys } from './helpers.ts';

const HEADINGS: [string, string][] = [
  ['ar', 'Ministerio de Educación — Dirección General de Cultura y Educación, Provincia de Buenos Aires. Certificado Analítico. Escuela de Educación Secundaria N.º 12. DNI 40.111.222'],
  ['co', 'República de Colombia. Secretaría de Educación de Bogotá. Institución Educativa San Rafael. Certificado de estudios, grado once. Tarjeta de identidad.'],
  ['ve', 'República Bolivariana de Venezuela. Ministerio del Poder Popular para la Educación. Zona Educativa Miranda. Certificación de Calificaciones, Educación Media General.'],
  ['do', 'República Dominicana. Ministerio de Educación (MINERD). Regional de Educación 10, Distrito Educativo 10-03, Santo Domingo. Nivel Secundario.'],
  ['pe', 'Ministerio de Educación del Perú. UGEL 03. Certificado Oficial de Estudios, Educación Básica Regular, nivel secundaria. Lima.'],
  ['cl', 'República de Chile, Ministerio de Educación. Certificado Anual de Estudios, Enseñanza Media. RBD 8833-1. RUN 21.333.444-5. Valparaíso.'],
  ['ec', 'República del Ecuador, Ministerio de Educación. Unidad Educativa Fiscal Quito Sur. Bachillerato General Unificado (BGU). Distrito Educativo 17D06.'],
  ['bo', 'Estado Plurinacional de Bolivia, Ministerio de Educación. Unidad Educativa Simón Bolívar, Cochabamba. Educación Secundaria Comunitaria Productiva. RUDE 8090.'],
  ['py', 'República del Paraguay, Ministerio de Educación y Ciencias. Colegio Nacional de Asunción. Educación Media, Bachillerato Científico. Lengua Guaraní y Literatura.'],
  ['uy', 'ANEP — Consejo de Educación Secundaria, República Oriental del Uruguay. Liceo N.º 4, Montevideo. Bachillerato Diversificado.'],
  ['gt', 'República de Guatemala, MINEDUC. Instituto Nacional, Quetzaltenango. Ciclo Diversificado, Bachillerato en Ciencias y Letras. Código personal A123BCD.'],
  ['hn', 'República de Honduras, Secretaría de Educación. Instituto Central, Tegucigalpa. Bachillerato en Ciencias y Humanidades. Dirección Departamental.'],
  ['sv', 'República de El Salvador, Ministerio de Educación, Ciencia y Tecnología. Instituto Nacional de San Salvador. Bachillerato General. NIE 1234567. PAES.'],
  ['ni', 'República de Nicaragua, Ministerio de Educación (MINED). Instituto Nacional de Managua. Educación Secundaria. Aprendizaje avanzado (AA).'],
  ['cr', 'República de Costa Rica, Ministerio de Educación Pública (MEP). Colegio de San José. Educación Diversificada. Bachillerato en Educación Media.'],
  ['pa', 'República de Panamá, Ministerio de Educación (MEDUCA). Instituto Nacional. Premedia y Media. Bachiller en Ciencias.'],
  ['cu', 'República de Cuba, Ministerio de Educación. IPVCE Vladimir I. Lenin, La Habana. Preuniversitario. Carné de identidad.'],
  ['pr', 'Departamento de Educación de Puerto Rico. Escuela Superior Juan Ponce de León, Bayamón. Transcripción de Créditos.'],
  ['sn', 'République du Sénégal, Ministère de l’Éducation nationale. Inspection d’Académie de Dakar. Lycée Blaise Diagne. Bulletin de notes, classe de Terminale.'],
  ['mx-sep', 'Secretaría de Educación Pública. Estados Unidos Mexicanos. Certificado de Educación Secundaria. CURP.'],
  ['br', 'República Federativa do Brasil. Secretaria de Estado da Educação. Histórico Escolar, Ensino Médio.'],
];

describe('Latin American and Senegalese systems', () => {
  it('each country’s usual heading picks its own system', () => {
    for (const [id, text] of HEADINGS) expect(detectSystem(text, kb.systems).profile?.id, text.slice(0, 40)).toBe(id);
  });

  it('every new system says what language its schools teach in, with a source', () => {
    for (const id of ['ar', 'co', 've', 'do', 'pe', 'cl', 'ec', 'bo', 'py', 'uy', 'gt', 'hn', 'sv', 'ni', 'cr', 'pa', 'cu', 'pr', 'sn']) {
      const p = sys(id);
      expect(p, id).toBeTruthy();
      expect(p.instruction.provenance.source.url, id).toMatch(/^https:\/\//);
    }
    expect(sys('py').instruction.languages).toEqual(['es', 'gn']);
    expect(sys('pr').instruction.varies).toBe('unknown');
  });

  it('maps each system’s final secondary year to US grade 12', () => {
    const level = (id: string, label: string) => {
      for (const r of sys(id).levels) if (new RegExp(r.pattern, 'iu').test(label)) return r.level;
      return null;
    };
    const cases: [string, string, number][] = [
      ['ar', '1º año', 8], ['ar', '5º Año', 12], ['ar', 'Quinto año', 12],
      ['co', 'Grado 11º', 12], ['co', 'grado décimo', 11], ['co', 'Grado 6', 7],
      ['ve', '5to año', 12], ['ve', '3er año', 10],
      ['do', '6to de Secundaria', 12], ['do', '1ro de secundaria', 7],
      ['pe', '5º de secundaria', 12], ['pe', 'Primer grado', 8],
      ['cl', '4º Medio', 12], ['cl', '1° año medio', 9], ['cl', 'Segundo Medio', 10],
      ['ec', '3º BGU', 12], ['ec', 'Primero de Bachillerato', 10], ['ec', '10º EGB', 9],
      ['bo', '6to de secundaria', 12],
      ['py', '3er curso', 12], ['py', '1er Curso', 10],
      ['uy', '6º año', 12], ['uy', '4to de bachillerato', 10], ['uy', '2º Ciclo Básico', 8],
      ['gt', '5to Bachillerato', 12], ['gt', '3ro Básico', 9],
      ['hn', '11º grado', 12], ['hn', '10mo grado', 11],
      ['sv', '2º año de bachillerato', 12], ['sv', 'Primer año de bachillerato', 11],
      ['ni', '11mo grado', 12], ['ni', '5to año', 12], ['ni', '7mo grado', 8],
      ['cr', 'Undécimo año', 12], ['cr', '10º año', 11],
      ['pa', '12º grado', 12], ['pa', '7º grado', 7],
      ['cu', '12mo grado', 12],
      ['pr', '12mo grado', 12], ['pr', '9no grado', 9],
      ['sn', 'Terminale S2', 12], ['sn', 'Classe de Seconde', 10], ['sn', '3ème', 9],
    ];
    for (const [id, label, want] of cases) expect(level(id, label), `${id}: ${label}`).toBe(want);
  });

  it('converts marks by each country’s own scale', () => {
    const cases: [string, string, string][] = [
      ['ar', '9', 'A'], ['ar', '7', 'B'], ['ar', '4', 'C'], ['ar', '3', 'F'],
      ['co', '4.7', 'A'], ['co', '3.2', 'C'], ['co', '2.5', 'F'], ['co', 'Superior', 'A'], ['co', 'Básico', 'C'], ['co', 'Bajo', 'F'],
      ['ve', '18', 'A'], ['ve', '14', 'B'], ['ve', '10', 'C'], ['ve', '9', 'F'],
      ['do', '92', 'A'], ['do', '75', 'C'], ['do', '65', 'F'],
      ['pe', '16', 'A'], ['pe', '11', 'C'], ['pe', '10', 'F'], ['pe', 'AD', 'A'],
      ['cl', '6.8', 'A'], ['cl', '5.2', 'B'], ['cl', '4.0', 'C'], ['cl', '3.5', 'F'],
      ['ec', '9.5', 'A'], ['ec', '8', 'B'], ['ec', '4', 'F'],
      ['bo', '90', 'A'], ['bo', '70', 'B'], ['bo', '51', 'C'], ['bo', '50', 'F'],
      ['py', '5', 'A'], ['py', '3', 'B'], ['py', '1', 'F'],
      ['uy', '12', 'A'], ['uy', '6', 'B'], ['uy', '2', 'F'],
      ['gt', '85', 'A'], ['gt', '65', 'C'], ['gt', '55', 'F'],
      ['hn', '95', 'A'], ['hn', '85', 'B'], ['hn', '69', 'F'],
      ['sv', '9', 'A'], ['sv', '7.5', 'B'], ['sv', '4', 'F'],
      ['ni', '92', 'A'], ['ni', '62', 'C'], ['ni', 'AS', 'B'],
      ['cr', '88', 'B'], ['cr', '72', 'C'], ['cr', '60', 'F'],
      ['pa', '4.8', 'A'], ['pa', '3.5', 'C'], ['pa', '1.5', 'F'],
      ['cu', '98', 'A'], ['cu', '65', 'D'], ['cu', '50', 'F'],
      ['pr', 'B+', 'B'], ['pr', '91', 'A'],
      ['sn', '17', 'A'], ['sn', '12,5', 'B'], ['sn', '10', 'C'], ['sn', '8', 'F'],
      ['co', 'Excelente', 'A'], ['cl', 'Insuficiente', 'F'],
    ];
    for (const [id, grade, want] of cases) expect(letter(id, grade), `${id}: ${grade}`).toBe(want);
  });

  it('reads a fictitious Chilean concentración de notas end to end', () => {
    const html =
      '<p>REPÚBLICA DE CHILE — MINISTERIO DE EDUCACIÓN</p><p>CONCENTRACIÓN DE NOTAS — ENSEÑANZA MEDIA</p><p>Liceo Bicentenario Los Aromos, Valparaíso. RBD 9999-9</p>' +
      '<p>Nombre: ROJAS PIZARRO, Javiera Andrea</p><p>RUN: 22.333.444-K</p>' +
      '<table><tr><th>Asignatura</th><th>1º Medio</th><th>2º Medio</th></tr>' +
      '<tr><td>Lengua y Literatura</td><td>6,2</td><td>5,8</td></tr><tr><td>Matemática</td><td>6,8</td><td>6,5</td></tr>' +
      '<tr><td>Inglés</td><td>5,9</td><td>6,1</td></tr><tr><td>Historia, Geografía y Ciencias Sociales</td><td>6,0</td><td>5,5</td></tr>' +
      '<tr><td>Biología</td><td>5,4</td><td>4,9</td></tr><tr><td>Educación Física y Salud</td><td>7,0</td><td>6,9</td></tr></table>';
    const r = runExtraction(docxHtmlToDoc(html), kb);
    expect(r.systemId.value).toBe('cl');
    expect(r.country.value).toBe('Chile');
    const rows = r.courses.map((c) => [c.name.original, c.grade.value, c.level]);
    expect(rows).toContainEqual(['Matemática', '6.8', 9]);
    expect(rows).toContainEqual(['Matemática', '6.5', 10]);
    expect(rows.length).toBe(12);
  });
});
