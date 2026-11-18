// Latin American and Caribbean secondary systems, and Senegal. Grade tables follow Scholaro's published scales for each
// country (read 2026-11-17); grade levels map each system's last secondary year to US grade 12, since most of these
// systems finish secondary school after 11 or 12 years. Languages of instruction are in instruction.ts, with sources.
import type { GradeScale, Provenance, ScaleEntry, SystemCourse, SystemProfile, USLetter } from '../core/types.ts';
import { INSTRUCTION } from './instruction.ts';

const YEAR = '2026-27';
const ADDED = '2026-11-17';
const prov = (title: string, url?: string): Provenance => ({ source: { title, url }, schoolYear: YEAR, addedOn: ADDED });
const scholaro = (country: string, slug: string) => prov(`Scholaro: Grading System in ${country}`, `https://www.scholaro.com/db/Countries/${slug}/Grading-System`);
const L = (labels: string[], us: USLetter, descriptor?: string): ScaleEntry => ({ labels, us, descriptor });
const R = (min: number, max: number, us: USLetter, descriptor?: string): ScaleEntry => ({ min, max, us, descriptor });
const course = (names: string[], en: string, concept: string): SystemCourse => ({ names, en, concept });
const d = (term: string, weight: number) => ({ term, weight });
/** "1º", "1°", "1er", "primer(o)", "1.º" … for an ordinal, as a regex fragment. */
const ORD: Record<number, string> = {
  1: '(?:1\\s*(?:º|°|o|er|ero|\\.º|\\.°|ro)?|primer[oa]?|1st|first)',
  2: '(?:2\\s*(?:º|°|o|do|\\.º|\\.°|nd)?|segund[oa]|second)',
  3: '(?:3\\s*(?:º|°|o|er|ero|\\.º|\\.°|ro|rd)?|tercer[oa]?|third)',
  4: '(?:4\\s*(?:º|°|o|to|\\.º|\\.°|th)?|cuart[oa]|fourth)',
  5: '(?:5\\s*(?:º|°|o|to|\\.º|\\.°|th)?|quint[oa]|fifth)',
  6: '(?:6\\s*(?:º|°|o|to|\\.º|\\.°|th)?|sext[oa]|sixth)',
  7: '(?:7\\s*(?:º|°|o|mo|\\.º|\\.°|th)?|s[ée]ptim[oa]|seventh)',
  8: '(?:8\\s*(?:º|°|o|vo|\\.º|\\.°|th)?|octav[oa]|eighth)',
  9: '(?:9\\s*(?:º|°|o|no|\\.º|\\.°|th)?|noven[oa]|ninth)',
  10: '(?:10\\s*(?:º|°|o|mo|\\.º|\\.°|th)?|d[ée]cim[oa]|tenth)',
  11: '(?:11\\s*(?:º|°|o|mo|\\.º|\\.°|th)?|und[ée]cim[oa]|d[ée]cimo\\s*primer[oa]?|eleventh)',
  12: '(?:12\\s*(?:º|°|o|mo|\\.º|\\.°|th)?|duod[ée]cim[oa]|d[ée]cimo\\s*segundo|twelfth)',
};
/** Rules for "<ordinal> <word>" → US grade, e.g. year 1 of a 5-year secundaria is US grade 8. */
const years = (word: string, first: number, count: number, usOfFirst: number) =>
  // "Cuarto grado de bachillerato", "4º año de bachillerato": a level word and "de" may sit between the two.
  Array.from({ length: count }, (_, i) => ({ pattern: `\\b${ORD[first + i]}\\s*(?:(?:grado|a[ñn]o|curso)\\s+)?(?:de\\s+)?(?:${word})\\b`, level: usOfFirst + i }));

// Course names shared across Spanish-speaking systems, from their published curricula.
const SPANISH: SystemCourse[] = [
  course(['Matemática', 'Matemáticas', 'Matematica', 'Matematicas'], 'Mathematics', 'math.general'),
  course(['Álgebra', 'Algebra'], 'Algebra', 'math.algebra1'),
  course(['Geometría', 'Geometria'], 'Geometry', 'math.geometry'),
  course(['Trigonometría', 'Geometría y Trigonometría'], 'Trigonometry', 'math.precalc'),
  course(['Cálculo', 'Calculo', 'Precálculo', 'Pre Cálculo'], 'Calculus', 'math.calculus'),
  course(['Estadística', 'Probabilidad y Estadística', 'Estadística y Probabilidad'], 'Statistics', 'math.statistics'),
  course(['Física', 'Fisica', 'Física Fundamental'], 'Physics', 'sci.physics'),
  course(['Química', 'Quimica'], 'Chemistry', 'sci.chemistry'),
  course(['Biología', 'Biologia'], 'Biology', 'sci.biology'),
  course(['Ciencias Naturales', 'Ciencias de la Naturaleza', 'Ciencia y Tecnología', 'Ciencias', 'Ciencias Naturales y Educación Ambiental'], 'Natural Sciences', 'sci.integrated'),
  course(['Ciencias de la Tierra', 'Ciencias de la Tierra y del Universo'], 'Earth Sciences', 'sci.earth'),
  course(['Educación Ambiental', 'Ecología'], 'Environmental Education', 'sci.environmental'),
  course(['Lengua Castellana', 'Lengua Castellana y Literatura', 'Lengua y Literatura', 'Lengua Española', 'Castellano', 'Idioma Español', 'Español', 'Lenguaje', 'Lenguaje y Comunicación', 'Comunicación', 'Comunicación y Lenguaje', 'Lengua y Comunicación', 'Literatura', 'Prácticas del Lenguaje', 'Español y Literatura'], 'Spanish Language and Literature', 'wl.native'),
  course(['Inglés', 'Ingles', 'Idioma Extranjero', 'Idioma Extranjero: Inglés', 'Lengua Extranjera', 'Lengua Extranjera: Inglés', 'Lenguas Extranjeras', 'Idioma Inglés', 'Lengua Extranjera Inglés'], 'English (foreign language)', 'ela.efl'),
  course(['Francés', 'Portugués', 'Italiano', 'Alemán'], 'Foreign Language', 'wl.other'),
  course(['Historia', 'Historia Universal'], 'History', 'ss.history.world'),
  course(['Geografía', 'Geografia'], 'Geography', 'ss.geography'),
  course(['Ciencias Sociales', 'Estudios Sociales', 'Historia, Geografía y Ciencias Sociales', 'Ciencias Sociales y Cívica', 'Estudios Sociales y Cívica'], 'Social Studies', 'ss.social'),
  course(['Educación Cívica', 'Formación Ciudadana', 'Educación Ciudadana', 'Formación Ética y Ciudadana', 'Construcción de Ciudadanía', 'Moral y Cívica', 'Educación Moral y Cívica', 'Cívica', 'Desarrollo Personal, Ciudadanía y Cívica', 'Educación para la Ciudadanía', 'Convivencia y Civismo', 'Cívica y Ética'], 'Civics', 'ss.civics'),
  course(['Filosofía', 'Filosofia', 'Lógica', 'Ética', 'Etica', 'Filosofía y Ética'], 'Philosophy', 'ss.philosophy'),
  course(['Psicología', 'Psicologia'], 'Psychology', 'ss.psychology'),
  course(['Sociología', 'Sociologia'], 'Sociology', 'ss.sociology'),
  course(['Economía', 'Economia', 'Economía Política'], 'Economics', 'ss.economics'),
  course(['Educación Física', 'Educacion Fisica', 'Educación Física y Deportes', 'Educación Física y Salud', 'Educación Física y Deporte', 'Deportes'], 'Physical Education', 'pe'),
  course(['Salud', 'Educación para la Salud'], 'Health', 'health'),
  course(['Educación Artística', 'Artes Visuales', 'Artes Plásticas', 'Arte y Cultura', 'Arte', 'Artes', 'Expresión Artística', 'Educación Cultural y Artística', 'Dibujo'], 'Art', 'arts.visual'),
  course(['Música', 'Educación Musical'], 'Music', 'arts.music'),
  course(['Informática', 'Computación', 'Tecnologías de la Información', 'Tecnología de la Información y Comunicación', 'TIC', 'Tecnología e Informática'], 'Computer Science', 'cs'),
  course(['Tecnología', 'Educación Tecnológica', 'Educación para el Trabajo', 'Técnica Tecnológica'], 'Technology', 'cte.technology'),
  course(['Religión', 'Educación Religiosa', 'Formación Religiosa', 'Religión, Moral y Valores'], 'Religious Education', 'ss.religion'),
  course(['Contabilidad'], 'Accounting', 'cte.finance'),
  course(['Emprendimiento', 'Emprendimiento y Gestión', 'Administración', 'Economía y Gestión'], 'Entrepreneurship', 'cte.business'),
  course(['Orientación', 'Orientación Vocacional', 'Tutoría', 'Consejería', 'Orientación Técnica y Vocacional', 'Orientación para la Vida'], 'Guidance', 'elective.other'),
];

const WORDS: ScaleEntry[] = [
  L(['Excelente', 'Sobresaliente', 'Superior'], 'A', 'Excelente'), L(['Distinguido', 'Muy Bueno', 'Muy bueno', 'MB', 'Notable'], 'A', 'Muy bueno'), L(['Bueno', 'Alto'], 'B', 'Bueno'),
  L(['Regular', 'Suficiente', 'Aceptable', 'Básico', 'Aprobado'], 'C', 'Aprobado'), L(['Insuficiente', 'Reprobado', 'Desaprobado', 'Deficiente', 'Bajo'], 'F', 'Reprobado'),
];

interface Spec {
  id: keyof typeof INSTRUCTION;
  name: string;
  country: string;
  slug: string;
  summary: string;
  detect: [string, number][];
  levels: { pattern: string; level: number }[];
  scales: Omit<GradeScale, 'provenance'>[];
  courses?: SystemCourse[];
  defaultLevel?: number;
  documentation?: { title: string; url: string }[];
}

function profile(s: Spec): SystemProfile {
  const p = scholaro(s.country, s.slug);
  return {
    id: s.id,
    instruction: INSTRUCTION[s.id],
    name: s.name,
    countries: [s.country],
    languages: ['es'],
    summary: s.summary,
    detect: s.detect.map(([t, w]) => d(t, w)),
    dateOrder: 'dmy',
    levels: s.levels,
    defaultLevel: s.defaultLevel,
    scales: [...s.scales.map((x) => ({ ...x, provenance: p })), { id: `${s.id}-words`, label: `${s.country}: grades in words → US letter`, kind: 'labels', entries: WORDS, provenance: p }],
    credit: { note: 'One full-year subject is one course; hours are used when the record prints them.', provenance: p },
    courses: [...(s.courses ?? []), ...SPANISH],
    documentation: s.documentation ?? [{ title: `Scholaro: Education System in ${s.country}`, url: `https://www.scholaro.com/db/Countries/${s.slug}/Education-System` }],
    provenance: p,
  };
}

const num = (id: string, label: string, domain: [number, number], passing: string, entries: ScaleEntry[], requiresAbove?: number): Omit<GradeScale, 'provenance'> => ({ id, label, kind: 'numeric', domain, passing, entries, requiresAbove });

export const ar = profile({
  id: 'ar', name: 'Argentina: educación secundaria', country: 'Argentina', slug: 'Argentina',
  summary: 'Secundaria lasts five or six years depending on the province (a basic cycle, then an oriented cycle) and ends with the título de Bachiller. Marks run 1–10, usually with 6 or 7 to pass at the school; Scholaro counts 4 and above as a pass. Grade levels here assume a five-year secundaria (1º año = US grade 8); in six-year provinces move each year down one.',
  detect: [['república argentina', 10], ['argentina', 6], ['ministerio de educación de la nación', 8], ['dirección general de cultura y educación', 8], ['dni', 3], ['analítico', 4], ['certificado analítico', 8], ['ciclo orientado', 6], ['ciclo básico', 3], ['bachiller', 3], ['escuela de educación secundaria', 6], ['prácticas del lenguaje', 6], ['construcción de ciudadanía', 6], ['buenos aires', 3], ['córdoba', 2], ['rosario', 2], ['mendoza', 2]],
  levels: [...years('año', 1, 5, 8), { pattern: `\\b${ORD[6]}\\s*año\\b`, level: 12 }],
  scales: [num('ar-10', 'Argentina 1–10 → US letter (Scholaro, Most Common)', [0, 10], '4 (school pass marks are often 6 or 7)', [R(9, 10, 'A', 'Sobresaliente'), R(8, 8.99, 'A', 'Distinguido'), R(7, 7.99, 'B', 'Bueno'), R(6, 6.99, 'B', 'Bueno'), R(4, 5.99, 'C', 'Aprobado'), R(0, 3.99, 'F', 'Insuficiente')])],
  courses: [course(['Historia Argentina'], 'Argentine History', 'ss.history.national'), course(['Formación Ética y Ciudadana'], 'Ethics and Citizenship', 'ss.civics')],
});

export const co = profile({
  id: 'co', name: 'Colombia: educación básica secundaria y media', country: 'Colombia', slug: 'Colombia',
  summary: 'Secondary school runs from grado 6º to grado 11º: básica secundaria (6º–9º) and media (10º–11º), ending with the Bachiller diploma and the Saber 11 exam. Since 2009 schools report Superior, Alto, Básico and Bajo, often beside a 1.0–5.0 mark (3.0 to pass). Grado 11º is the final year, so it maps to US grade 12.',
  detect: [['república de colombia', 10], ['colombia', 6], ['ministerio de educación nacional', 6], ['secretaría de educación', 3], ['institución educativa', 5], ['grado once', 5], ['grado undécimo', 6], ['bachiller académico', 6], ['icfes', 6], ['saber 11', 6], ['tarjeta de identidad', 5], ['desempeño superior', 6], ['desempeño alto', 6], ['desempeño básico', 6], ['bogotá', 3], ['medellín', 3], ['cali', 2]],
  levels: [...years('grado', 6, 6, 7), ...Array.from({ length: 6 }, (_, i) => ({ pattern: `\\bgrado\\s*${ORD[6 + i]}\\b`, level: 7 + i }))],
  scales: [
    num('co-5', 'Colombia 1.0–5.0 → US letter (Scholaro, Secondary 5-point)', [0, 5], '3.0', [R(4.6, 5, 'A', 'Superior'), R(4, 4.59, 'A', 'Alto'), R(3.5, 3.99, 'B', 'Alto'), R(3, 3.49, 'C', 'Básico'), R(0, 2.99, 'F', 'Bajo')]),
    num('co-100', 'Colombia 0–100 → US letter (Scholaro, Secondary 10-point)', [0, 100], '60', [R(90, 100, 'A'), R(80, 89.99, 'B'), R(60, 79.99, 'C'), R(0, 59.99, 'F')], 10),
    { id: 'co-levels', label: 'Colombia performance levels (Decreto 1290) → US letter (Scholaro, Secondary Scale (New))', kind: 'labels', entries: [L(['Superior', 'DS', 'S'], 'A', 'Desempeño superior'), L(['Alto', 'DA', 'A'], 'B', 'Desempeño alto'), L(['Básico', 'Basico', 'DB', 'B'], 'C', 'Desempeño básico'), L(['Bajo', 'Db', 'D'], 'F', 'Desempeño bajo')] },
  ],
  courses: [course(['Ciencias Políticas y Económicas', 'Ciencias Económicas y Políticas'], 'Political and Economic Sciences', 'ss.economics'), course(['Humanidades: Lengua Castellana', 'Humanidades'], 'Spanish Language Arts', 'wl.native'), course(['Humanidades: Inglés', 'Idioma Extranjero Inglés'], 'English (foreign language)', 'ela.efl')],
});

export const ve = profile({
  id: 've', name: 'Venezuela: educación media general', country: 'Venezuela', slug: 'Venezuela',
  summary: 'Educación media general lasts five years (1º–5º año) after six years of primary school, and ends with the título de Bachiller. Marks run 1–20 with 10 to pass. 5º año is the final year, so it maps to US grade 12.',
  detect: [['república bolivariana de venezuela', 12], ['venezuela', 6], ['ministerio del poder popular para la educación', 10], ['educación media general', 8], ['zona educativa', 6], ['certificación de calificaciones', 8], ['cédula de identidad', 3], ['caracas', 3], ['maracaibo', 2]],
  levels: years('año', 1, 5, 8),
  scales: [num('ve-20', 'Venezuela 1–20 → US letter (Scholaro, Most Common)', [0, 20], '10', [R(16, 20, 'A', 'Excelente'), R(13, 15.99, 'B', 'Bueno'), R(10, 12.99, 'C', 'Satisfactorio'), R(0, 9.99, 'F', 'Deficiente')])],
  courses: [course(['Castellano y Literatura'], 'Spanish Language and Literature', 'wl.native'), course(['Historia de Venezuela'], 'History of Venezuela', 'ss.history.national'), course(['Ciencias de la Tierra'], 'Earth Sciences', 'sci.earth'), course(['Formación para la Soberanía Nacional', 'Instrucción Premilitar'], 'National Sovereignty Education', 'elective.other')],
});

export const dom = profile({
  id: 'do', name: 'Dominican Republic: nivel secundario', country: 'Dominican Republic', slug: 'Dominican-Republic',
  summary: 'Nivel secundario lasts six years (1º–6º de secundaria, two three-year cycles) after six years of primary school. Marks run 0–100 with 70 to pass. 6º de secundaria is the final year, so it maps to US grade 12.',
  detect: [['república dominicana', 12], ['dominicana', 5], ['ministerio de educación de la república dominicana', 10], ['minerd', 8], ['nivel secundario', 6], ['regional de educación', 5], ['distrito educativo', 5], ['santo domingo', 4], ['santiago de los caballeros', 4], ['pruebas nacionales', 5]],
  levels: years('(?:de\\s+)?(?:secundaria|grado)', 1, 6, 7),
  scales: [num('do-100', 'Dominican Republic 0–100, pass at 70 → US letter (Scholaro, Most Common Secondary)', [0, 100], '70', [R(90, 100, 'A', 'Excelente'), R(80, 89.99, 'B', 'Muy bueno'), R(70, 79.99, 'C', 'Bueno'), R(0, 69.99, 'F', 'Insuficiente')])],
  courses: [course(['Lengua Española'], 'Spanish Language', 'wl.native'), course(['Formación Integral Humana y Religiosa'], 'Integral Human and Religious Education', 'ss.religion'), course(['Lenguas Extranjeras (Inglés)', 'Lenguas Extranjeras: Inglés'], 'English (foreign language)', 'ela.efl'), course(['Lenguas Extranjeras (Francés)', 'Lenguas Extranjeras: Francés'], 'French', 'wl.other')],
});

export const pe = profile({
  id: 'pe', name: 'Peru: educación secundaria', country: 'Peru', slug: 'Peru',
  summary: 'Secundaria lasts five years (1º–5º) after six years of primary school. Since 2019 the national curriculum reports AD, A, B or C for each competency; older records and many schools use 0–20 with 11 to pass. 5º de secundaria is the final year, so it maps to US grade 12.',
  detect: [['república del perú', 12], ['perú', 6], ['peru', 5], ['ministerio de educación', 3], ['minedu', 8], ['ugel', 8], ['certificado oficial de estudios', 8], ['educación básica regular', 7], ['dni', 2], ['lima', 3], ['arequipa', 3], ['logro destacado', 6], ['logro esperado', 6]],
  levels: years('(?:de\\s+)?(?:secundaria|grado|año)', 1, 5, 8),
  scales: [
    num('pe-20', 'Peru 0–20, pass at 11 → US letter (Scholaro, Most Common)', [0, 20], '11', [R(15, 20, 'A', 'Excelente'), R(13, 14.99, 'B', 'Muy bueno'), R(12, 12.99, 'B', 'Bueno'), R(11, 11.99, 'C', 'Aprobado'), R(0, 10.99, 'F', 'Reprobado')]),
    { id: 'pe-cneb', label: 'Peru competency levels (CNEB) → US letter (Scholaro, Peru Secondary)', kind: 'labels', entries: [L(['AD'], 'A', 'Logro destacado'), L(['A'], 'B', 'Logro esperado'), L(['B'], 'C', 'En proceso'), L(['C'], 'D', 'En inicio')] },
  ],
  courses: [course(['Comunicación'], 'Communication (Spanish language arts)', 'wl.native'), course(['Inglés como Lengua Extranjera'], 'English as a Foreign Language', 'ela.efl'), course(['Ciencia y Tecnología', 'CTA', 'Ciencia, Tecnología y Ambiente'], 'Science and Technology', 'sci.integrated'), course(['Educación para el Trabajo'], 'Education for Work', 'cte.technology'), course(['Historia, Geografía y Economía'], 'History, Geography and Economics', 'ss.social')],
});

export const cl = profile({
  id: 'cl', name: 'Chile: enseñanza media', country: 'Chile', slug: 'Chile',
  summary: 'Enseñanza media lasts four years (1º–4º medio) after eight years of enseñanza básica, so 1º medio is US grade 9. Marks run 1.0–7.0 with 4.0 to pass. The certificado anual de estudios or concentración de notas lists each year.',
  detect: [['república de chile', 12], ['chile', 6], ['ministerio de educación', 3], ['mineduc', 8], ['enseñanza media', 8], ['certificado anual de estudios', 9], ['concentración de notas', 9], ['run', 2], ['rut', 3], ['rbd', 6], ['santiago', 2], ['valparaíso', 3], ['concepción', 2]],
  levels: years('(?:a[ñn]o\\s+)?(?:medio|de\\s+ense[ñn]anza\\s+media)', 1, 4, 9),
  scales: [num('cl-7', 'Chile 1.0–7.0, pass at 4.0 → US letter (Scholaro, Most Common)', [1, 7], '4.0', [R(6.5, 7, 'A', 'Muy bueno'), R(6, 6.49, 'A'), R(5.5, 5.99, 'B'), R(5, 5.49, 'B', 'Bueno'), R(4.5, 4.99, 'B'), R(4, 4.49, 'C', 'Suficiente'), R(0, 3.99, 'F', 'Insuficiente')])],
  courses: [course(['Lengua y Literatura', 'Lenguaje y Comunicación', 'Lengua Castellana y Comunicación'], 'Spanish Language and Literature', 'wl.native'), course(['Historia, Geografía y Ciencias Sociales'], 'History, Geography and Social Sciences', 'ss.social'), course(['Educación Física y Salud'], 'Physical Education and Health', 'pe'), course(['Educación Ciudadana'], 'Civic Education', 'ss.civics')],
});

export const ec = profile({
  id: 'ec', name: 'Ecuador: Bachillerato General Unificado', country: 'Ecuador', slug: 'Ecuador',
  summary: 'The Bachillerato General Unificado (BGU) lasts three years (1º–3º BGU) after ten years of Educación General Básica, so 3º BGU is US grade 12 (EGB 10 is grade 9). Marks run 0–10 with 7 to pass in current regulations; Scholaro’s table counts 6 and above as passing.',
  detect: [['república del ecuador', 12], ['ecuador', 6], ['ministerio de educación del ecuador', 9], ['bachillerato general unificado', 10], ['bgu', 6], ['educación general básica', 6], ['egb', 4], ['unidad educativa', 6], ['distrito educativo', 3], ['quito', 3], ['guayaquil', 3], ['cuenca', 2]],
  levels: [...years('(?:a[ñn]o\\s+)?(?:de\\s+)?(?:bgu|bachillerato)', 1, 3, 10), { pattern: `\\b${ORD[10]}\\s*(?:a[ñn]o\\s+)?(?:de\\s+)?(?:egb|educaci[óo]n\\s+general\\s+b[áa]sica|b[áa]sica)`, level: 9 }],
  scales: [num('ec-10', 'Ecuador 0–10 → US letter (Scholaro, 10-point)', [0, 10], '7 (Scholaro: 6)', [R(9, 10, 'A', 'Domina los aprendizajes'), R(7.5, 8.99, 'B', 'Alcanza los aprendizajes'), R(6, 7.49, 'C', 'Está próximo a alcanzar'), R(5, 5.99, 'D'), R(0, 4.99, 'F', 'No alcanza los aprendizajes')])],
  courses: [course(['Lengua y Literatura'], 'Spanish Language and Literature', 'wl.native'), course(['Emprendimiento y Gestión'], 'Entrepreneurship and Management', 'cte.business'), course(['Educación Cultural y Artística'], 'Cultural and Artistic Education', 'arts.visual'), course(['Historia'], 'History', 'ss.history.world')],
});

export const bo = profile({
  id: 'bo', name: 'Bolivia: educación secundaria comunitaria productiva', country: 'Bolivia', slug: 'Bolivia',
  summary: 'Secundaria comunitaria productiva lasts six years (1º–6º de secundaria) after six years of primary school, and ends with the Bachiller Técnico Humanístico. Since 2013 marks run 1–100 with 51 to pass. 6º de secundaria is the final year, so it maps to US grade 12.',
  detect: [['estado plurinacional de bolivia', 12], ['bolivia', 6], ['ministerio de educación', 3], ['secundaria comunitaria productiva', 10], ['rude', 6], ['unidad educativa', 4], ['dirección distrital', 5], ['la paz', 3], ['santa cruz', 3], ['cochabamba', 3], ['bachiller técnico humanístico', 8]],
  levels: years('(?:de\\s+)?(?:secundaria|a[ñn]o)', 1, 6, 7),
  scales: [num('bo-100', 'Bolivia 1–100, pass at 51 → US letter (Scholaro, New Secondary since 2013)', [0, 100], '51', [R(85, 100, 'A', 'Desarrollo pleno'), R(69, 84.99, 'B', 'Desarrollo óptimo'), R(51, 68.99, 'C', 'Desarrollo aceptable'), R(0, 50.99, 'F', 'En desarrollo')])],
  courses: [course(['Comunicación y Lenguajes', 'Comunicación y Lenguajes: Lengua Castellana y Originaria'], 'Communication and Languages', 'wl.native'), course(['Lengua Extranjera'], 'Foreign Language (English)', 'ela.efl'), course(['Biología - Geografía', 'Biología-Geografía'], 'Biology and Geography', 'sci.biology'), course(['Cosmovisiones, Filosofía y Psicología'], 'Worldviews, Philosophy and Psychology', 'ss.philosophy'), course(['Valores, Espiritualidades y Religiones'], 'Values, Spirituality and Religions', 'ss.religion'), course(['Educación Física y Deportes'], 'Physical Education and Sport', 'pe'), course(['Educación Musical'], 'Music Education', 'arts.music'), course(['Artes Plásticas y Visuales'], 'Visual Arts', 'arts.visual'), course(['Técnica Tecnológica', 'Técnica Tecnológica General'], 'Technical Education', 'cte.technology')],
});

export const py = profile({
  id: 'py', name: 'Paraguay: educación media', country: 'Paraguay', slug: 'Paraguay',
  summary: 'Educación media lasts three years (1º–3º curso) after nine years of Educación Escolar Básica, so 3º curso is US grade 12. Marks run 1–5 with 2 to pass.',
  detect: [['república del paraguay', 12], ['paraguay', 6], ['ministerio de educación y ciencias', 9], ['mec', 3], ['educación escolar básica', 7], ['educación media', 5], ['bachillerato científico', 6], ['guaraní', 5], ['asunción', 4], ['cédula de identidad', 2]],
  levels: [...years('curso', 1, 3, 10), ...years('grado', 7, 3, 7)],
  scales: [num('py-5', 'Paraguay 1–5, pass at 2 → US letter (Scholaro, Most Common)', [1, 5], '2', [R(5, 5, 'A', 'Sobresaliente'), R(4, 4.99, 'A', 'Muy bueno'), R(3, 3.99, 'B', 'Bueno'), R(2, 2.99, 'C', 'Aprobado'), R(0, 1.99, 'F', 'Reprobado')])],
  courses: [course(['Lengua Castellana y Literatura'], 'Spanish Language and Literature', 'wl.native'), course(['Lengua Guaraní y Literatura', 'Guaraní', 'Guaraní Ñe’ẽ', 'Lengua Guaraní'], 'Guaraní Language and Literature', 'wl.native'), course(['Historia y Geografía'], 'History and Geography', 'ss.social'), course(['Formación Ética y Ciudadana'], 'Ethics and Citizenship', 'ss.civics')],
});

export const uy = profile({
  id: 'uy', name: 'Uruguay: educación media', country: 'Uruguay', slug: 'Uruguay',
  summary: 'Educación media has a three-year basic cycle (1º–3º, US grades 7–9) and a three-year bachillerato (4º–6º, US grades 10–12) after six years of primary school. Marks run 1–12.',
  detect: [['república oriental del uruguay', 12], ['uruguay', 6], ['anep', 8], ['codicen', 8], ['consejo de educación secundaria', 8], ['dirección general de educación secundaria', 8], ['liceo', 4], ['bachillerato diversificado', 6], ['montevideo', 4], ['c.i.', 2]],
  levels: [...years('(?:a[ñn]o\\s+)?(?:de\\s+)?(?:ciclo\\s+b[áa]sico|liceo)', 1, 3, 7), ...years('(?:a[ñn]o\\s+)?(?:de\\s+)?bachillerato', 4, 3, 10), ...years('a[ñn]o', 4, 3, 10)],
  scales: [num('uy-12', 'Uruguay 1–12 → US letter (Scholaro, Most Common)', [1, 12], '6 at most schools (Scholaro counts 3 and above)', [R(11, 12, 'A', 'Sobresaliente'), R(8, 10.99, 'A', 'Muy bueno'), R(5, 7.99, 'B', 'Bueno'), R(3, 4.99, 'C', 'Aprobado'), R(0, 2.99, 'F', 'Deficiente')])],
  courses: [course(['Idioma Español'], 'Spanish Language', 'wl.native'), course(['Literatura'], 'Literature', 'wl.native'), course(['Derecho', 'Educación Social y Cívica'], 'Law and Civics', 'ss.civics')],
});

export const gt = profile({
  id: 'gt', name: 'Guatemala: ciclo básico y diversificado', country: 'Guatemala', slug: 'Guatemala',
  summary: 'Secondary school is the ciclo básico (1º–3º básico, US grades 7–9) and the ciclo diversificado (4º–5º bachillerato, or three years for some careers), after six years of primary school. Marks run 0–100 with 60 to pass. 5º bachillerato is the final year, so it maps to US grade 12.',
  detect: [['república de guatemala', 12], ['guatemala', 6], ['mineduc', 6], ['ministerio de educación', 3], ['ciclo diversificado', 8], ['ciclo básico', 5], ['código personal', 6], ['cui', 2], ['bachillerato en ciencias y letras', 8], ['perito', 3], ['quetzaltenango', 3]],
  levels: [...years('(?:a[ñn]o\\s+)?b[áa]sico', 1, 3, 7), ...years('(?:a[ñn]o\\s+)?(?:de\\s+)?(?:bachillerato|diversificado|perito)', 4, 2, 11), { pattern: `\\b${ORD[6]}\\s*(?:a[ñn]o\\s+)?(?:perito|diversificado)`, level: 12 }],
  scales: [num('gt-100', 'Guatemala 0–100, pass at 60 → US letter (Scholaro, Secondary School (Public))', [0, 100], '60', [R(90, 100, 'A', 'Excelente'), R(80, 89.99, 'A', 'Muy bueno'), R(70, 79.99, 'B', 'Bueno'), R(60, 69.99, 'C', 'Aceptable'), R(0, 59.99, 'F', 'Reprobado')])],
  courses: [course(['Comunicación y Lenguaje', 'Comunicación y Lenguaje L1', 'Idioma Español'], 'Spanish Language and Communication', 'wl.native'), course(['Comunicación y Lenguaje L3', 'Idioma Extranjero'], 'Foreign Language (English)', 'ela.efl'), course(['Comunicación y Lenguaje L2'], 'Second (Mayan) Language', 'wl.other'), course(['Ciencias Sociales y Formación Ciudadana'], 'Social Studies and Citizenship', 'ss.social'), course(['Productividad y Desarrollo'], 'Productivity and Development', 'cte.business')],
});

export const hn = profile({
  id: 'hn', name: 'Honduras: educación media', country: 'Honduras', slug: 'Honduras',
  summary: 'Educación media follows nine years of basic education: the Bachillerato en Ciencias y Humanidades lasts two years (10º–11º), technical bachilleratos three. Since 2013 marks run 0–100 with 70 to pass. The final year maps to US grade 12.',
  detect: [['república de honduras', 12], ['honduras', 6], ['secretaría de educación', 4], ['bachillerato en ciencias y humanidades', 9], ['bachillerato técnico profesional', 8], ['dirección departamental', 4], ['tegucigalpa', 4], ['san pedro sula', 4], ['rnp', 2]],
  levels: [{ pattern: `\\b${ORD[10]}\\s*grado\\b`, level: 11 }, { pattern: `\\b${ORD[11]}\\s*grado\\b`, level: 12 }, { pattern: `\\b${ORD[12]}\\s*grado\\b`, level: 12 }, ...years('(?:a[ñn]o\\s+)?(?:de\\s+)?bachillerato', 1, 2, 11)],
  scales: [num('hn-100', 'Honduras 0–100, pass at 70 → US letter (Scholaro, Secondary 2013 to present)', [0, 100], '70', [R(90, 100, 'A', 'Avanzado'), R(81, 89.99, 'B', 'Muy satisfactorio'), R(70, 80.99, 'C', 'Satisfactorio'), R(0, 69.99, 'F', 'Debe mejorar')])],
  courses: [course(['Historia de Honduras'], 'History of Honduras', 'ss.history.national'), course(['Lengua y Literatura'], 'Spanish Language and Literature', 'wl.native')],
});

export const sv = profile({
  id: 'sv', name: 'El Salvador: educación media', country: 'El Salvador', slug: 'El-Salvador',
  summary: 'The general bachillerato lasts two years (1º–2º año, technical bachilleratos three) after nine years of basic education, so 2º año de bachillerato maps to US grade 12. Marks run 1–10; Scholaro counts 5 and above as passing (6 at many schools).',
  detect: [['república de el salvador', 12], ['el salvador', 6], ['ministerio de educación, ciencia y tecnología', 9], ['mined', 6], ['minedu', 2], ['bachillerato general', 6], ['nie', 4], ['paes', 6], ['avanzo', 5], ['san salvador', 4]],
  levels: [...years('(?:a[ñn]o\\s+)?(?:de\\s+)?bachillerato', 1, 2, 11), { pattern: `\\b${ORD[3]}\\s*(?:a[ñn]o\\s+)?(?:de\\s+)?bachillerato`, level: 12 }],
  scales: [num('sv-10', 'El Salvador 1–10 → US letter (Scholaro, Most Common)', [0, 10], '5 (6 at many schools)', [R(9, 10, 'A', 'Excelente'), R(7, 8.99, 'B', 'Muy bueno'), R(6, 6.99, 'C', 'Bueno'), R(5, 5.99, 'D', 'Bueno'), R(0, 4.99, 'F', 'Regular')])],
  courses: [course(['Lenguaje y Literatura'], 'Spanish Language and Literature', 'wl.native'), course(['Estudios Sociales y Cívica'], 'Social Studies and Civics', 'ss.social'), course(['Seminario'], 'Seminar', 'elective.other')],
});

export const ni = profile({
  id: 'ni', name: 'Nicaragua: educación secundaria', country: 'Nicaragua', slug: 'Nicaragua',
  summary: 'Secundaria lasts five years (7º–11º grado, also written 1º–5º año) after six years of primary school, so 11º grado (5º año) maps to US grade 12. Marks run 0–100 with 60 to pass; records may also show AA, AS, AE or AI.',
  detect: [['república de nicaragua', 12], ['nicaragua', 6], ['ministerio de educación', 3], ['mined', 4], ['educación secundaria', 3], ['aprendizaje avanzado', 6], ['aprendizaje satisfactorio', 6], ['managua', 4], ['león', 2]],
  levels: [...years('grado', 7, 5, 8), ...years('a[ñn]o', 1, 5, 8)],
  scales: [
    num('ni-100', 'Nicaragua 0–100, pass at 60 → US letter (Scholaro, Most Common)', [0, 100], '60', [R(90, 100, 'A', 'Sobresaliente'), R(80, 89.99, 'A', 'Muy bueno'), R(70, 79.99, 'B', 'Bueno'), R(60, 69.99, 'C', 'Regular'), R(0, 59.99, 'F', 'Reprobado')]),
    { id: 'ni-learning', label: 'Nicaragua learning levels → US letter (Scholaro, Alternative Secondary Scale)', kind: 'labels', entries: [L(['AA'], 'A', 'Aprendizaje avanzado'), L(['AS'], 'B', 'Aprendizaje satisfactorio'), L(['AE'], 'C', 'Aprendizaje elemental'), L(['AI'], 'F', 'Aprendizaje inicial')] },
  ],
  courses: [course(['Lengua y Literatura'], 'Spanish Language and Literature', 'wl.native'), course(['Convivencia y Civismo'], 'Citizenship', 'ss.civics'), course(['Creciendo en Valores'], 'Values Education', 'elective.other'), course(['Orientación Técnica y Vocacional', 'OTV'], 'Technical and Vocational Guidance', 'cte.technology'), course(['Taller de Arte y Cultura', 'Talleres de Arte y Cultura'], 'Art and Culture Workshop', 'arts.visual')],
});

export const cr = profile({
  id: 'cr', name: 'Costa Rica: educación diversificada', country: 'Costa Rica', slug: 'Costa-Rica',
  summary: 'After six years of primary school, the III ciclo (7º–9º) and the educación diversificada (10º–11º, or 12º in technical schools) follow; 11º is the final academic year, so it maps to US grade 12. Marks run 0–100; Scholaro counts 70 and above as passing.',
  detect: [['república de costa rica', 12], ['costa rica', 7], ['ministerio de educación pública', 6], ['mep', 5], ['educación diversificada', 8], ['bachillerato en educación media', 7], ['colegio técnico profesional', 6], ['san josé', 3], ['cédula', 2]],
  levels: [...years('(?:a[ñn]o|nivel)', 7, 5, 8), { pattern: `\\b${ORD[12]}\\s*(?:a[ñn]o|nivel)\\b`, level: 12 }],
  scales: [num('cr-100', 'Costa Rica 0–100 → US letter (Scholaro, Most Common)', [0, 100], '70', [R(90, 100, 'A', 'Sobresaliente'), R(80, 89.99, 'B', 'Notable'), R(70, 79.99, 'C', 'Suficiente'), R(0, 69.99, 'F', 'Insuficiente')], 10)],
  courses: [course(['Español'], 'Spanish', 'wl.native'), course(['Estudios Sociales'], 'Social Studies', 'ss.social'), course(['Educación Cívica'], 'Civics', 'ss.civics')],
});

export const pa = profile({
  id: 'pa', name: 'Panama: premedia y media', country: 'Panama', slug: 'Panama',
  summary: 'Premedia (7º–9º) and media (10º–12º) follow six years of primary school, matching US grades 7–12. Marks run 1.0–5.0 with 3.0 to pass at most schools (Scholaro: 2.0 is the minimum to pass).',
  detect: [['república de panamá', 12], ['panamá', 6], ['panama', 5], ['meduca', 8], ['ministerio de educación', 3], ['educación media', 4], ['premedia', 7], ['bachiller en ciencias', 6], ['bachiller en comercio', 6], ['colón', 2]],
  levels: years('(?:grado|a[ñn]o)', 7, 6, 7),
  scales: [num('pa-5', 'Panama 1.0–5.0 → US letter (Scholaro, Common Secondary)', [0, 5], '3.0 at most schools (Scholaro: 2.0)', [R(4.6, 5, 'A', 'Sobresaliente'), R(4, 4.59, 'B', 'Bueno'), R(3, 3.99, 'C', 'Regular'), R(2, 2.99, 'D', 'Mínima de promoción'), R(0, 1.99, 'F', 'Fracaso')])],
  courses: [course(['Español'], 'Spanish', 'wl.native'), course(['Historia de Panamá'], 'History of Panama', 'ss.history.national'), course(['Expresiones Artísticas'], 'Artistic Expression', 'arts.visual'), course(['Religión, Moral y Valores'], 'Religion, Morals and Values', 'ss.religion')],
});

export const cu = profile({
  id: 'cu', name: 'Cuba: secundaria básica y preuniversitario', country: 'Cuba', slug: 'Cuba',
  summary: 'Secundaria básica (7º–9º grado) and the preuniversitario (10º–12º grado) follow six years of primary school, matching US grades 7–12. Marks run 0–100 with 60 to pass.',
  detect: [['república de cuba', 12], ['cuba', 6], ['ministerio de educación', 3], ['preuniversitario', 8], ['ipu', 4], ['ipvce', 7], ['secundaria básica', 5], ['carné de identidad', 5], ['la habana', 4]],
  levels: years('grado', 7, 6, 7),
  scales: [num('cu-100', 'Cuba 0–100, pass at 60 → US letter (Scholaro, 100-point)', [0, 100], '60', [R(90, 100, 'A', 'Excelente'), R(80, 89.99, 'B', 'Muy bueno'), R(70, 79.99, 'C', 'Bueno'), R(60, 69.99, 'D', 'Insuficiente'), R(0, 59.99, 'F', 'Deficiente')], 5)],
  courses: [course(['Español-Literatura', 'Español Literatura'], 'Spanish and Literature', 'wl.native'), course(['Historia de Cuba'], 'History of Cuba', 'ss.history.national'), course(['Cultura Política'], 'Political Culture', 'ss.civics'), course(['Fundamentos de la Ideología'], 'Foundations of Ideology', 'ss.civics')],
});

export const pr = profile({
  id: 'pr', name: 'Puerto Rico: escuela superior', country: 'Puerto Rico', slug: 'Puerto-Rico',
  summary: 'Puerto Rico follows the US grade structure (escuela superior, grades 10–12 or 9–12) and US letter grades A–F, often with 0–100 marks. Records from the Departamento de Educación are usually in Spanish.',
  detect: [['puerto rico', 9], ['departamento de educación de puerto rico', 12], ['escuela superior', 6], ['transcripción de créditos', 9], ['estado libre asociado', 6], ['san juan', 3], ['bayamón', 3], ['ponce', 3]],
  levels: years('grado', 9, 4, 9),
  scales: [
    num('pr-100', 'Puerto Rico 0–100 → US letter (Scholaro, USA Most Common)', [0, 100], '60', [R(90, 100, 'A'), R(80, 89.99, 'B'), R(70, 79.99, 'C'), R(60, 69.99, 'D'), R(0, 59.99, 'F')], 5),
    { id: 'pr-letters', label: 'Puerto Rico US letter grades (Scholaro, USA Most Common)', kind: 'labels', entries: [L(['A', 'A+', 'A-'], 'A'), L(['B', 'B+', 'B-'], 'B'), L(['C', 'C+', 'C-'], 'C'), L(['D', 'D+', 'D-'], 'D'), L(['F'], 'F'), L(['P', 'S', 'CR'], 'P')] },
  ],
  courses: [course(['Historia de Puerto Rico'], 'History of Puerto Rico', 'ss.history.national'), course(['Historia de los Estados Unidos', 'Historia de Estados Unidos'], 'US History', 'ss.history.us'), course(['Ciencias Terrestres'], 'Earth Science', 'sci.earth'), course(['Ciencias Ambientales'], 'Environmental Science', 'sci.environmental'), course(['Bellas Artes'], 'Fine Arts', 'arts.visual'), course(['Inglés'], 'English', 'ela.efl')],
});

// ── Senegal (French) ──
const SN_SRC = scholaro('Senegal', 'Senegal');
export const sn: SystemProfile = {
  id: 'sn',
  instruction: INSTRUCTION.sn,
  name: 'Senegal: enseignement moyen et secondaire (BFEM, Baccalauréat)',
  countries: ['Senegal'],
  languages: ['fr'],
  summary:
    'Middle school (collège: 6e–3e) ends with the BFEM; the lycée (seconde, première, terminale) ends with the Baccalauréat set by the Office du Bac. Report cards (bulletins) give marks out of 20 with a coefficient per subject, a moyenne générale and a class rank; 10 is the pass mark. Terminale is the final year, so it maps to US grade 12.',
  detect: [d('république du sénégal', 12), d('sénégal', 6), d('senegal', 5), d('ministère de l’éducation nationale', 3), d("ministère de l'éducation nationale", 3), d('inspection d’académie', 6), d("inspection d'académie", 6), d('ief', 3), d('bfem', 9), d('office du bac', 9), d('lycée', 2), d('dakar', 4), d('thiès', 4), d('saint-louis', 3), d('ziguinchor', 4), d('bulletin de notes', 3), d('coefficient', 2), d('moyenne générale', 2), d('rang', 1)],
  dateOrder: 'dmy',
  levels: [
    { pattern: '\\b(?:6e|6ème|sixième)\\b', level: 6 }, { pattern: '\\b(?:5e|5ème|cinquième)\\b', level: 7 }, { pattern: '\\b(?:4e|4ème|quatrième)\\b', level: 8 }, { pattern: '\\b(?:3e|3ème|troisième)\\b', level: 9 },
    { pattern: '\\b(?:seconde|2nde|2de)\\b', level: 10 }, { pattern: '\\b(?:première|1ère|1re)\\b', level: 11 }, { pattern: '\\b(?:terminale|tle)\\b', level: 12 },
  ],
  scales: [
    { id: 'sn-20', label: 'Senegal marks out of 20 → US letter (Scholaro, Most Common Francophone)', kind: 'numeric', domain: [0, 20], passing: '10', entries: [R(16, 20, 'A', 'Très bien'), R(14, 15.99, 'A', 'Bien'), R(12, 13.99, 'B', 'Assez bien'), R(10, 11.99, 'C', 'Passable'), R(0, 9.99, 'F', 'Insuffisant')], provenance: SN_SRC },
  ],
  credit: { note: 'One full-year subject is one course. The coefficient weights a subject in the moyenne générale; it is not a credit value.', provenance: SN_SRC },
  courses: [
    course(['Français'], 'French Language and Literature', 'wl.native'),
    course(['Mathématiques', 'Maths'], 'Mathematics', 'math.general'),
    course(['Sciences Physiques', 'Physique-Chimie', 'PC'], 'Physical Sciences (Physics and Chemistry)', 'sci.physical'),
    course(['Sciences de la Vie et de la Terre', 'SVT'], 'Life and Earth Sciences', 'sci.biology'),
    course(['Histoire-Géographie', 'Histoire et Géographie', 'HG'], 'History and Geography', 'ss.social'),
    course(['Anglais', 'LV1 Anglais'], 'English (foreign language)', 'ela.efl'),
    course(['Espagnol', 'Arabe', 'Portugais', 'Allemand', 'Italien', 'LV2'], 'Second Foreign Language', 'wl.other'),
    course(['Philosophie'], 'Philosophy', 'ss.philosophy'),
    course(['Éducation Physique et Sportive', 'EPS'], 'Physical Education', 'pe'),
    course(['Éducation Civique', 'Instruction Civique', 'Éducation à la Citoyenneté'], 'Civics', 'ss.civics'),
    course(['Économie Familiale et Sociale', 'EFS'], 'Family and Social Economics', 'cte.home'),
    course(['Informatique'], 'Computer Science', 'cs'),
    course(['Latin', 'Grec'], 'Latin', 'wl.other'),
  ],
  documentation: [{ title: 'Office du Baccalauréat (Université Cheikh Anta Diop)', url: 'https://officedubac.sn' }, { title: 'Scholaro: Education System in Senegal', url: 'https://www.scholaro.com/db/Countries/Senegal/Education-System' }],
  provenance: SN_SRC,
};

export const latamSystems: SystemProfile[] = [ar, co, ve, dom, pe, cl, ec, bo, py, uy, gt, hn, sv, ni, cr, pa, cu, pr];
