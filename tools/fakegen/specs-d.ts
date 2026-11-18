// Fictitious records in deliberately different layouts: a register with the year in a column, certificate lines with
// dotted leaders and the student named in a sentence, grade-first columns, landscape matrices, term columns beside a
// final grade, two tables side by side, borderless tables, and unrelated boxes (grading keys, attendance, fees,
// verification codes) around the grades. Latin America, the Caribbean, Senegal and The Gambia.
// Every student and school is invented. Expected US letters follow the Scholaro tables cited in src/kb/latam.ts.
import type { FakeCourse, FakeSpec } from './types.ts';

const c = (n: string, en: string, g: string, k: string, us: string, extra: Partial<FakeCourse> = {}): FakeCourse => ({ n, en, g, k, us, ...extra });
const SPECIMEN = 'SPECIMEN — FICTITIOUS RECORD FOR SOFTWARE TESTING';
const num = (g: string) => Number(g.replace(',', '.'));
/** US letter from thresholds, highest first: [[min, letter], …]. */
const by = (steps: [number, string][]) => (g: string) => steps.find(([m]) => num(g) >= m)?.[1] ?? 'F';

const ES_WORDS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
const TENS: Record<number, string> = { 6: 'sesenta', 7: 'setenta', 8: 'ochenta', 9: 'noventa' };
const esWords = (n: number) => (n <= 20 ? ES_WORDS[n] : n === 100 ? 'cien' : n % 10 ? `${TENS[Math.floor(n / 10)]} y ${ES_WORDS[n % 10]}` : TENS[n / 10]);

// ── Argentina: certificado analítico, one table with the year in its own column ──
const arUs = by([[9, 'A'], [8, 'A'], [6, 'B'], [4, 'C']]);
const ar = (n: string, en: string, g: string, k: string) => c(n, en, g, k, arUs(g), { x: { letras: esWords(num(g)).toUpperCase(), cond: 'Regular' } });
export const arAnalitico: FakeSpec = {
  id: 'ar-analitico', system: 'ar', country: 'Argentina', lang: 'es', formats: ['pdf', 'scan-jpg'],
  layout: 'register', yearCol: 'Curso', style: 'typewriter',
  page: { rules: 'rows', clutter: [{ at: 'bottom', lines: ['Escala: 1 a 10. Aprobación con 6 (seis) en la escuela.', 'Código de verificación: SPEC-0000-ARG — consulte en la Dirección de Validez de Títulos.'] }] },
  issuer: ['PROVINCIA DE BUENOS AIRES', 'DIRECCIÓN GENERAL DE CULTURA Y EDUCACIÓN', 'Escuela de Educación Secundaria N.º 47 “Los Ceibos” — Bahía Blanca'],
  title: 'CERTIFICADO ANALÍTICO', subtitle: 'Bachiller con orientación en Ciencias Naturales',
  info: [
    { label: 'Apellido y nombres', value: 'GIMÉNEZ, Lucía Belén', role: 'name' },
    { label: 'DNI', value: '45.678.123', role: 'id' },
    { label: 'Fecha de nacimiento', value: '14/02/2006', role: 'dob' },
    { label: 'Establecimiento', value: 'Escuela de Educación Secundaria N.º 47 “Los Ceibos”', role: 'school' },
  ],
  student: { name: 'Lucía Belén Giménez', dob: '2006-02-14', id: '45.678.123' },
  school: { name: 'Escuela de Educación Secundaria N.º 47 “Los Ceibos”', city: 'Bahía Blanca' },
  cols: [{ h: 'Espacio Curricular', f: 'n' }, { h: 'Calificación', f: 'g', align: 'c' }, { h: 'En letras', f: 'x.letras' }, { h: 'Condición', f: 'x.cond' }],
  years: [
    { label: '3º Año', level: 10, academicYear: '2021', courses: [ar('Prácticas del Lenguaje', 'Spanish Language Arts', '8', 'wl.native'), ar('Matemática', 'Mathematics', '7', 'math.general'), ar('Biología', 'Biology', '9', 'sci.biology'), ar('Historia', 'History', '6', 'ss.history.world'), ar('Inglés', 'English (foreign language)', '10', 'ela.efl')] },
    { label: '4º Año', level: 11, academicYear: '2022', courses: [ar('Literatura', 'Literature', '7', 'wl.native'), ar('Matemática', 'Mathematics', '6', 'math.general'), ar('Química', 'Chemistry', '8', 'sci.chemistry'), ar('Geografía', 'Geography', '9', 'ss.geography'), ar('Educación Física', 'Physical Education', '10', 'pe')] },
    { label: '5º Año', level: 12, academicYear: '2023', courses: [ar('Literatura', 'Literature', '8', 'wl.native'), ar('Matemática', 'Mathematics', '7', 'math.general'), ar('Física', 'Physics', '6', 'sci.physics'), ar('Filosofía', 'Philosophy', '9', 'ss.philosophy'), ar('Inglés', 'English (foreign language)', '9', 'ela.efl')] },
  ],
  signatures: ['Secretario/a', 'Director/a'], specimen: SPECIMEN,
};

// ── Colombia: boletín final with four periods, a definitive grade, a performance level, and boxes around it ──
const coUs = by([[4.0, 'A'], [3.5, 'B'], [3.0, 'C']]);
const DES = (g: string) => (num(g) >= 4.6 ? 'Superior' : num(g) >= 4.0 ? 'Alto' : num(g) >= 3.0 ? 'Básico' : 'Bajo');
const co = (n: string, en: string, ih: number, p: string[], g: string, k: string) => c(n, en, g, k, coUs(g), { h: ih, x: { p1: p[0], p2: p[1], p3: p[2], p4: p[3], des: DES(g) } });
export const coBoletin: FakeSpec = {
  id: 'co-boletin', system: 'co', country: 'Colombia', lang: 'es', formats: ['pdf', 'photo-jpg'],
  layout: 'stacked', style: 'sans',
  page: {
    header: 'left',
    clutter: [
      { at: 'side', title: 'Inasistencias', table: [['Periodo', 'Faltas'], ['1', '2'], ['2', '0'], ['3', '1'], ['4', '3']] },
      { at: 'bottom', title: 'Escala de valoración nacional (Decreto 1290)', table: [['Desempeño', 'Rango'], ['Superior', '4.6 – 5.0'], ['Alto', '4.0 – 4.5'], ['Básico', '3.0 – 3.9'], ['Bajo', '1.0 – 2.9']] },
      { at: 'bottom', title: 'Observaciones', lines: ['La estudiante demuestra compromiso y responsabilidad. Se recomienda fortalecer la lectura crítica.'] },
    ],
  },
  issuer: ['REPÚBLICA DE COLOMBIA — SECRETARÍA DE EDUCACIÓN DE MEDELLÍN', 'INSTITUCIÓN EDUCATIVA ALTOS DEL OCASO', 'Aprobada por Resolución 00000 (ficticia)'],
  title: 'INFORME FINAL DE DESEMPEÑO', subtitle: 'Grado Décimo (10º) — Año lectivo 2024',
  info: [
    { label: 'Estudiante', value: 'RESTREPO OSORIO, Valentina', role: 'name' },
    { label: 'Tarjeta de identidad', value: '1.020.304.050', role: 'id' },
    { label: 'Fecha de nacimiento', value: '03/07/2008', role: 'dob' },
    { label: 'Sede', value: 'Principal' },
  ],
  student: { name: 'Valentina Restrepo Osorio', dob: '2008-07-03', id: '1.020.304.050' },
  school: { name: 'Institución Educativa Altos del Ocaso', city: 'Medellín' },
  cols: [{ h: 'Área / Asignatura', f: 'n' }, { h: 'IH', f: 'h', align: 'c' }, { h: 'P1', f: 'x.p1', align: 'c' }, { h: 'P2', f: 'x.p2', align: 'c' }, { h: 'P3', f: 'x.p3', align: 'c' }, { h: 'P4', f: 'x.p4', align: 'c' }, { h: 'Definitiva', f: 'g', align: 'c' }, { h: 'Desempeño', f: 'x.des' }],
  years: [{
    label: 'Grado Décimo (10º) — Año lectivo 2024', level: 11, academicYear: '2024', courses: [
      co('Matemáticas', 'Mathematics', 4, ['4.0', '4.2', '3.8', '4.4'], '4.1', 'math.general'),
      co('Física', 'Physics', 3, ['3.2', '3.6', '3.4', '3.8'], '3.5', 'sci.physics'),
      co('Química', 'Chemistry', 3, ['4.6', '4.8', '4.7', '4.9'], '4.8', 'sci.chemistry'),
      co('Lengua Castellana', 'Spanish Language Arts', 4, ['3.9', '4.1', '4.0', '4.2'], '4.0', 'wl.native'),
      co('Inglés', 'English (foreign language)', 3, ['3.0', '3.2', '3.1', '3.3'], '3.2', 'ela.efl'),
      co('Ciencias Sociales', 'Social Studies', 3, ['4.4', '4.5', '4.3', '4.6'], '4.5', 'ss.social'),
      co('Filosofía', 'Philosophy', 2, ['3.6', '3.8', '3.7', '3.9'], '3.8', 'ss.philosophy'),
      co('Educación Física', 'Physical Education', 2, ['5.0', '4.9', '5.0', '4.8'], '4.9', 'pe'),
      co('Tecnología e Informática', 'Computer Science', 2, ['4.2', '4.0', '4.3', '4.1'], '4.2', 'cs'),
    ],
  }],
  signatures: ['Director(a) de grupo', 'Rector(a)'], specimen: SPECIMEN,
};

// ── Venezuela: certificación de calificaciones, with month and year columns that look like grades ──
const veUs = by([[16, 'A'], [13, 'B'], [10, 'C']]);
const ve = (n: string, en: string, g: string, k: string, mes: string, ano: string) => c(n, en, g, k, veUs(g), { x: { letras: esWords(num(g)).toUpperCase(), te: 'F', mes, ano } });
export const veCertificacion: FakeSpec = {
  id: 've-certificacion', system: 've', country: 'Venezuela', lang: 'es', formats: ['scan-pdf'],
  layout: 'stacked', style: 'serif',
  page: { clutter: [{ at: 'top', lines: ['Código del plantel: S0000D0000 — Zona Educativa: Lara — Distrito Escolar N.º 3'] }, { at: 'bottom', title: 'Leyenda', lines: ['T-E: tipo de evaluación (F: final, R: revisión, M: materia pendiente). Escala de 1 a 20 puntos; mínimo aprobatorio 10.'] }] },
  issuer: ['REPÚBLICA BOLIVARIANA DE VENEZUELA', 'MINISTERIO DEL PODER POPULAR PARA LA EDUCACIÓN', 'U.E.N. “Cerro Pintado” — Barquisimeto'],
  title: 'CERTIFICACIÓN DE CALIFICACIONES', subtitle: 'EDUCACIÓN MEDIA GENERAL',
  info: [
    { label: 'Apellidos y nombres', value: 'MENDOZA PERDOMO, José Gregorio', role: 'name' },
    { label: 'Cédula de identidad', value: 'V-30.111.222', role: 'id' },
    { label: 'Fecha de nacimiento', value: '22/10/2006', role: 'dob' },
    { label: 'Plantel', value: 'U.E.N. “Cerro Pintado”', role: 'school' },
  ],
  student: { name: 'José Gregorio Mendoza Perdomo', dob: '2006-10-22', id: 'V-30.111.222' },
  school: { name: 'U.E.N. “Cerro Pintado”', city: 'Barquisimeto' },
  cols: [{ h: 'Asignatura', f: 'n' }, { h: 'Calif. N.º', f: 'g', align: 'c' }, { h: 'En letras', f: 'x.letras' }, { h: 'T-E', f: 'x.te', align: 'c' }, { h: 'Mes', f: 'x.mes', align: 'c' }, { h: 'Año', f: 'x.ano', align: 'c' }],
  years: [
    { label: '3er Año', level: 10, academicYear: '2020-2021', courses: [ve('Castellano', 'Spanish Language', '15', 'wl.native', '07', '2021'), ve('Matemática', 'Mathematics', '12', 'math.general', '07', '2021'), ve('Biología', 'Biology', '17', 'sci.biology', '07', '2021'), ve('Historia de Venezuela', 'History of Venezuela', '14', 'ss.history.national', '07', '2021'), ve('Inglés', 'English (foreign language)', '18', 'ela.efl', '07', '2021')] },
    { label: '4to Año', level: 11, academicYear: '2021-2022', courses: [ve('Castellano', 'Spanish Language', '16', 'wl.native', '07', '2022'), ve('Matemática', 'Mathematics', '11', 'math.general', '09', '2022'), ve('Física', 'Physics', '13', 'sci.physics', '07', '2022'), ve('Química', 'Chemistry', '14', 'sci.chemistry', '07', '2022'), ve('Educación Física', 'Physical Education', '19', 'pe', '07', '2022')] },
    { label: '5to Año', level: 12, academicYear: '2022-2023', courses: [ve('Castellano y Literatura', 'Spanish Language and Literature', '17', 'wl.native', '07', '2023'), ve('Matemática', 'Mathematics', '13', 'math.general', '07', '2023'), ve('Física', 'Physics', '10', 'sci.physics', '07', '2023'), ve('Ciencias de la Tierra', 'Earth Sciences', '15', 'sci.earth', '07', '2023'), ve('Inglés', 'English (foreign language)', '18', 'ela.efl', '07', '2023')] },
  ],
  signatures: ['Director(a) del plantel', 'Funcionario de la Zona Educativa'], specimen: SPECIMEN,
};

// ── Chile: concentración de notas, landscape, one column per year, comma decimals ──
const clUs = by([[6.0, 'A'], [4.5, 'B'], [4.0, 'C']]);
const cl = (n: string, en: string, g: string, k: string) => c(n, en, g, k, clUs(g));
export const clConcentracion: FakeSpec = {
  id: 'cl-concentracion', system: 'cl', country: 'Chile', lang: 'es', formats: ['pdf', 'scan-png'],
  layout: 'matrix', rowHeader: 'Asignatura', style: 'sans',
  page: { landscape: true, clutter: [{ at: 'bottom', lines: ['Escala de notas de 1,0 a 7,0. Nota mínima de aprobación 4,0.', 'Documento verificable con el código 0000-SPEC en el sitio del Ministerio (ficticio).'] }] },
  issuer: ['REPÚBLICA DE CHILE — MINISTERIO DE EDUCACIÓN', 'LICEO BICENTENARIO LOS AROMOS — RBD 99999-9 — VALPARAÍSO'],
  title: 'CONCENTRACIÓN DE NOTAS', subtitle: 'ENSEÑANZA MEDIA CIENTÍFICO-HUMANISTA',
  info: [
    { label: 'Nombre', value: 'ROJAS PIZARRO, Javiera Andrea', role: 'name' },
    { label: 'RUN', value: '22.333.444-K', role: 'id' },
    { label: 'Fecha de nacimiento', value: '05/05/2007', role: 'dob' },
    { label: 'Establecimiento', value: 'Liceo Bicentenario Los Aromos', role: 'school' },
  ],
  student: { name: 'Javiera Andrea Rojas Pizarro', dob: '2007-05-05', id: '22.333.444-K' },
  school: { name: 'Liceo Bicentenario Los Aromos', city: 'Valparaíso' },
  cols: [{ h: '', f: 'g', align: 'c' }],
  years: [
    { label: '1º Medio', level: 9, academicYear: '2021', courses: [cl('Lengua y Literatura', 'Spanish Language and Literature', '6,2', 'wl.native'), cl('Matemática', 'Mathematics', '6,8', 'math.general'), cl('Inglés', 'English (foreign language)', '5,9', 'ela.efl'), cl('Historia, Geografía y Ciencias Sociales', 'History, Geography and Social Sciences', '6,0', 'ss.social'), cl('Ciencias Naturales', 'Natural Sciences', '5,4', 'sci.integrated'), cl('Educación Física y Salud', 'Physical Education and Health', '7,0', 'pe')] },
    { label: '2º Medio', level: 10, academicYear: '2022', courses: [cl('Lengua y Literatura', 'Spanish Language and Literature', '5,8', 'wl.native'), cl('Matemática', 'Mathematics', '6,5', 'math.general'), cl('Inglés', 'English (foreign language)', '6,1', 'ela.efl'), cl('Historia, Geografía y Ciencias Sociales', 'History, Geography and Social Sciences', '5,5', 'ss.social'), cl('Ciencias Naturales', 'Natural Sciences', '4,9', 'sci.integrated'), cl('Educación Física y Salud', 'Physical Education and Health', '6,9', 'pe')] },
    { label: '3º Medio', level: 11, academicYear: '2023', courses: [cl('Lengua y Literatura', 'Spanish Language and Literature', '6,0', 'wl.native'), cl('Matemática', 'Mathematics', '6,3', 'math.general'), cl('Inglés', 'English (foreign language)', '6,4', 'ela.efl'), cl('Educación Ciudadana', 'Civic Education', '6,6', 'ss.civics'), cl('Filosofía', 'Philosophy', '5,7', 'ss.philosophy'), cl('Educación Física y Salud', 'Physical Education and Health', '6,8', 'pe')] },
    { label: '4º Medio', level: 12, academicYear: '2024', courses: [cl('Lengua y Literatura', 'Spanish Language and Literature', '6,3', 'wl.native'), cl('Matemática', 'Mathematics', '4,2', 'math.general'), cl('Inglés', 'English (foreign language)', '6,7', 'ela.efl'), cl('Educación Ciudadana', 'Civic Education', '6,1', 'ss.civics'), cl('Filosofía', 'Philosophy', '5,9', 'ss.philosophy'), cl('Educación Física y Salud', 'Physical Education and Health', '7,0', 'pe')] },
  ],
  signatures: ['Director(a)'], specimen: SPECIMEN,
};

// ── Peru: certificado oficial, a matrix that changes scale: 0–20 marks, then AD/A/B/C levels (CNEB, 2019 on) ──
const peUs = (g: string) => ({ AD: 'A', A: 'B', B: 'C', C: 'D' })[g] ?? by([[15, 'A'], [12, 'B'], [11, 'C']])(g);
const pe = (n: string, en: string, g: string, k: string) => c(n, en, g, k, peUs(g));
export const peCertificado: FakeSpec = {
  id: 'pe-certificado', system: 'pe', country: 'Peru', lang: 'es', formats: ['scan-jpg'],
  layout: 'matrix', rowHeader: 'Áreas curriculares', style: 'serif',
  page: { clutter: [{ at: 'bottom', title: 'Escala de calificación', lines: ['Hasta 2018: escala vigesimal (0 a 20, aprobado con 11).', 'Desde 2019: AD logro destacado, A logro esperado, B en proceso, C en inicio.'] }] },
  issuer: ['MINISTERIO DE EDUCACIÓN', 'UGEL 03 — LIMA METROPOLITANA', 'I.E. N.º 0000 “Santa Rosa de los Andes”'],
  title: 'CERTIFICADO OFICIAL DE ESTUDIOS', subtitle: 'EDUCACIÓN BÁSICA REGULAR — NIVEL SECUNDARIA',
  info: [
    { label: 'Apellidos y nombres', value: 'QUISPE HUAMÁN, Rosa Elena', role: 'name' },
    { label: 'DNI', value: '76543210', role: 'id' },
    { label: 'Fecha de nacimiento', value: '11/01/2003', role: 'dob' },
    { label: 'Institución educativa', value: 'I.E. N.º 0000 “Santa Rosa de los Andes”', role: 'school' },
  ],
  student: { name: 'Rosa Elena Quispe Huamán', dob: '2003-01-11', id: '76543210' },
  school: { name: 'I.E. N.º 0000 “Santa Rosa de los Andes”', city: 'Lima' },
  cols: [{ h: '', f: 'g', align: 'c' }],
  years: [
    { label: 'Primer grado', level: 8, academicYear: '2016', courses: [pe('Matemática', 'Mathematics', '14', 'math.general'), pe('Comunicación', 'Communication (Spanish language arts)', '16', 'wl.native'), pe('Inglés', 'English (foreign language)', '13', 'ela.efl'), pe('Ciencia, Tecnología y Ambiente', 'Science and Technology', '12', 'sci.integrated'), pe('Historia, Geografía y Economía', 'History, Geography and Economics', '15', 'ss.social')] },
    { label: 'Segundo grado', level: 9, academicYear: '2017', courses: [pe('Matemática', 'Mathematics', '15', 'math.general'), pe('Comunicación', 'Communication (Spanish language arts)', '14', 'wl.native'), pe('Inglés', 'English (foreign language)', '11', 'ela.efl'), pe('Ciencia, Tecnología y Ambiente', 'Science and Technology', '13', 'sci.integrated'), pe('Historia, Geografía y Economía', 'History, Geography and Economics', '17', 'ss.social')] },
    { label: 'Tercer grado', level: 10, academicYear: '2018', courses: [pe('Matemática', 'Mathematics', '13', 'math.general'), pe('Comunicación', 'Communication (Spanish language arts)', '15', 'wl.native'), pe('Inglés', 'English (foreign language)', '14', 'ela.efl'), pe('Ciencia, Tecnología y Ambiente', 'Science and Technology', '16', 'sci.integrated'), pe('Historia, Geografía y Economía', 'History, Geography and Economics', '12', 'ss.social')] },
    { label: 'Cuarto grado', level: 11, academicYear: '2019', courses: [pe('Matemática', 'Mathematics', 'A', 'math.general'), pe('Comunicación', 'Communication (Spanish language arts)', 'AD', 'wl.native'), pe('Inglés', 'English (foreign language)', 'B', 'ela.efl'), pe('Ciencia, Tecnología y Ambiente', 'Science and Technology', 'A', 'sci.integrated'), pe('Historia, Geografía y Economía', 'History, Geography and Economics', 'AD', 'ss.social')] },
    { label: 'Quinto grado', level: 12, academicYear: '2020', courses: [pe('Matemática', 'Mathematics', 'AD', 'math.general'), pe('Comunicación', 'Communication (Spanish language arts)', 'A', 'wl.native'), pe('Inglés', 'English (foreign language)', 'A', 'ela.efl'), pe('Ciencia, Tecnología y Ambiente', 'Science and Technology', 'B', 'sci.integrated'), pe('Historia, Geografía y Economía', 'History, Geography and Economics', 'A', 'ss.social')] },
  ],
  signatures: ['Director(a)'], specimen: SPECIMEN,
};

// ── Senegal: bulletin de notes with coefficients, weighted marks, ranks, teachers' remarks and a sidebar ──
const snUs = by([[14, 'A'], [12, 'B'], [10, 'C']]);
const sn = (n: string, en: string, coef: number, g: string, rang: string, app: string, prof: string, k: string) =>
  c(n, en, g, k, snUs(g), { x: { coef: String(coef), mxc: (num(g) * coef).toFixed(2).replace('.', ','), rang, app, prof } });
export const snBulletin: FakeSpec = {
  id: 'sn-bulletin', system: 'sn', country: 'Senegal', lang: 'fr', formats: ['pdf', 'photo-jpg'],
  layout: 'stacked', style: 'serif',
  page: {
    header: 'left',
    clutter: [
      { at: 'side', title: 'Vie scolaire', lines: ['Absences : 6 h', 'Retards : 2', 'Conduite : Bonne'] },
      { at: 'bottom', title: 'Résultats du trimestre', lines: ['Moyenne générale : 13,04 / 20 — Rang : 7e sur 52', 'Moyenne de la classe : 10,85 — Plus forte moyenne : 16,20', 'Décision du conseil : Tableau d’honneur'] },
    ],
  },
  issuer: ['RÉPUBLIQUE DU SÉNÉGAL — Un Peuple, Un But, Une Foi', 'MINISTÈRE DE L’ÉDUCATION NATIONALE — INSPECTION D’ACADÉMIE DE THIÈS', 'Lycée des Baobabs (fictif) — Thiès'],
  title: 'BULLETIN DE NOTES', subtitle: '2e trimestre — Année scolaire 2024-2025',
  info: [
    { label: 'Nom et prénom', value: 'NDIAYE Aïssatou', role: 'name' },
    { label: 'Né(e) le', value: '19/06/2008', role: 'dob' },
    { label: 'Matricule', value: 'TH-2021-00417', role: 'id' },
    { label: 'Classe', value: 'Première S2' },
    { label: 'Effectif', value: '52' },
  ],
  student: { name: 'Aïssatou Ndiaye', dob: '2008-06-19', id: 'TH-2021-00417' },
  school: { name: 'Lycée des Baobabs', city: 'Thiès' },
  cols: [{ h: 'Disciplines', f: 'n' }, { h: 'Coef.', f: 'x.coef', align: 'c' }, { h: 'Moy./20', f: 'g', align: 'c' }, { h: 'Moy. x Coef.', f: 'x.mxc', align: 'c' }, { h: 'Rang', f: 'x.rang', align: 'c' }, { h: 'Appréciation', f: 'x.app' }, { h: 'Professeur', f: 'x.prof' }],
  years: [{
    label: 'Première S2 — 2e trimestre', level: 11, term: '2', academicYear: '2024-2025', courses: [
      sn('Mathématiques', 'Mathematics', 5, '14,50', '4e', 'Bon travail', 'M. Sarr', 'math.general'),
      sn('Sciences Physiques', 'Physical Sciences (Physics and Chemistry)', 5, '12,75', '9e', 'Assez bien', 'Mme Fall', 'sci.physical'),
      sn('SVT', 'Life and Earth Sciences', 4, '15,00', '3e', 'Très bien', 'M. Diop', 'sci.biology'),
      sn('Français', 'French Language and Literature', 3, '11,25', '15e', 'Passable', 'Mme Gueye', 'wl.native'),
      sn('Anglais', 'English (foreign language)', 2, '13,50', '8e', 'Bien', 'M. Ba', 'ela.efl'),
      sn('Histoire-Géographie', 'History and Geography', 2, '10,50', '20e', 'Peut mieux faire', 'M. Kane', 'ss.social'),
      sn('Philosophie', 'Philosophy', 2, '9,00', '31e', 'Insuffisant', 'Mme Sy', 'ss.philosophy'),
      sn('EPS', 'Physical Education', 1, '16,00', '2e', 'Excellent', 'M. Faye', 'pe'),
    ],
  }],
  signatures: ['Le Professeur principal', 'Le Proviseur'], specimen: SPECIMEN,
};

// ── Guatemala: a certificate that names the student in a sentence and lists grades on dotted leaders ──
const gtUs = by([[80, 'A'], [70, 'B'], [60, 'C']]);
const gt = (n: string, en: string, g: string, k: string) => c(n, en, g, k, gtUs(g), { x: { letras: esWords(num(g)) } });
export const gtCertificado: FakeSpec = {
  id: 'gt-certificado', system: 'gt', country: 'Guatemala', lang: 'es', formats: ['pdf', 'scan-jpg'],
  layout: 'leaders', style: 'serif',
  page: {
    prose: 'El infrascrito Director del {school}, CERTIFICA: que {name}, con código personal {id}, nacido(a) el {dob}, cursó y aprobó en este establecimiento los grados del Ciclo Diversificado que a continuación se detallan, con las calificaciones siguientes:',
    clutter: [{ at: 'bottom', lines: ['Y para los usos legales que al interesado convengan, se extiende la presente en la ciudad de Quetzaltenango, a los quince días del mes de diciembre de dos mil veinticuatro.', 'Zona de calificación: 0 a 100 puntos; mínimo para aprobar 60 puntos.'] }],
  },
  issuer: ['REPÚBLICA DE GUATEMALA — MINISTERIO DE EDUCACIÓN', 'DIRECCIÓN DEPARTAMENTAL DE EDUCACIÓN DE QUETZALTENANGO'],
  title: 'CERTIFICACIÓN DE ESTUDIOS', subtitle: 'BACHILLERATO EN CIENCIAS Y LETRAS',
  info: [
    { label: 'Nombre', value: 'Carlos Enrique Xicará López', role: 'name' },
    { label: 'Código personal', value: 'A123BCD', role: 'id' },
    { label: 'Fecha de nacimiento', value: '2 de marzo de 2006', role: 'dob' },
    { label: 'Establecimiento', value: 'Instituto Nacional Mixto Las Cumbres', role: 'school' },
  ],
  student: { name: 'Carlos Enrique Xicará López', dob: '2006-03-02', id: 'A123BCD' },
  school: { name: 'Instituto Nacional Mixto Las Cumbres', city: 'Quetzaltenango' },
  cols: [{ h: 'Asignatura', f: 'n' }, { h: 'Nota', f: 'g' }, { h: 'Letras', f: 'x.letras' }],
  years: [
    { label: 'CUARTO GRADO DE BACHILLERATO — CICLO 2023', level: 11, academicYear: '2023', courses: [gt('Matemática', 'Mathematics', '78', 'math.general'), gt('Física', 'Physics', '65', 'sci.physics'), gt('Química', 'Chemistry', '82', 'sci.chemistry'), gt('Lengua y Literatura', 'Spanish Language and Literature', '88', 'wl.native'), gt('Idioma Extranjero', 'Foreign Language (English)', '91', 'ela.efl'), gt('Filosofía', 'Philosophy', '74', 'ss.philosophy')] },
    { label: 'QUINTO GRADO DE BACHILLERATO — CICLO 2024', level: 12, academicYear: '2024', courses: [gt('Matemática', 'Mathematics', '71', 'math.general'), gt('Biología', 'Biology', '86', 'sci.biology'), gt('Psicología', 'Psychology', '93', 'ss.psychology'), gt('Lengua y Literatura', 'Spanish Language and Literature', '84', 'wl.native'), gt('Estadística', 'Statistics', '62', 'math.statistics'), gt('Educación Física', 'Physical Education', '95', 'pe')] },
  ],
  signatures: ['Secretario(a)', 'Director(a)'], specimen: SPECIMEN,
};

// ── Dominican Republic: the grade printed before the subject, no ruling lines ──
const doUs = by([[90, 'A'], [80, 'B'], [70, 'C']]);
const dr = (n: string, en: string, g: string, k: string) => c(n, en, g, k, doUs(g));
export const doRecord: FakeSpec = {
  id: 'do-record', system: 'do', country: 'Dominican Republic', lang: 'es', formats: ['pdf', 'docx'],
  layout: 'stacked', style: 'sans',
  page: { rules: 'none', header: 'left', clutter: [{ at: 'top', lines: ['Regional 08 — Distrito Educativo 08-04 — Santiago de los Caballeros'] }] },
  issuer: ['REPÚBLICA DOMINICANA', 'MINISTERIO DE EDUCACIÓN (MINERD)', 'Liceo Científico Las Palmeras (ficticio)'],
  title: 'RÉCORD DE CALIFICACIONES', subtitle: 'Nivel Secundario — Modalidad Académica',
  info: [
    { label: 'Nombre del estudiante', value: 'PEÑA ALMONTE, Yarisa', role: 'name' },
    { label: 'Fecha de nacimiento', value: '30/08/2007', role: 'dob' },
    { label: 'ID SIGERD', value: '0012345678', role: 'id' },
    { label: 'Centro educativo', value: 'Liceo Científico Las Palmeras', role: 'school' },
  ],
  student: { name: 'Yarisa Peña Almonte', dob: '2007-08-30', id: '0012345678' },
  school: { name: 'Liceo Científico Las Palmeras', city: 'Santiago de los Caballeros' },
  cols: [{ h: 'Calificación', f: 'g', align: 'c' }, { h: 'Asignatura', f: 'n' }],
  years: [
    { label: '5to de Secundaria — 2022-2023', level: 11, academicYear: '2022-2023', courses: [dr('Lengua Española', 'Spanish Language', '88', 'wl.native'), dr('Matemática', 'Mathematics', '92', 'math.general'), dr('Ciencias Sociales', 'Social Studies', '79', 'ss.social'), dr('Física', 'Physics', '84', 'sci.physics'), dr('Inglés', 'English (foreign language)', '95', 'ela.efl')] },
    { label: '6to de Secundaria — 2023-2024', level: 12, academicYear: '2023-2024', courses: [dr('Lengua Española', 'Spanish Language', '90', 'wl.native'), dr('Matemática', 'Mathematics', '86', 'math.general'), dr('Química', 'Chemistry', '74', 'sci.chemistry'), dr('Biología', 'Biology', '81', 'sci.biology'), dr('Educación Física', 'Physical Education', '97', 'pe')] },
  ],
  signatures: ['Director(a) del centro'], specimen: SPECIMEN,
};

// ── Ecuador: libreta with three term columns, an average, and a qualitative scale ──
const ecUs = by([[9, 'A'], [7.5, 'B'], [6, 'C'], [5, 'D']]);
const ECQ = (g: string) => (num(g) >= 9 ? 'DA' : num(g) >= 7 ? 'AA' : num(g) >= 4.01 ? 'PA' : 'NA');
const ec = (n: string, en: string, t: string[], g: string, k: string) => c(n, en, g, k, ecUs(g), { x: { t1: t[0], t2: t[1], t3: t[2], q: ECQ(g) } });
export const ecLibreta: FakeSpec = {
  id: 'ec-libreta', system: 'ec', country: 'Ecuador', lang: 'es', formats: ['scan-jpg'],
  layout: 'stacked', style: 'sans',
  page: { clutter: [{ at: 'between', title: 'Comportamiento', table: [['Trimestre', 'Calificación'], ['1', 'A — Muy satisfactorio'], ['2', 'A — Muy satisfactorio'], ['3', 'B — Satisfactorio']] }, { at: 'bottom', lines: ['DA: domina los aprendizajes; AA: alcanza; PA: próximo a alcanzar; NA: no alcanza.'] }] },
  issuer: ['REPÚBLICA DEL ECUADOR — MINISTERIO DE EDUCACIÓN', 'Zona 9 — Distrito Educativo 17D05', 'UNIDAD EDUCATIVA FISCAL “VOLCÁN PASOCHOA” (ficticia)'],
  title: 'REPORTE DE CALIFICACIONES', subtitle: 'Tercero de Bachillerato General Unificado (3º BGU) — Año lectivo 2023-2024',
  info: [
    { label: 'Estudiante', value: 'CHALCO ANDRANGO, Mateo Sebastián', role: 'name' },
    { label: 'Cédula', value: '1712345678', role: 'id' },
    { label: 'Fecha de nacimiento', value: '17/04/2006', role: 'dob' },
    { label: 'Paralelo', value: 'B' },
  ],
  student: { name: 'Mateo Sebastián Chalco Andrango', dob: '2006-04-17', id: '1712345678' },
  school: { name: 'Unidad Educativa Fiscal “Volcán Pasochoa”', city: 'Quito' },
  cols: [{ h: 'Asignatura', f: 'n' }, { h: '1er Trimestre', f: 'x.t1', align: 'c' }, { h: '2do Trimestre', f: 'x.t2', align: 'c' }, { h: '3er Trimestre', f: 'x.t3', align: 'c' }, { h: 'Promedio Final', f: 'g', align: 'c' }, { h: 'Cualitativa', f: 'x.q', align: 'c' }],
  years: [{
    label: '3º BGU — Año lectivo 2023-2024', level: 12, academicYear: '2023-2024', courses: [
      ec('Matemática', 'Mathematics', ['8.50', '7.90', '8.80'], '8.40', 'math.general'),
      ec('Física', 'Physics', ['7.00', '6.80', '7.40'], '7.07', 'sci.physics'),
      ec('Química', 'Chemistry', ['9.20', '9.50', '9.10'], '9.27', 'sci.chemistry'),
      ec('Lengua y Literatura', 'Spanish Language and Literature', ['8.00', '8.40', '8.20'], '8.20', 'wl.native'),
      ec('Inglés', 'English (foreign language)', ['9.60', '9.80', '9.70'], '9.70', 'ela.efl'),
      ec('Historia', 'History', ['6.50', '7.10', '6.90'], '6.83', 'ss.history.world'),
      ec('Emprendimiento y Gestión', 'Entrepreneurship and Management', ['8.90', '9.00', '8.70'], '8.87', 'cte.business'),
    ],
  }],
  signatures: ['Tutor(a)', 'Rector(a)'], specimen: SPECIMEN,
};

// ── Bolivia: two years side by side, 1–100 scale ──
const boUs = by([[85, 'A'], [69, 'B'], [51, 'C']]);
const bo = (n: string, en: string, g: string, k: string) => c(n, en, g, k, boUs(g));
export const boLibreta: FakeSpec = {
  id: 'bo-libreta', system: 'bo', country: 'Bolivia', lang: 'es', formats: ['pdf', 'scan-jpg'],
  layout: 'stacked', twoUp: true, style: 'sans',
  page: { clutter: [{ at: 'bottom', lines: ['Escala de valoración: 1 a 100. Aprobación: 51. DP: desarrollo pleno (85–100); DO: óptimo (69–84); DA: aceptable (51–68); ED: en desarrollo (1–50).'] }] },
  issuer: ['ESTADO PLURINACIONAL DE BOLIVIA — MINISTERIO DE EDUCACIÓN', 'Dirección Distrital de Educación Cochabamba 1', 'Unidad Educativa “Tunari Alto” (ficticia)'],
  title: 'LIBRETA ESCOLAR ELECTRÓNICA', subtitle: 'Educación Secundaria Comunitaria Productiva',
  info: [
    { label: 'Estudiante', value: 'MAMANI CONDORI, Wilmer', role: 'name' },
    { label: 'Código RUDE', value: '80800001200042', role: 'id' },
    { label: 'Fecha de nacimiento', value: '08/12/2006', role: 'dob' },
    { label: 'Unidad educativa', value: 'Unidad Educativa “Tunari Alto”', role: 'school' },
  ],
  student: { name: 'Wilmer Mamani Condori', dob: '2006-12-08', id: '80800001200042' },
  school: { name: 'Unidad Educativa “Tunari Alto”', city: 'Cochabamba' },
  cols: [{ h: 'Área', f: 'n' }, { h: 'Nota', f: 'g', align: 'c' }],
  years: [
    { label: '5to de Secundaria — 2023', level: 11, academicYear: '2023', courses: [bo('Comunicación y Lenguajes', 'Communication and Languages', '78', 'wl.native'), bo('Lengua Extranjera', 'Foreign Language (English)', '88', 'ela.efl'), bo('Matemática', 'Mathematics', '66', 'math.general'), bo('Física', 'Physics', '59', 'sci.physics'), bo('Química', 'Chemistry', '72', 'sci.chemistry'), bo('Ciencias Sociales', 'Social Studies', '81', 'ss.social'), bo('Educación Física y Deportes', 'Physical Education and Sport', '93', 'pe')] },
    { label: '6to de Secundaria — 2024', level: 12, academicYear: '2024', courses: [bo('Comunicación y Lenguajes', 'Communication and Languages', '84', 'wl.native'), bo('Lengua Extranjera', 'Foreign Language (English)', '90', 'ela.efl'), bo('Matemática', 'Mathematics', '70', 'math.general'), bo('Física', 'Physics', '62', 'sci.physics'), bo('Química', 'Chemistry', '77', 'sci.chemistry'), bo('Ciencias Sociales', 'Social Studies', '86', 'ss.social'), bo('Educación Física y Deportes', 'Physical Education and Sport', '95', 'pe')] },
  ],
  signatures: ['Director(a)'], specimen: SPECIMEN,
};

// ── Puerto Rico: a Spanish transcript in US letters and credits, the grade in its own column per row ──
const pr = (n: string, en: string, g: string, cr: number, k: string) => c(n, en, g, k, g.replace(/[+-]/, ''), { cr });
export const prTranscripcion: FakeSpec = {
  id: 'pr-transcripcion', system: 'pr', country: 'Puerto Rico', lang: 'es', formats: ['pdf'],
  layout: 'register', yearCol: 'Grado', style: 'sans',
  page: { rules: 'rows', clutter: [{ at: 'side', title: 'Resumen', lines: ['Créditos acumulados: 10.5', 'Promedio general: 3.42', 'Índice: 3.42 / 4.00'] }] },
  issuer: ['GOBIERNO DE PUERTO RICO — DEPARTAMENTO DE EDUCACIÓN DE PUERTO RICO', 'Región Educativa de Bayamón', 'Escuela Superior Vocacional Los Flamboyanes (ficticia)'],
  title: 'TRANSCRIPCIÓN DE CRÉDITOS', subtitle: 'Escuela Superior',
  info: [
    { label: 'Nombre', value: 'RIVERA COLÓN, Gabriel Antonio', role: 'name' },
    { label: 'Número de estudiante', value: '0000123456', role: 'id' },
    { label: 'Fecha de nacimiento', value: '25/09/2007', role: 'dob' },
    { label: 'Escuela', value: 'Escuela Superior Vocacional Los Flamboyanes', role: 'school' },
  ],
  student: { name: 'Gabriel Antonio Rivera Colón', dob: '2007-09-25', id: '0000123456' },
  school: { name: 'Escuela Superior Vocacional Los Flamboyanes', city: 'Bayamón' },
  cols: [{ h: 'Curso', f: 'n' }, { h: 'Nota', f: 'g', align: 'c' }, { h: 'Créditos', f: 'cr', align: 'c' }],
  years: [
    { label: '10mo Grado', level: 10, academicYear: '2022-2023', courses: [pr('Español', 'Spanish', 'A', 1, 'wl.native'), pr('Inglés', 'English', 'B', 1, 'ela.efl'), pr('Matemáticas', 'Mathematics', 'B', 1, 'math.general'), pr('Biología', 'Biology', 'A', 1, 'sci.biology'), pr('Historia de Puerto Rico', 'History of Puerto Rico', 'C', 1, 'ss.history.national')] },
    { label: '11mo Grado', level: 11, academicYear: '2023-2024', courses: [pr('Español', 'Spanish', 'B', 1, 'wl.native'), pr('Inglés', 'English', 'A', 1, 'ela.efl'), pr('Química', 'Chemistry', 'C', 1, 'sci.chemistry'), pr('Historia de los Estados Unidos', 'US History', 'B', 1, 'ss.history.us'), pr('Educación Física', 'Physical Education', 'A', 0.5, 'pe')] },
  ],
  signatures: ['Registrador(a)', 'Director(a) escolar'], specimen: SPECIMEN,
  // Puerto Rico's public schools' language is not on file; English here is a subject, and the record is in Spanish.
  instruction: { english: null },
};

// ── The Gambia: a GABECE result printed from the online result checker, with web-page furniture around it ──
const gabWord: Record<string, string> = { '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine' };
const gabMeaning: Record<string, string> = { '1': 'EXCELLENT', '2': 'VERY GOOD', '3': 'GOOD', '4': 'CREDIT', '5': 'CREDIT', '6': 'CREDIT', '7': 'PASS', '8': 'PASS', '9': 'FAIL' };
const gabUs: Record<string, string> = { '1': 'A', '2': 'A', '3': 'B', '4': 'B', '5': 'C', '6': 'C', '7': 'D', '8': 'D', '9': 'F' };
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());
const gabC = (n: string, g: string, k: string) => c(n, titleCase(n), g, k, gabUs[g], { x: { printed: `${g}(${gabWord[g]})`, meaning: gabMeaning[g] } });
export const gmGabeceChecker: FakeSpec = {
  id: 'gm-gabece-checker', system: 'gabece', country: 'The Gambia', lang: 'en', formats: ['pdf', 'scan-jpg'],
  layout: 'slip', style: 'sans',
  page: {
    header: 'left',
    clutter: [
      { at: 'top', lines: ['Result Checker — printed 14/08/2023, 10:42 — Page 1 of 1', 'Card Serial No.: SPEC000000 — PIN used 1 of 5'] },
      { at: 'bottom', lines: ['AGGREGATE: 08 (best six subjects including English Language, Mathematics, Science and Social & Environmental Studies)', 'This result is for information only and is not a certificate. [Print] [Check another result]'] },
    ],
  },
  issuer: ['THE WEST AFRICAN EXAMINATIONS COUNCIL', 'GABECE — ONLINE RESULT'],
  title: 'GAMBIA BASIC EDUCATION CERTIFICATE EXAMINATION', subtitle: 'MAY/JUNE 2023',
  info: [
    { label: 'Candidate Name', value: 'JALLOW Fatoumata Binta', role: 'name' },
    { label: 'Exam Number', value: '3020519033', role: 'id' },
    { label: 'Date of Birth', value: '21/11/2008', role: 'dob' },
    { label: 'Centre', value: 'Brikama Sunrise Upper Basic School', role: 'school' },
  ],
  student: { name: 'Fatoumata Binta Jallow', dob: '2008-11-21', id: '3020519033' },
  school: { name: 'Brikama Sunrise Upper Basic School' },
  cols: [{ h: 'SUBJECT', f: 'n' }, { h: 'GRADE', f: 'x.printed', align: 'c' }, { h: 'INTERPRETATION', f: 'x.meaning' }],
  years: [{
    label: 'GABECE 2023', level: 9, academicYear: '2022-2023', courses: [
      gabC('ENGLISH LANGUAGE', '2', 'ela.english'), gabC('MATHEMATICS', '1', 'math.general'), gabC('SCIENCE', '1', 'sci.integrated'),
      gabC('SOCIAL AND ENVIRONMENTAL STUDIES', '1', 'ss.social'), gabC('FRENCH', '4', 'wl.other'), gabC('AGRICULTURAL SCIENCE', '2', 'cte.agriculture'),
      gabC('CHRISTIAN RELIGIOUS KNOWLEDGE', '1', 'ss.religion'), gabC('PHYSICAL AND HEALTH EDUCATION', '3', 'pe'),
    ],
  }],
  signatures: [], specimen: SPECIMEN,
};

export const specsD: FakeSpec[] = [arAnalitico, coBoletin, veCertificacion, clConcentracion, peCertificado, snBulletin, gtCertificado, doRecord, ecLibreta, boLibreta, prTranscripcion, gmGabeceChecker];
