// Fictitious transcript specifications, part B (non-English documents).
// All students and schools are invented. Do not replace with real records.
import type { FakeCourse, FakeSpec, FakeYear } from './types.ts';

const c = (n: string, en: string, g: string, k: string, us: string, extra: Partial<FakeCourse> = {}): FakeCourse => ({
  n, en, g, k, us, ...extra,
});
const SPEC = 'SPECIMEN — FICTITIOUS RECORD FOR SOFTWARE TESTING';

// ───────────────────────── China ─────────────────────────
const cnUs = (s: number) => (s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F');
const cnSubjects: [string, string, string][] = [
  ['语文', 'Chinese Language and Literature', 'wl.native'],
  ['数学', 'Mathematics', 'math.general'],
  ['英语', 'English', 'ela.efl'],
  ['物理', 'Physics', 'sci.physics'],
  ['化学', 'Chemistry', 'sci.chemistry'],
  ['生物', 'Biology', 'sci.biology'],
  ['思想政治', 'Ideology and Politics', 'ss.civics'],
  ['历史', 'History', 'ss.history.world'],
  ['地理', 'Geography', 'ss.geography'],
  ['信息技术', 'Information Technology', 'cs'],
  ['体育与健康', 'Physical Education and Health', 'pe'],
  ['音乐', 'Music', 'arts.music'],
];
const cnScores: number[][] = [
  [88, 91, 85, 87, 90, 86],
  [92, 95, 89, 93, 96, 94],
  [78, 81, 84, 80, 83, 85],
  [85, 82, 88, 90, 87, 89],
  [79, 83, 77, 81, 84, 80],
  [90, 88, 91, 86, 0, 0],
  [82, 85, 80, 84, 0, 0],
  [74, 79, 76, 81, 0, 0],
  [86, 84, 89, 87, 0, 0],
  [93, 95, 0, 0, 0, 0],
  [88, 90, 85, 92, 89, 91],
  [91, 94, 0, 0, 0, 0],
];
const cnPeriods: [string, string, number, string, string][] = [
  ['高一第一学期', '高一上', 10, '1', '2022-2023'],
  ['高一第二学期', '高一下', 10, '2', '2022-2023'],
  ['高二第一学期', '高二上', 11, '1', '2023-2024'],
  ['高二第二学期', '高二下', 11, '2', '2023-2024'],
  ['高三第一学期', '高三上', 12, '1', '2024-2025'],
  ['高三第二学期', '高三下', 12, '2', '2024-2025'],
];
const cnYears: FakeYear[] = cnPeriods.map(([label, short, level, term, ay], pi) => ({
  label, short, level, term, academicYear: ay,
  courses: cnSubjects.flatMap(([n, en, k], si) => {
    const s = cnScores[si][pi];
    return s ? [c(n, en, String(s), k, cnUs(s))] : [];
  }),
}));

export const cnGaozhong: FakeSpec = {
  id: 'cn-gaozhong',
  system: 'cn',
  country: 'China',
  lang: 'zh-Hans',
  formats: ['pdf', 'photo-jpg'],
  layout: 'matrix',
  style: 'serif',
  issuer: ['江州市青云实验中学'],
  title: '普通高中学生成绩单',
  info: [
    { label: '姓名', value: '林思远', role: 'name' },
    { label: '性别', value: '男' },
    { label: '出生日期', value: '2007年3月14日', role: 'dob' },
    { label: '学籍号', value: 'G330102200703140518', role: 'id' },
    { label: '学校', value: '江州市青云实验中学', role: 'school' },
    { label: '入学时间', value: '2022年9月' },
  ],
  student: { name: '林思远', dob: '2007-03-14', id: 'G330102200703140518' },
  school: { name: '江州市青云实验中学', city: '江州' },
  rowHeader: '科目',
  cols: [{ h: '', f: 'g', align: 'c' }],
  years: cnYears,
  notes: ['注：各科成绩均为百分制，60分为及格。', '特此证明。', '2025年6月20日'],
  signatures: ['教务处（盖章）', '校长（签字）'],
  specimen: SPEC,
};

// ───────────────────────── Mexico ─────────────────────────
const mxWords = ['CERO', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ'];
const mxUs = (g: number) => (g >= 9 ? 'A' : g >= 8 ? 'B' : g >= 6 ? 'C' : 'F');
const mx = (n: string, en: string, g: number, cr: number, k: string): FakeCourse =>
  c(n, en, String(g), k, mxUs(g), { cr, x: { letra: mxWords[g] } });

export const mxSep: FakeSpec = {
  id: 'mx-sep',
  system: 'mx-sep',
  country: 'Mexico',
  lang: 'es',
  formats: ['pdf', 'photo-jpg'],
  variants: [{ suffix: 'redacted', redact: 'xxxx', formats: ['pdf'] }],
  layout: 'stacked',
  twoUp: true,
  style: 'sans',
  issuer: ['SECRETARÍA DE EDUCACIÓN PÚBLICA', 'SUBSECRETARÍA DE EDUCACIÓN MEDIA SUPERIOR', 'DIRECCIÓN GENERAL DEL BACHILLERATO'],
  title: 'CERTIFICADO DE TERMINACIÓN DE ESTUDIOS',
  subtitle: 'BACHILLERATO GENERAL — PLAN DE ESTUDIOS SEMESTRAL',
  info: [
    { label: 'Nombre del alumno', value: 'HERNÁNDEZ ZAVALA DIEGO ALEJANDRO', role: 'name' },
    { label: 'CURP', value: 'HEZD070921HJCRVG04', role: 'id' },
    { label: 'Fecha de nacimiento', value: '21 de septiembre de 2007', role: 'dob' },
    { label: 'Plantel', value: 'Preparatoria Valle de Atemajac', role: 'school' },
    { label: 'Clave del centro de trabajo', value: '14PBH9917Q' },
    { label: 'Lugar y fecha de expedición', value: 'Zapopan, Jalisco, a 11 de julio de 2025', role: 'issued' },
  ],
  student: { name: 'Diego Alejandro Hernández Zavala', dob: '2007-09-21', id: 'HEZD070921HJCRVG04' },
  school: { name: 'Preparatoria Valle de Atemajac', city: 'Zapopan' },
  cols: [
    { h: 'ASIGNATURA', f: 'n' },
    { h: 'CALIF.', f: 'g', align: 'c' },
    { h: 'LETRA', f: 'x.letra' },
    { h: 'CRÉDITOS', f: 'cr', align: 'c' },
  ],
  years: [
    {
      label: 'PRIMER SEMESTRE', level: 10, term: '1', academicYear: '2022-2023',
      courses: [
        mx('Matemáticas I', 'Mathematics I', 8, 10, 'math.algebra1'),
        mx('Química I', 'Chemistry I', 7, 10, 'sci.chemistry'),
        mx('Ética I', 'Ethics I', 9, 6, 'ss.philosophy'),
        mx('Metodología de la Investigación', 'Research Methodology', 9, 6, 'elective.other'),
        mx('Taller de Lectura y Redacción I', 'Reading and Writing Workshop I', 8, 8, 'wl.native'),
        mx('Inglés I', 'English I', 10, 6, 'ela.efl'),
        mx('Informática I', 'Computer Science I', 10, 6, 'cs'),
      ],
    },
    {
      label: 'SEGUNDO SEMESTRE', level: 10, term: '2', academicYear: '2022-2023',
      courses: [
        mx('Matemáticas II', 'Mathematics II', 7, 10, 'math.geometry'),
        mx('Química II', 'Chemistry II', 8, 10, 'sci.chemistry'),
        mx('Ética II', 'Ethics II', 9, 6, 'ss.philosophy'),
        mx('Introducción a las Ciencias Sociales', 'Introduction to Social Sciences', 8, 6, 'ss.social'),
        mx('Taller de Lectura y Redacción II', 'Reading and Writing Workshop II', 9, 8, 'wl.native'),
        mx('Inglés II', 'English II', 10, 6, 'ela.efl'),
        mx('Informática II', 'Computer Science II', 9, 6, 'cs'),
      ],
    },
    {
      label: 'TERCER SEMESTRE', level: 11, term: '1', academicYear: '2023-2024',
      courses: [
        mx('Matemáticas III', 'Mathematics III', 6, 10, 'math.algebra2'),
        mx('Biología I', 'Biology I', 8, 8, 'sci.biology'),
        mx('Física I', 'Physics I', 7, 10, 'sci.physics'),
        mx('Historia de México I', 'History of Mexico I', 9, 6, 'ss.history.national'),
        mx('Literatura I', 'Literature I', 8, 6, 'wl.native'),
        mx('Inglés III', 'English III', 9, 6, 'ela.efl'),
      ],
    },
    {
      label: 'CUARTO SEMESTRE', level: 11, term: '2', academicYear: '2023-2024',
      courses: [
        mx('Matemáticas IV', 'Mathematics IV', 7, 10, 'math.precalc'),
        mx('Biología II', 'Biology II', 9, 8, 'sci.biology'),
        mx('Física II', 'Physics II', 6, 10, 'sci.physics'),
        mx('Historia de México II', 'History of Mexico II', 8, 6, 'ss.history.national'),
        mx('Literatura II', 'Literature II', 9, 6, 'wl.native'),
        mx('Inglés IV', 'English IV', 10, 6, 'ela.efl'),
      ],
    },
    {
      label: 'QUINTO SEMESTRE', level: 12, term: '1', academicYear: '2024-2025',
      courses: [
        mx('Geografía', 'Geography', 9, 6, 'ss.geography'),
        mx('Estructura Socioeconómica de México', 'Socioeconomic Structure of Mexico', 8, 6, 'ss.economics'),
        mx('Cálculo Diferencial', 'Differential Calculus', 7, 6, 'math.calculus'),
        mx('Temas Selectos de Química I', 'Selected Topics in Chemistry I', 8, 6, 'sci.chemistry'),
        mx('Probabilidad y Estadística I', 'Probability and Statistics I', 9, 6, 'math.statistics'),
      ],
    },
    {
      label: 'SEXTO SEMESTRE', level: 12, term: '2', academicYear: '2024-2025',
      courses: [
        mx('Filosofía', 'Philosophy', 9, 6, 'ss.philosophy'),
        mx('Ecología y Medio Ambiente', 'Ecology and Environment', 10, 6, 'sci.environmental'),
        mx('Historia Universal Contemporánea', 'Contemporary World History', 8, 6, 'ss.history.world'),
        mx('Cálculo Integral', 'Integral Calculus', 6, 6, 'math.calculus'),
        mx('Probabilidad y Estadística II', 'Probability and Statistics II', 8, 6, 'math.statistics'),
      ],
    },
  ],
  notes: [
    'La escala de calificaciones es de 5 a 10, siendo 6 la mínima aprobatoria.',
    'El presente certificado ampara 244 créditos de un total de 244 del plan de estudios. PROMEDIO GENERAL: 8.3',
    'Este documento no es válido si presenta raspaduras o enmendaduras.',
  ],
  signatures: ['Director del Plantel', 'Jefe de Control Escolar'],
  specimen: SPEC,
};

// ───────────────────────── France ─────────────────────────
const frUs = (g: number) => (g >= 14 ? 'A' : g >= 12 ? 'B' : g >= 10 ? 'C' : 'F');
const fr = (n: string, en: string, g: number, cls: number, app: string, k: string): FakeCourse =>
  c(n, en, g.toFixed(1).replace('.', ','), k, frUs(g), { x: { cls: cls.toFixed(1).replace('.', ','), app } });

export const frLycee: FakeSpec = {
  id: 'fr-lycee',
  system: 'fr',
  country: 'France',
  lang: 'fr',
  formats: ['scan-pdf'],
  layout: 'stacked',
  style: 'sans',
  issuer: ['ACADÉMIE DE LYON', 'LYCÉE GÉNÉRAL ET TECHNOLOGIQUE DES TROIS RIVIÈRES', '14 rue des Tanneurs, 69400 Villefranche-sur-Saône'],
  title: 'RELEVÉ DE NOTES ANNUEL',
  info: [
    { label: 'Élève', value: 'BENMANSOUR Inès', role: 'name' },
    { label: 'Né(e) le', value: '2 février 2008', role: 'dob' },
    { label: 'INE', value: '081547263HK', role: 'id' },
    { label: 'Établissement', value: 'Lycée des Trois Rivières', role: 'school' },
    { label: 'Voie', value: 'Générale' },
  ],
  student: { name: 'Inès Benmansour', dob: '2008-02-02', id: '081547263HK' },
  school: { name: 'Lycée des Trois Rivières', city: 'Villefranche-sur-Saône' },
  cols: [
    { h: 'Matières', f: 'n' },
    { h: 'Moyenne élève /20', f: 'g', align: 'c' },
    { h: 'Moyenne classe', f: 'x.cls', align: 'c' },
    { h: 'Appréciations', f: 'x.app' },
  ],
  years: [
    {
      label: 'Classe de Seconde générale et technologique — Année scolaire 2022-2023', level: 10, academicYear: '2022-2023',
      courses: [
        fr('Français', 'French', 13.5, 11.2, 'Élève sérieuse, bon travail à l’écrit.', 'wl.native'),
        fr('Histoire-Géographie', 'History-Geography', 14.0, 11.8, 'Très bon ensemble.', 'ss.history.world'),
        fr('Mathématiques', 'Mathematics', 11.5, 10.4, 'Des progrès, à poursuivre.', 'math.general'),
        fr('Physique-Chimie', 'Physics-Chemistry', 12.0, 10.9, 'Assez bien.', 'sci.physical'),
        fr('Sciences de la vie et de la Terre', 'Life and Earth Sciences', 15.5, 12.1, 'Excellente participation.', 'sci.biology'),
        fr('LVA Anglais', 'Modern Language A: English', 16.0, 12.6, 'Très bon niveau à l’oral.', 'ela.efl'),
        fr('LVB Espagnol', 'Modern Language B: Spanish', 12.5, 11.7, 'Ensemble correct.', 'wl.other'),
        fr('Sciences économiques et sociales', 'Economic and Social Sciences', 13.0, 11.5, 'Bon trimestre.', 'ss.economics'),
        fr('Sciences numériques et technologie', 'Digital Sciences and Technology', 17.0, 13.4, 'Excellent.', 'cs'),
        fr('Éducation physique et sportive', 'Physical Education and Sport', 14.5, 13.8, 'Bonne implication.', 'pe'),
        fr('Enseignement moral et civique', 'Moral and Civic Education', 15.0, 13.2, 'Bien.', 'ss.civics'),
      ],
    },
    {
      label: 'Classe de Première générale — Année scolaire 2023-2024', level: 11, academicYear: '2023-2024', pageBreak: true,
      courses: [
        fr('Français', 'French', 12.5, 10.8, 'Travail régulier.', 'wl.native'),
        fr('Histoire-Géographie', 'History-Geography', 13.5, 11.4, 'Bon travail.', 'ss.history.world'),
        fr('Enseignement scientifique', 'Scientific Education', 14.0, 11.9, 'Bien.', 'sci.integrated'),
        fr('LVA Anglais', 'Modern Language A: English', 16.5, 12.9, 'Excellent niveau.', 'ela.efl'),
        fr('LVB Espagnol', 'Modern Language B: Spanish', 11.0, 11.3, 'Doit participer davantage.', 'wl.other'),
        fr('Éducation physique et sportive', 'Physical Education and Sport', 15.0, 13.5, 'Très bien.', 'pe'),
        fr('Enseignement moral et civique', 'Moral and Civic Education', 14.5, 13.0, 'Bien.', 'ss.civics'),
        fr('Spécialité Mathématiques', 'Specialty: Mathematics', 9.5, 10.1, 'Résultats fragiles, ne pas se décourager.', 'math.advanced'),
        fr('Spécialité Physique-Chimie', 'Specialty: Physics-Chemistry', 11.5, 10.7, 'Assez bien.', 'sci.physical'),
        fr('Spécialité Sciences de la vie et de la Terre', 'Specialty: Life and Earth Sciences', 15.0, 11.6, 'Très bon travail.', 'sci.biology'),
      ],
    },
    {
      label: 'Classe de Terminale générale — Année scolaire 2024-2025', level: 12, academicYear: '2024-2025', pageBreak: true,
      courses: [
        fr('Philosophie', 'Philosophy', 11.0, 10.2, 'Réflexion intéressante.', 'ss.philosophy'),
        fr('Histoire-Géographie', 'History-Geography', 14.5, 11.6, 'Très bon ensemble.', 'ss.history.world'),
        fr('Enseignement scientifique', 'Scientific Education', 13.5, 11.8, 'Bien.', 'sci.integrated'),
        fr('LVA Anglais', 'Modern Language A: English', 17.0, 13.1, 'Excellent.', 'ela.efl'),
        fr('LVB Espagnol', 'Modern Language B: Spanish', 12.0, 11.5, 'Correct.', 'wl.other'),
        fr('Éducation physique et sportive', 'Physical Education and Sport', 15.5, 13.9, 'Très bien.', 'pe'),
        fr('Spécialité Physique-Chimie', 'Specialty: Physics-Chemistry', 7.5, 10.3, 'Trimestre difficile.', 'sci.physical'),
        fr('Spécialité Sciences de la vie et de la Terre', 'Specialty: Life and Earth Sciences', 15.5, 11.9, 'Excellent travail.', 'sci.biology'),
      ],
    },
  ],
  notes: ['Notes sur 20. La moyenne est de 10/20.', 'Document édité le 4 juillet 2025 — à conserver précieusement, aucun duplicata ne sera délivré.'],
  signatures: ['Le Proviseur'],
  specimen: SPEC,
};

// ───────────────────────── Germany ─────────────────────────
const deWordUs: Record<string, string> = { 'sehr gut': 'A', gut: 'A', befriedigend: 'B', ausreichend: 'C', mangelhaft: 'D', 'ungenügend': 'F' };
const deW = (n: string, en: string, g: string, k: string): FakeCourse => c(n, en, g, k, deWordUs[g]);
const dePtUs = (p: number) => (p >= 10 ? 'A' : p >= 7 ? 'B' : p >= 4 ? 'C' : p >= 1 ? 'D' : 'F');
const deP = (n: string, en: string, p: number, k: string): FakeCourse => c(n, en, String(p).padStart(2, '0'), k, dePtUs(p));

export const deAbitur: FakeSpec = {
  id: 'de-gymnasium',
  system: 'de',
  country: 'Germany',
  lang: 'de',
  formats: ['pdf', 'docx'],
  layout: 'stacked',
  style: 'serif',
  issuer: ['Freie und Hansestadt — Behörde für Schule', 'Gymnasium am Lindenhof', 'Staatlich anerkanntes Gymnasium'],
  title: 'ZEUGNIS',
  subtitle: 'Übersicht der Leistungen in der gymnasialen Oberstufe',
  info: [
    { label: 'Vor- und Zuname', value: 'Jonas Maximilian Wiśniewski', role: 'name' },
    { label: 'geboren am', value: '19.10.2007', role: 'dob' },
    { label: 'in', value: 'Lübeck' },
    { label: 'Schule', value: 'Gymnasium am Lindenhof', role: 'school' },
    { label: 'Schülernummer', value: '2019-0417', role: 'id' },
  ],
  student: { name: 'Jonas Maximilian Wiśniewski', dob: '2007-10-19', id: '2019-0417' },
  school: { name: 'Gymnasium am Lindenhof' },
  cols: [
    { h: 'Fach', f: 'n' },
    { h: 'Note / Punkte', f: 'g', align: 'c' },
  ],
  years: [
    {
      label: 'Jahreszeugnis Klasse 10 (Einführungsphase) — Schuljahr 2022/2023', level: 10, academicYear: '2022-2023',
      courses: [
        deW('Deutsch', 'German', 'gut', 'wl.native'),
        deW('Englisch', 'English', 'sehr gut', 'ela.efl'),
        deW('Französisch', 'French', 'befriedigend', 'wl.other'),
        deW('Mathematik', 'Mathematics', 'befriedigend', 'math.general'),
        deW('Biologie', 'Biology', 'gut', 'sci.biology'),
        deW('Chemie', 'Chemistry', 'ausreichend', 'sci.chemistry'),
        deW('Physik', 'Physics', 'befriedigend', 'sci.physics'),
        deW('Geschichte', 'History', 'gut', 'ss.history.world'),
        deW('Erdkunde', 'Geography', 'gut', 'ss.geography'),
        deW('Politik und Wirtschaft', 'Politics and Economics', 'sehr gut', 'ss.civics'),
        deW('Kunst', 'Art', 'gut', 'arts.visual'),
        deW('Sport', 'Physical Education', 'sehr gut', 'pe'),
        deW('Ethik', 'Ethics', 'gut', 'ss.philosophy'),
      ],
    },
    {
      label: 'Qualifikationsphase 1 (Jahrgangsstufe 11) — Schuljahr 2023/2024', level: 11, academicYear: '2023-2024', pageBreak: true,
      courses: [
        deP('Deutsch', 'German', 11, 'wl.native'),
        deP('Englisch (Leistungskurs)', 'English (advanced course)', 13, 'ela.efl'),
        deP('Mathematik', 'Mathematics', 8, 'math.general'),
        deP('Biologie (Leistungskurs)', 'Biology (advanced course)', 12, 'sci.biology'),
        deP('Chemie', 'Chemistry', 5, 'sci.chemistry'),
        deP('Geschichte', 'History', 10, 'ss.history.world'),
        deP('Politik und Wirtschaft', 'Politics and Economics', 14, 'ss.civics'),
        deP('Informatik', 'Computer Science', 9, 'cs'),
        deP('Sport', 'Physical Education', 13, 'pe'),
      ],
    },
  ],
  notes: [
    'Notenstufen: sehr gut (1), gut (2), befriedigend (3), ausreichend (4), mangelhaft (5), ungenügend (6).',
    'In der Qualifikationsphase werden die Leistungen in Punkten bewertet: 15–13 sehr gut, 12–10 gut, 9–7 befriedigend, 6–4 ausreichend, 3–1 mangelhaft, 0 ungenügend.',
    'Ausgestellt am 12. Juli 2024',
  ],
  signatures: ['Schulleiter/in', 'Tutor/in'],
  specimen: SPEC,
};

// ───────────────────────── Brazil ─────────────────────────
const brUs = (g: number) => (g >= 9 ? 'A' : g >= 7 ? 'B' : g >= 6 ? 'C' : g >= 5 ? 'D' : 'F');
const br = (n: string, en: string, g: number, h: number, k: string): FakeCourse =>
  c(n, en, g.toFixed(1).replace('.', ','), k, brUs(g), { h });
const brRows: [string, string, string, number[], number[]][] = [
  ['Língua Portuguesa', 'Portuguese Language', 'wl.native', [7.5, 8.0, 8.5], [160, 160, 120]],
  ['Matemática', 'Mathematics', 'math.general', [6.0, 6.5, 7.0], [160, 160, 120]],
  ['Biologia', 'Biology', 'sci.biology', [8.5, 9.0, 9.5], [80, 80, 80]],
  ['Física', 'Physics', 'sci.physics', [5.5, 6.0, 7.5], [80, 80, 80]],
  ['Química', 'Chemistry', 'sci.chemistry', [7.0, 6.5, 8.0], [80, 80, 80]],
  ['História', 'History', 'ss.history.world', [9.0, 8.5, 9.0], [80, 80, 40]],
  ['Geografia', 'Geography', 'ss.geography', [8.0, 8.5, 9.5], [80, 80, 40]],
  ['Sociologia', 'Sociology', 'ss.sociology', [9.5, 9.0, 10.0], [40, 40, 40]],
  ['Filosofia', 'Philosophy', 'ss.philosophy', [8.0, 7.5, 9.0], [40, 40, 40]],
  ['Língua Inglesa', 'English Language', 'ela.efl', [10.0, 9.5, 10.0], [80, 80, 80]],
  ['Arte', 'Art', 'arts.visual', [9.0, 9.5, 0], [40, 40, 0]],
  ['Educação Física', 'Physical Education', 'pe', [10.0, 10.0, 9.5], [80, 80, 40]],
];
const brYears: FakeYear[] = [
  ['1ª Série — 2022', '1ª Série', 10, '2022'],
  ['2ª Série — 2023', '2ª Série', 11, '2023'],
  ['3ª Série — 2024', '3ª Série', 12, '2024'],
].map(([label, short, level, ay], yi) => ({
  label: label as string, short: short as string, level: level as number, academicYear: ay as string,
  courses: brRows.flatMap(([n, en, k, gs, hs]) => (gs[yi] ? [br(n, en, gs[yi], hs[yi], k)] : [])),
}));

export const brHistorico: FakeSpec = {
  id: 'br-historico',
  system: 'br',
  country: 'Brazil',
  lang: 'pt-BR',
  formats: ['scan-jpg', 'docx'],
  variants: [{ suffix: 'redacted', redact: 'tag', formats: ['docx'] }],
  layout: 'matrix',
  style: 'sans',
  issuer: ['GOVERNO DO ESTADO — SECRETARIA DE ESTADO DA EDUCAÇÃO', 'COLÉGIO ESTADUAL SERRA DO IPÊ', 'Rua das Acácias, 480 — Centro — Londrina/PR'],
  title: 'HISTÓRICO ESCOLAR — ENSINO MÉDIO',
  info: [
    { label: 'Nome do(a) aluno(a)', value: 'Rafaela Cristina Nogueira de Almeida', role: 'name' },
    { label: 'Data de nascimento', value: '08/05/2007', role: 'dob' },
    { label: 'Naturalidade', value: 'Londrina — PR' },
    { label: 'RG', value: '14.882.073-5', role: 'id' },
    { label: 'Estabelecimento de ensino', value: 'Colégio Estadual Serra do Ipê', role: 'school' },
  ],
  student: { name: 'Rafaela Cristina Nogueira de Almeida', dob: '2007-05-08', id: '14.882.073-5' },
  school: { name: 'Colégio Estadual Serra do Ipê', city: 'Londrina' },
  rowHeader: 'Componentes Curriculares',
  cols: [
    { h: 'Nota', f: 'g', align: 'c' },
    { h: 'C.H.', f: 'h', align: 'c' },
  ],
  years: brYears,
  notes: [
    'C.H. = carga horária anual, em horas. Notas de 0 a 10; média mínima para aprovação: 6,0.',
    'Resultado final: APROVADA nas três séries. Certificamos a conclusão do Ensino Médio em 2024.',
    'Londrina, 18 de dezembro de 2024.',
  ],
  signatures: ['Secretário(a) Escolar', 'Diretor(a)'],
  specimen: SPEC,
};

// ───────────────────────── South Korea ─────────────────────────
const krUs: Record<string, string> = { A: 'A', B: 'A', C: 'B', D: 'C', E: 'D' };
const kr = (area: string, n: string, en: string, cr: number, raw: string, ach: string, rank: string, k: string): FakeCourse =>
  c(n, en, ach, k, krUs[ach], { cr, x: { area, raw, ach: `${ach}(287)`, rank } });

export const krRecord: FakeSpec = {
  id: 'kr-record',
  system: 'kr',
  country: 'South Korea',
  lang: 'ko',
  formats: ['scan-jpg', 'pdf'],
  layout: 'stacked',
  style: 'sans',
  issuer: ['한빛누리고등학교'],
  title: '학교생활기록부 (교과학습발달상황)',
  info: [
    { label: '성명', value: '박서윤', role: 'name' },
    { label: '생년월일', value: '2008년 7월 3일', role: 'dob' },
    { label: '학번', value: '20231107', role: 'id' },
    { label: '학교명', value: '한빛누리고등학교', role: 'school' },
    { label: '발급일', value: '2025년 2월 14일', role: 'issued' },
  ],
  student: { name: '박서윤', dob: '2008-07-03', id: '20231107' },
  school: { name: '한빛누리고등학교' },
  cols: [
    { h: '교과', f: 'x.area' },
    { h: '과목', f: 'n' },
    { h: '단위수', f: 'cr', align: 'c' },
    { h: '원점수/과목평균(표준편차)', f: 'x.raw', align: 'c' },
    { h: '성취도(수강자수)', f: 'x.ach', align: 'c' },
    { h: '석차등급', f: 'x.rank', align: 'c' },
  ],
  years: [
    {
      label: '1학년 1학기', level: 10, term: '1', academicYear: '2023',
      courses: [
        kr('국어', '국어', 'Korean Language', 4, '88/67.4(16.2)', 'B', '3', 'wl.native'),
        kr('수학', '수학', 'Mathematics', 4, '93/61.8(19.5)', 'A', '2', 'math.general'),
        kr('영어', '영어', 'English', 4, '91/66.0(18.1)', 'A', '2', 'ela.efl'),
        kr('한국사', '한국사', 'Korean History', 3, '84/70.3(14.9)', 'B', '4', 'ss.history.national'),
        kr('사회', '통합사회', 'Integrated Social Studies', 4, '79/68.8(15.7)', 'C', '4', 'ss.social'),
        kr('과학', '통합과학', 'Integrated Science', 4, '95/64.1(17.3)', 'A', '1', 'sci.integrated'),
        kr('체육', '체육', 'Physical Education', 2, '92/85.6(7.0)', 'A', '', 'pe'),
        kr('예술', '음악', 'Music', 2, '90/83.2(8.4)', 'A', '', 'arts.music'),
      ],
    },
    {
      label: '1학년 2학기', level: 10, term: '2', academicYear: '2023',
      courses: [
        kr('국어', '국어', 'Korean Language', 4, '85/66.9(15.8)', 'B', '3', 'wl.native'),
        kr('수학', '수학', 'Mathematics', 4, '90/60.2(20.1)', 'A', '2', 'math.general'),
        kr('영어', '영어', 'English', 4, '94/65.5(18.6)', 'A', '1', 'ela.efl'),
        kr('한국사', '한국사', 'Korean History', 3, '81/69.7(15.2)', 'B', '4', 'ss.history.national'),
        kr('사회', '통합사회', 'Integrated Social Studies', 4, '83/69.0(15.0)', 'B', '3', 'ss.social'),
        kr('과학', '통합과학', 'Integrated Science', 4, '92/63.3(17.9)', 'A', '2', 'sci.integrated'),
        kr('과학', '과학탐구실험', 'Science Inquiry Experiments', 1, '96/88.0(6.1)', 'A', '', 'sci.integrated'),
        kr('체육', '체육', 'Physical Education', 2, '94/86.1(6.8)', 'A', '', 'pe'),
        kr('예술', '미술', 'Art', 2, '88/82.5(8.9)', 'B', '', 'arts.visual'),
      ],
    },
    {
      label: '2학년 1학기', level: 11, term: '1', academicYear: '2024',
      courses: [
        kr('국어', '문학', 'Literature', 4, '86/65.1(16.6)', 'B', '3', 'wl.native'),
        kr('수학', '수학Ⅰ', 'Mathematics I', 4, '89/58.7(21.0)', 'B', '2', 'math.algebra2'),
        kr('영어', '영어Ⅰ', 'English I', 4, '92/64.4(18.8)', 'A', '2', 'ela.efl'),
        kr('사회', '세계지리', 'World Geography', 3, '77/66.2(16.0)', 'C', '4', 'ss.geography'),
        kr('과학', '물리학Ⅰ', 'Physics I', 3, '90/59.9(19.2)', 'A', '2', 'sci.physics'),
        kr('과학', '화학Ⅰ', 'Chemistry I', 3, '68/60.4(18.4)', 'D', '5', 'sci.chemistry'),
        kr('과학', '생명과학Ⅰ', 'Life Science I', 3, '93/62.7(17.7)', 'A', '2', 'sci.biology'),
        kr('제2외국어', '일본어Ⅰ', 'Japanese I', 3, '95/71.5(15.3)', 'A', '1', 'wl.other'),
        kr('기술·가정', '정보', 'Informatics', 2, '97/74.8(13.9)', 'A', '1', 'cs'),
      ],
    },
  ],
  notes: ['성취도: A(90점 이상), B(80점 이상), C(70점 이상), D(60점 이상), E(60점 미만).', '위 사실을 증명함.'],
  signatures: ['한빛누리고등학교장 (직인)'],
  specimen: SPEC,
};

// ───────────────────────── Vietnam ─────────────────────────
const vnUs = (g: number) => (g >= 8 ? 'A' : g >= 6 ? 'B' : g >= 5 ? 'C' : 'F');
const vn = (n: string, en: string, h1: number, h2: number, k: string): FakeCourse => {
  const cn = Math.round(((h1 + 2 * h2) / 3) * 10) / 10;
  const f = (v: number) => v.toFixed(1).replace('.', ',');
  return c(n, en, f(cn), k, vnUs(cn), { x: { h1: f(h1), h2: f(h2) } });
};
const vnPass = (n: string, en: string, k: string): FakeCourse => c(n, en, 'Đ', k, 'P', { x: { h1: 'Đ', h2: 'Đ' } });

export const vnHocba: FakeSpec = {
  id: 'vn-hocba',
  system: 'vn',
  country: 'Vietnam',
  lang: 'vi',
  formats: ['pdf', 'scan-jpg'],
  layout: 'stacked',
  style: 'serif',
  issuer: ['SỞ GIÁO DỤC VÀ ĐÀO TẠO', 'TRƯỜNG THPT SÔNG HƯƠNG XANH'],
  title: 'HỌC BẠ TRUNG HỌC PHỔ THÔNG',
  subtitle: 'BẢNG KẾT QUẢ HỌC TẬP',
  info: [
    { label: 'Họ và tên', value: 'Trần Ngọc Khánh Linh', role: 'name' },
    { label: 'Giới tính', value: 'Nữ' },
    { label: 'Ngày sinh', value: '11 tháng 01 năm 2008', role: 'dob' },
    { label: 'Mã học sinh', value: '4601208815', role: 'id' },
    { label: 'Trường', value: 'THPT Sông Hương Xanh', role: 'school' },
  ],
  student: { name: 'Trần Ngọc Khánh Linh', dob: '2008-01-11', id: '4601208815' },
  school: { name: 'THPT Sông Hương Xanh' },
  cols: [
    { h: 'Môn học', f: 'n' },
    { h: 'Học kỳ I', f: 'x.h1', align: 'c' },
    { h: 'Học kỳ II', f: 'x.h2', align: 'c' },
    { h: 'Cả năm', f: 'g', align: 'c' },
  ],
  years: [
    {
      label: 'Lớp 10 — Năm học 2023 - 2024', level: 10, academicYear: '2023-2024',
      courses: [
        vn('Toán', 'Mathematics', 7.8, 8.4, 'math.general'),
        vn('Ngữ văn', 'Vietnamese Literature', 7.2, 7.5, 'wl.native'),
        vn('Tiếng Anh', 'English', 9.1, 9.4, 'ela.efl'),
        vn('Vật lí', 'Physics', 6.4, 7.0, 'sci.physics'),
        vn('Hóa học', 'Chemistry', 6.0, 6.3, 'sci.chemistry'),
        vn('Sinh học', 'Biology', 8.2, 8.6, 'sci.biology'),
        vn('Lịch sử', 'History', 7.9, 8.1, 'ss.history.world'),
        vn('Địa lí', 'Geography', 8.5, 8.8, 'ss.geography'),
        vn('Giáo dục kinh tế và pháp luật', 'Economic and Legal Education', 8.9, 9.0, 'ss.civics'),
        vn('Tin học', 'Informatics', 9.3, 9.5, 'cs'),
        vnPass('Giáo dục thể chất', 'Physical Education', 'pe'),
        vn('Giáo dục quốc phòng và an ninh', 'National Defense and Security Education', 8.0, 8.5, 'elective.other'),
      ],
    },
    {
      label: 'Lớp 11 — Năm học 2024 - 2025', level: 11, academicYear: '2024-2025',
      courses: [
        vn('Toán', 'Mathematics', 8.0, 8.3, 'math.general'),
        vn('Ngữ văn', 'Vietnamese Literature', 6.8, 7.4, 'wl.native'),
        vn('Tiếng Anh', 'English', 9.3, 9.6, 'ela.efl'),
        vn('Vật lí', 'Physics', 5.9, 6.2, 'sci.physics'),
        vn('Hóa học', 'Chemistry', 4.6, 5.1, 'sci.chemistry'),
        vn('Sinh học', 'Biology', 8.4, 8.9, 'sci.biology'),
        vn('Lịch sử', 'History', 7.5, 7.7, 'ss.history.world'),
        vn('Địa lí', 'Geography', 8.1, 8.4, 'ss.geography'),
        vn('Giáo dục kinh tế và pháp luật', 'Economic and Legal Education', 8.6, 9.1, 'ss.civics'),
        vn('Tin học', 'Informatics', 9.0, 9.4, 'cs'),
        vnPass('Giáo dục thể chất', 'Physical Education', 'pe'),
      ],
    },
  ],
  notes: ['Thang điểm 10. Đ: Đạt; CĐ: Chưa đạt.', 'Xác nhận của nhà trường: Học sinh đã hoàn thành chương trình lớp 11, được lên lớp 12.'],
  signatures: ['Giáo viên chủ nhiệm', 'Hiệu trưởng (ký tên, đóng dấu)'],
  specimen: SPEC,
};

// ───────────────────────── Egypt (Arabic) ─────────────────────────
const arDigits = (s: string) => s.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
const genericUs = (pct: number) => (pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F');
const egUs = (pct: number) => (pct >= 90 ? 'A' : pct >= 65 ? 'B' : pct >= 50 ? 'C' : 'F');
const eg = (n: string, en: string, mark: number, max: number, k: string): FakeCourse =>
  c(n, en, String(mark), k, egUs((mark / max) * 100), { x: { gp: arDigits(String(mark)), max: arDigits(String(max)), min: arDigits(String(max / 2)) } });

export const egThanaweya: FakeSpec = {
  id: 'eg-thanaweya',
  system: 'eg',
  country: 'Egypt',
  lang: 'ar',
  rtl: true,
  formats: ['pdf', 'scan-png'],
  layout: 'slip',
  style: 'serif',
  issuer: ['جمهورية مصر العربية', 'وزارة التربية والتعليم والتعليم الفني', 'الإدارة العامة للامتحانات'],
  title: 'بيان درجات شهادة إتمام الدراسة الثانوية العامة',
  subtitle: 'العام الدراسي ٢٠٢٤ / ٢٠٢٥ — الشعبة العلمية (علوم)',
  info: [
    { label: 'اسم الطالب', value: 'يوسف أحمد عبد الرحمن الشناوي', role: 'name' },
    { label: 'رقم الجلوس', value: arDigits('318642'), role: 'id' },
    { label: 'تاريخ الميلاد', value: arDigits('2007/04/25'), role: 'dob' },
    { label: 'المدرسة', value: 'مدرسة النيل الجديدة الثانوية بنين', role: 'school' },
    { label: 'الإدارة التعليمية', value: 'شرق المنصورة' },
  ],
  student: { name: 'يوسف أحمد عبد الرحمن الشناوي', dob: '2007-04-25', id: '318642' },
  school: { name: 'مدرسة النيل الجديدة الثانوية بنين' },
  cols: [
    { h: 'المادة', f: 'n' },
    { h: 'النهاية العظمى', f: 'x.max', align: 'c' },
    { h: 'النهاية الصغرى', f: 'x.min', align: 'c' },
    { h: 'درجة الطالب', f: 'x.gp', align: 'c' },
  ],
  years: [
    {
      label: 'الصف الثالث الثانوي', level: 12, academicYear: '2024-2025',
      courses: [
        eg('اللغة العربية', 'Arabic Language', 68, 80, 'wl.native'),
        eg('اللغة الأجنبية الأولى (الإنجليزية)', 'First Foreign Language (English)', 46, 50, 'ela.efl'),
        eg('اللغة الأجنبية الثانية (الفرنسية)', 'Second Foreign Language (French)', 34, 40, 'wl.other'),
        eg('الكيمياء', 'Chemistry', 44, 60, 'sci.chemistry'),
        eg('الفيزياء', 'Physics', 39, 60, 'sci.physics'),
        eg('الأحياء', 'Biology', 55, 60, 'sci.biology'),
        eg('الجيولوجيا وعلوم البيئة', 'Geology and Environmental Science', 49, 60, 'sci.earth'),
      ],
    },
  ],
  notes: ['المجموع الكلي: ' + arDigits('335') + ' من ' + arDigits('410'), 'يعتبر هذا البيان لاغياً إذا وجد به كشط أو تعديل.'],
  signatures: ['مدير عام الامتحانات', 'خاتم شعار الجمهورية'],
  specimen: SPEC,
};

// ───────────────────────── Russia (Cyrillic) ─────────────────────────
const ruWord: Record<string, string> = { '5': 'отлично', '4': 'хорошо', '3': 'удовлетворительно' };
const ruUs: Record<string, string> = { '5': 'A', '4': 'B', '3': 'C', '2': 'F' };
const ru = (n: string, en: string, g: string, k: string): FakeCourse => c(n, en, g, k, ruUs[g], { x: { gp: `${g} (${ruWord[g]})` } });

export const ruAttestat: FakeSpec = {
  id: 'ru-attestat',
  system: 'ru',
  country: 'Russia',
  lang: 'ru',
  formats: ['pdf', 'photo-jpg'],
  variants: [{ suffix: 'redacted', redact: 'bar', formats: ['photo-jpg'] }],
  layout: 'slip',
  style: 'serif',
  issuer: ['РОССИЙСКАЯ ФЕДЕРАЦИЯ', 'Муниципальное бюджетное общеобразовательное учреждение', '«Средняя общеобразовательная школа № 47 имени Берёзовой Рощи»'],
  title: 'ПРИЛОЖЕНИЕ К АТТЕСТАТУ О СРЕДНЕМ ОБЩЕМ ОБРАЗОВАНИИ',
  subtitle: '№ 05424 004718236',
  info: [
    { label: 'Фамилия, имя, отчество', value: 'Соколова Анастасия Дмитриевна', role: 'name' },
    { label: 'Дата рождения', value: '6 июня 2007 года', role: 'dob' },
    { label: 'Образовательная организация', value: 'Средняя общеобразовательная школа № 47', role: 'school' },
    { label: 'Дата выдачи', value: '24 июня 2025 года', role: 'issued' },
  ],
  student: { name: 'Соколова Анастасия Дмитриевна', dob: '2007-06-06' },
  school: { name: 'Средняя общеобразовательная школа № 47' },
  cols: [
    { h: 'Наименование учебных предметов', f: 'n' },
    { h: 'Итоговая отметка', f: 'x.gp' },
  ],
  years: [
    {
      label: 'Сведения о результатах освоения образовательной программы среднего общего образования', level: 11, academicYear: '2024-2025',
      courses: [
        ru('Русский язык', 'Russian Language', '4', 'wl.native'),
        ru('Литература', 'Literature', '5', 'wl.native'),
        ru('Иностранный язык (английский)', 'Foreign Language (English)', '5', 'ela.efl'),
        ru('Алгебра и начала математического анализа', 'Algebra and Introductory Calculus', '4', 'math.precalc'),
        ru('Геометрия', 'Geometry', '3', 'math.geometry'),
        ru('Информатика', 'Informatics', '5', 'cs'),
        ru('История', 'History', '4', 'ss.history.world'),
        ru('Обществознание', 'Social Studies', '5', 'ss.social'),
        ru('География', 'Geography', '4', 'ss.geography'),
        ru('Биология', 'Biology', '5', 'sci.biology'),
        ru('Физика', 'Physics', '3', 'sci.physics'),
        ru('Химия', 'Chemistry', '4', 'sci.chemistry'),
        ru('Физическая культура', 'Physical Education', '5', 'pe'),
        ru('Основы безопасности жизнедеятельности', 'Fundamentals of Life Safety', '5', 'health'),
      ],
    },
  ],
  notes: ['Приложение без аттестата недействительно.'],
  signatures: ['Руководитель организации, осуществляющей образовательную деятельность', 'М.П.'],
  specimen: SPEC,
};

// ───────────────────────── India, Hindi-medium state board (Devanagari, unprofiled) ─────────────────────────
const hiDigits = (s: string) => s.replace(/\d/g, (d) => '०१२३४५६७८९'[+d]);
const hi = (n: string, en: string, mark: number, k: string): FakeCourse =>
  c(n, en, String(mark), k, genericUs(mark), { x: { gp: hiDigits(String(mark)), max: hiDigits('100') } });

export const inHindi: FakeSpec = {
  id: 'in-hindi-board',
  system: 'generic',
  country: 'India',
  lang: 'hi',
  formats: ['scan-jpg'],
  layout: 'slip',
  style: 'serif',
  issuer: ['माध्यमिक शिक्षा मण्डल, विंध्य प्रदेश', 'हाई स्कूल सर्टिफिकेट परीक्षा (कक्षा १०वीं) — वर्ष २०२४'],
  title: 'अंक सूची',
  info: [
    { label: 'परीक्षार्थी का नाम', value: 'प्रिया कुमारी वर्मा', role: 'name' },
    { label: 'अनुक्रमांक', value: hiDigits('241736085'), role: 'id' },
    { label: 'जन्म तिथि', value: hiDigits('18-09-2008'), role: 'dob' },
    { label: 'पिता का नाम', value: 'श्री रमेश चन्द्र वर्मा' },
    { label: 'विद्यालय', value: 'शासकीय कन्या उच्चतर माध्यमिक विद्यालय, नवग्राम', role: 'school' },
  ],
  student: { name: 'प्रिया कुमारी वर्मा', dob: '2008-09-18', id: '241736085' },
  school: { name: 'शासकीय कन्या उच्चतर माध्यमिक विद्यालय, नवग्राम' },
  cols: [
    { h: 'विषय', f: 'n' },
    { h: 'पूर्णांक', f: 'x.max', align: 'c' },
    { h: 'प्राप्तांक', f: 'x.gp', align: 'c' },
  ],
  years: [
    {
      label: 'कक्षा १०', level: 10, academicYear: '2023-2024',
      courses: [
        hi('हिन्दी', 'Hindi', 82, 'wl.native'),
        hi('अंग्रेजी', 'English', 74, 'ela.efl'),
        hi('संस्कृत', 'Sanskrit', 88, 'wl.other'),
        hi('गणित', 'Mathematics', 91, 'math.general'),
        hi('विज्ञान', 'Science', 79, 'sci.integrated'),
        hi('सामाजिक विज्ञान', 'Social Science', 85, 'ss.social'),
      ],
    },
  ],
  notes: ['परीक्षाफल: उत्तीर्ण — प्रथम श्रेणी', 'न्यूनतम उत्तीर्णांक: ' + hiDigits('33') + ' प्रतिशत'],
  signatures: ['सचिव, माध्यमिक शिक्षा मण्डल'],
  specimen: SPEC,
};

export const specsB: FakeSpec[] = [cnGaozhong, mxSep, frLycee, deAbitur, brHistorico, krRecord, vnHocba, egThanaweya, ruAttestat, inHindi];
