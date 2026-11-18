// Multilingual vocabulary used to understand transcript structure:
// column headers, field labels, period (year/term) labels, summary rows, grade words.
import { asciiDigits, key, similarity, stripDiacritics } from './text.ts';

export type Role =
  | 'name' | 'final' | 'grade' | 'score' | 'component' | 'credits' | 'hours' | 'max' | 'min'
  | 'words' | 'code' | 'qualifier' | 'area' | 'rank' | 'remark' | 'ignore';

const ROLE_TERMS: Record<Role, string[]> = {
  name: [
    'subject', 'subjects', 'course', 'courses', 'course title', 'subject title', 'subject name', 'name of subject', 'learning area', 'learning areas',
    'asignatura', 'asignaturas', 'materia', 'materias', 'unidad de aprendizaje', 'matière', 'matières', 'discipline', 'disciplines', 'enseignements',
    'fach', 'fächer', 'componente curricular', 'componentes curriculares', 'disciplina', 'disciplinas',
    '科目', '课程', '課程', '学科', '과목', '교과목', 'môn học', 'môn', 'विषय', 'المادة', 'المواد', 'المواد الدراسية',
    'наименование учебных предметов', 'учебные предметы', 'предмет', 'предметы', 'title', 'description', 'mata pelajaran', 'somo', 'ders',
  ],
  final: [
    'final grade', 'sem final grade', 'final', 'final mark', 'cả năm', 'nota final', 'calificación final', 'promedio final', 'média final',
    'média anual', 'moyenne annuelle', 'total', 'итоговая отметка', 'итоговая оценка', '学年成绩', '总评', '总评成绩', 'annual', 'year mark',
    'final score', 'overall', 'endnote', 'jahresnote', 'điểm tổng kết', 'tb cả năm', '학년말',
  ],
  grade: [
    'grade', 'grades', 'calif', 'calificación', 'calificaciones', 'nota', 'notas', 'note', 'noten', 'moyenne élève', 'moyenne', 'note punkte', 'punkte',
    '成绩', '成績', '分数', '得分', '评定', '성취도', '성적', 'điểm', 'प्राप्तांक', 'درجة الطالب', 'الدرجة', 'درجة', 'التقدير', 'отметка', 'оценка',
    'mark', 'marks', 'marks obtained', 'result', 'resultado', 'conceito', 'média', 'promedio', 'media', 'nilai', 'alama', 'not',
  ],
  score: ['score', 'percentage', 'percent', '원점수', '원점수 과목평균', 'raw score', 'points', 'pontos', 'puntos', '百分制'],
  component: [
    'quarter', 'quarter 1', 'quarter 2', 'quarter 3', 'quarter 4', '1st quarter', '2nd quarter', '3rd quarter', '4th quarter',
    'học kỳ i', 'học kỳ ii', 'học kỳ 1', 'học kỳ 2', 'hk1', 'hk2', 'hki', 'hkii', 'term 1', 'term 2', 'term 3', '1st term', '2nd term', '3rd term',
    'theory', 'practical', 'practical ia', 'ia', 'ca', 'c a', 'exam', 'examination', 'test', 'oral', 'écrit', 'trimestre 1', 'trimestre 2', 'trimestre 3',
    '1º bimestre', '2º bimestre', '3º bimestre', '4º bimestre', 'midterm', 'continuous assessment', 'parcial', 'parcial 1', 'parcial 2', 'parcial 3',
    '期中', '期末', '平时', '중간', '기말', 'thường xuyên', 'giữa kỳ', 'cuối kỳ',
  ],
  credits: ['credits', 'credit', 'créditos', 'crédits', 'units', 'unit', 'unit value', '단위수', '이수단위', '학점', '学分', '學分', 'tín chỉ', 'кредиты', 'credit hours', 'ects', 'sks', 'kredit'],
  hours: ['hours', 'horas', 'carga horária', 'carga horaria', 'c h', 'ch', 'heures', 'stunden', 'wochenstunden', '课时', '学时', '시수', 'số tiết', 'часы', 'hrs', 'periods', 'hours per week', 'h sem'],
  max: ['maximum marks', 'max marks', 'max', 'maximum', 'full marks', 'النهاية العظمى', 'الدرجة العظمى', 'पूर्णांक', 'out of', '满分', 'puntos posibles'],
  min: ['minimum', 'min marks', 'minimum marks', 'pass marks', 'pass mark', 'النهاية الصغرى', 'الدرجة الصغرى', 'न्यूनतम'],
  words: ['in words', 'total in words', 'letra', 'en letra', 'con letra', 'por extenso', 'en toutes lettres', 'in worten'],
  code: ['code', 'sub code', 'subject code', 'course code', 'clave', 'código', 'no', 's n', 'sn', 'sl no', '序号', '编号', '번호', 'stt', 'م', 'п п', 'nr'],
  qualifier: ['level', 'niveau', 'qualification', 'type', 'indicate if subject is core applied or specialized', 'indicate if subject is', 'core applied or specialized', 'core applied', 'category', 'nivel', 'kursart', 'track', '구분'],
  area: ['교과', 'area', 'área', 'campo disciplinar', 'domaine', 'aufgabenfeld', '领域', 'learning area group', 'subject group', 'group'],
  rank: ['rank', 'position', '석차등급', '석차', 'positional grade', 'class rank', 'xếp hạng', '名次', 'rang', 'classement', 'percentile'],
  remark: [
    'remark', 'remarks', 'interpretation', 'observaciones', 'observações', 'appréciations', 'appréciation', 'action taken', 'comment', 'comments',
    'nhận xét', '评语', '备注', '비고', 'ملاحظات', 'примечание', 'bemerkung', 'bemerkungen', 'teacher', 'professeur', 'enseignant', 'signature', 'lehrer',
  ],
  ignore: ['moyenne classe', 'class average', 'moyenne de la classe', 'média da turma', 'promedio del grupo', '과목평균', 'highest', 'lowest', 'min classe', 'max classe', '班级平均', 'weight', 'coef', 'coefficient', 'coeff'],
};

const TERM_INDEX: { term: string; role: Role }[] = [];
for (const role of Object.keys(ROLE_TERMS) as Role[]) {
  for (const t of ROLE_TERMS[role]) TERM_INDEX.push({ term: key(t), role });
}
TERM_INDEX.sort((a, b) => b.term.length - a.term.length);

const isLatinish = (s: string) => /^[a-z0-9 ]+$/.test(s);

function containsTerm(hay: string, term: string): boolean {
  if (hay === term) return true;
  if (!isLatinish(term)) return hay.includes(term);
  return (` ${hay} `).includes(` ${term} `);
}

/** Classifies a header cell. Longest matching term wins, so "moyenne classe" beats "moyenne". */
export function headerRole(text: string): Role | null {
  // Row-number columns ("#", "No.", "S/N") and percentage columns ("Mark(%)") are recognised by their symbols.
  if (/^\s*(#|№|n[o°º]\.?|s\/?n\.?|sr\.?\s*no\.?|s\.?\s*no\.?)\s*$/i.test(text)) return 'code';
  if (/%/.test(text) && text.length <= 24 && !/class|classe|turma|grupo/i.test(text)) return 'score';
  const k = key(text);
  if (!k || k.length > 70) return null;
  for (const { term, role } of TERM_INDEX) if (containsTerm(k, term)) return role;
  // OCR-tolerant fallback for longer terms.
  if (k.length >= 5) {
    for (const { term, role } of TERM_INDEX) {
      if (term.length >= 5 && Math.abs(term.length - k.length) <= 2 && similarity(k, term) >= 0.82) return role;
    }
  }
  return null;
}

// ───────────── field labels ─────────────

export type InfoField = 'name' | 'dob' | 'id' | 'school' | 'issued' | 'other';

const LABELS: Record<Exclude<InfoField, 'other'>, string[]> = {
  name: [
    'name', 'student name', 'name of student', 'candidate name', 'name of candidate', 'candidate', 'student', 'learner', 'pupil name', 'full name',
    'last name first name middle name', 'this is to certify that', 'nombre', 'nombre del alumno', 'nombre del estudiante', 'alumno', 'alumna', 'estudiante',
    'élève', 'nom', 'nom et prénom', 'nom prénom', 'vor und zuname', 'name vorname', 'schüler', 'schülerin', 'nome', 'nome do a aluno a', 'nome do aluno',
    'aluno', 'aluna', '姓名', '学生姓名', '성명', '이름', 'họ và tên', 'họ tên', 'اسم الطالب', 'الاسم', 'اسم التلميذ', 'фамилия имя отчество', 'фио',
    'परीक्षार्थी का नाम', 'छात्र का नाम', 'नाम', 'प्रमाणित किया जाता है कि', 'nama', 'jina',
  ],
  dob: [
    'date of birth', 'dob', 'birth date', 'birthdate', 'date of birth mm dd yyyy', 'born', 'born on', 'fecha de nacimiento', 'nacimiento', 'né e le', 'né le', 'née le',
    'date de naissance', 'geboren am', 'geburtsdatum', 'data de nascimento', 'nascimento', '出生日期', '出生年月', '생년월일', 'ngày sinh', 'ngày tháng năm sinh',
    'تاريخ الميلاد', 'дата рождения', 'जन्म तिथि', 'जन्मतिथि', 'tanggal lahir',
  ],
  id: [
    'student id', 'id', 'id number', 'student number', 'admission no', 'admission number', 'index number', 'index no', 'examination number', 'exam number',
    'registration number', 'reg no', 'roll no', 'roll number', 'candidate number', 'personal code', 'lrn', 'curp', 'matrícula', 'matricula', 'ine', 'numéro',
    'schülernummer', 'rg', 'cpf', '学籍号', '学号', '考号', '학번', '수험번호', 'mã học sinh', 'số báo danh', 'رقم الجلوس', 'الرقم القومي', 'अनुक्रमांक',
    'рег номер', 'nis', 'nisn',
  ],
  school: [
    'school', 'name of school', 'school name', 'centre', 'center', 'centre name', 'institution', 'plantel', 'escuela', 'institución', 'institucion',
    'établissement', 'etablissement', 'schule', 'estabelecimento de ensino', 'escola', 'colégio', '学校', '就读学校', '학교명', '학교', 'trường', 'المدرسة',
    'образовательная организация', 'школа', 'विद्यालय', 'sekolah', 'shule',
  ],
  issued: [
    'date issued', 'date of issue', 'issued', 'issue date', 'lugar y fecha de expedición', 'fecha de expedición', 'ausgestellt am', 'data de emissão', 'data',
    '发证日期', '发放日期', '발급일', 'ngày cấp', 'تاريخ الإصدار', 'дата выдачи', 'date', 'dated',
  ],
};

const LABEL_INDEX: { term: string; field: InfoField }[] = [];
for (const f of Object.keys(LABELS) as (keyof typeof LABELS)[]) for (const t of LABELS[f]) LABEL_INDEX.push({ term: key(t), field: f });
LABEL_INDEX.sort((a, b) => b.term.length - a.term.length);

/** Classifies the label part of "Label: value". */
export function infoField(label: string): InfoField {
  const k = key(label.replace(/\(.*?\)/g, ' '));
  if (!k) return 'other';
  // A bare "NUMBER:" on a report card is the student's number; "phone number" and the like are not.
  if (k === 'number' || k === 'no' || k === 'student no' || k === 'adm no' || k === 'id no') return 'id';
  for (const { term, field } of LABEL_INDEX) if (k === term) return field;
  // OCR often drops spaces ("Date ofBirth").
  const tight = k.replace(/ /g, '');
  for (const { term, field } of LABEL_INDEX) if (term.length >= 5 && tight === term.replace(/ /g, '')) return field;
  for (const { term, field } of LABEL_INDEX) if (term.length >= 3 && containsTerm(k, term)) return field;
  if (k.length >= 6) {
    for (const { term, field } of LABEL_INDEX) {
      if (term.length >= 6 && Math.abs(term.length - k.length) <= 2 && similarity(k, term) >= 0.84) return field;
    }
  }
  return 'other';
}

/** Exact label match only (used when there is no colon to mark the label). */
export function infoFieldExact(label: string): InfoField {
  const k = key(label.replace(/\(.*?\)/g, ' '));
  if (!k) return 'other';
  for (const { term, field } of LABEL_INDEX) if (k === term) return field;
  // A long label with one OCR slip ("Candidat Name" for "Candidate Name"), when only one known label is that close.
  if (k.length >= 9) {
    const near = LABEL_INDEX.filter(({ term }) => term.length >= 9 && Math.abs(term.length - k.length) <= 2 && similarity(term, k) >= 0.88);
    const fields = new Set(near.map((x) => x.field));
    if (fields.size === 1) return [...fields][0];
  }
  return 'other';
}

/**
 * A known field label at the start of a line without its colon (OCR often drops it), followed by a value:
 * "اسم الطالب يوسف أحمد", "Fecha de nacimiento 21 de septiembre". A single Latin word is too ambiguous
 * ("STUDENT ACADEMIC TRANSCRIPT"), so a Latin label needs at least two words.
 */
export function labelWithoutColon(text: string): { label: string; value: string } | null {
  const words = text.trim().split(/\s+/);
  for (let n = Math.min(6, words.length - 1); n >= 1; n--) {
    const label = words.slice(0, n).join(' ');
    // One Latin word is a label only before a value that looks like one: two or more capitalised words
    // ("School GREATLAND LOWER BASIC SCHOOL"), never an ordinary line ("School subjects and grades").
    const rest = words.slice(n);
    // A label in capitals before capitals is a heading ("STUDENT ACADEMIC TRANSCRIPT"), so the label must not be.
    if (/[A-Za-z]/.test(label) && n < 2 && !(/^\p{Lu}\p{Ll}/u.test(label) && rest.length >= 2 && rest.every((w) => /^[\p{Lu}\d]/u.test(w)))) continue;
    if (infoFieldExact(label) !== 'other' && key(label).length >= 2) return { label, value: words.slice(n).join(' ') };
  }
  return null;
}

const SCHOOL_WORDS = [
  'school', 'college', 'academy', 'institute', 'lycée', 'lycee', 'collège', 'gymnasium', 'gesamtschule', 'realschule', 'colégio', 'colegio', 'escola',
  'escuela', 'preparatoria', 'bachillerato', 'instituto', 'liceo', '中学', '高中', '学校', '고등학교', '중학교', 'trường', 'thpt', 'مدرسة', 'школа', 'лицей',
  'гимназия', 'विद्यालय', 'sekolah', 'madrasah', 'secondary',
].map(key);

export function looksLikeSchool(text: string): boolean {
  const k = key(text);
  return SCHOOL_WORDS.some((w) => containsTerm(k, w) || (!isLatinish(w) && k.includes(w)));
}

// ───────────── summary rows (totals, averages) ─────────────

const SUMMARY = [
  'total', 'grand total', 'aggregate', 'aggregate score', 'average', 'general average', 'gpa', 'cgpa', 'promedio', 'promedio general', 'média', 'media',
  'média geral', 'moyenne générale', 'moyenne generale', 'gesamt', 'durchschnitt', 'result', 'total points', '总分', '平均分', '合计', '합계', '평균',
  'tổng', 'trung bình', 'điểm trung bình', 'المجموع', 'المجموع الكلي', 'итого', 'всего', 'कुल', 'योग', 'percentage', 'overall', 'division', 'rank',
  'attendance', 'days present', 'conduct', 'total credits', 'créditos totales',
].map(key);

export function isSummaryLabel(text: string): boolean {
  const k = key(text);
  return SUMMARY.some((s) => k === s || k.startsWith(s + ' '));
}

// ───────────── period (year / term) labels ─────────────

const PERIOD_RES: RegExp[] = [
  /\b(ss|sss|shs|jss|jhs|form|grade|grade level|year|yr|class|std|standard|klasse|jahrgangsstufe|jahrgang|lớp|lop|série|serie|semestre|semester|sem|term|trimestre|año|ano|curso|grado|classe de|niveau|level|kelas|kidato)\s*\.?:?\s*(\d{1,2}|[ivx]{1,4})\b/iu,
  /\b(primer|primero|segundo|tercer|tercero|cuarto|quinto|sexto|primeiro|terceiro)\s+(semestre|año|ano|grado|curso|trimestre|bimestre)\b/iu,
  /\b(seconde|première|premiere|terminale|troisième|quatrième)\b/iu,
  /[高初][一二三]|[一二三四五六]年级|第[一二三四五六]学[期年]|[上下]学期/u,
  /\d\s*학년|\d\s*학기/u,
  /\b[1-6]\s*[ªºao°]\.?\s*(série|serie|ano|año|semestre|grado|bimestre|trimestre)\b/iu,
  /\b(qualifikationsphase|einführungsphase|kursstufe|oberstufe)\b/iu,
  /\b(first|second|third|fourth|1st|2nd|3rd|4th)\s+(year|semester|term|quarter)\b/iu,
  /\b(freshman|sophomore|junior|senior)\s+(year|class)\b/iu,
  /الصف\s+\S+|कक्षा\s*\S+|\d+\s*класс/u,
];
const YEAR_RE = /\b((?:19|20)\d{2})\s*[-–—/]\s*((?:19|20)?\d{2})\b/;

/** Labels that describe the student rather than the report ("Class on Leaving", "Class at entry"). */
export const STUDENT_CLASS = /leaving|left|entry|enrol|admitted|admission|last|previous|current|present|graduat|complet|al egresar|de ingreso|à la sortie|d'entrée|abgang|eintritt|на момент|عند/iu;

export function isPeriodLabel(text: string): boolean {
  const s = asciiDigits(text);
  if (PERIOD_RES.some((r) => r.test(s))) return true;
  // A term or semester in any language ("2e trimestre", "Học kỳ II", "第二学期").
  if (s.length <= 80 && detectTerm(s)) return true;
  // OCR may drop or change diacritics ("Lóp 11" for "Lớp 11").
  const bare = stripDiacritics(s);
  return bare !== s && PERIOD_RES.some((r) => r.test(bare));
}

export function academicYear(text: string): string | undefined {
  const s = asciiDigits(text);
  const m = YEAR_RE.exec(s);
  if (m) {
    const y1 = +m[1];
    let y2 = +m[2];
    if (y2 < 100) y2 += Math.floor(y1 / 100) * 100;
    if (y2 === y1 + 1) return `${y1}-${y2}`;
  }
  const single = /\b((?:19|20)\d{2})\b/.exec(s);
  return single ? single[1] : undefined;
}

export type TermUnit = 'term' | 'semester' | 'trimester' | 'quarter';

export interface TermMatch {
  /** Position within the school year, 1-based (the 3rd semester of a programme is the 1st of its 2nd year). */
  index: number;
  /** Position as printed (the 3rd semester stays 3). */
  ordinal: number;
  unit: TermUnit;
  /** The words that matched, as printed. */
  text: string;
}

/** Parts per school year for each unit, used to turn a programme-wide ordinal into a position within a year. */
export const PER_YEAR: Record<TermUnit, number> = { term: 3, semester: 2, trimester: 3, quarter: 4 };

// Words for "term", "semester" and so on, in the languages evalua reads. Order matters: longer words first.
const UNIT_WORDS: [string, TermUnit][] = [
  ['cuatrimestre', 'trimester'], ['trimestre', 'trimester'], ['trimester', 'trimester'],
  ['semester', 'semester'], ['semestre', 'semester'], ['sem', 'semester'], ['hk', 'semester'], ['halbjahr', 'semester'], ['học kỳ', 'semester'], ['hoc ky', 'semester'], ['học kì', 'semester'],
  ['학기', 'semester'], ['学期', 'semester'], ['полугодие', 'semester'], ['семестр', 'semester'], ['الفصل الدراسي', 'semester'], ['الترم', 'semester'],
  ['quarter', 'quarter'], ['bimestre', 'quarter'], ['четверть', 'quarter'], ['quý', 'quarter'],
  ['termly', 'term'], ['term', 'term'], ['terminal', 'term'],
];
const ORDINALS: Record<string, number> = {
  first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4, '4th': 4, fifth: 5, '5th': 5, sixth: 6, '6th': 6,
  primer: 1, primero: 1, primera: 1, segundo: 2, segunda: 2, tercer: 3, tercero: 3, tercera: 3, cuarto: 4, cuarta: 4, quinto: 5, quinta: 5, sexto: 6, sexta: 6,
  premier: 1, première: 1, premiere: 1, '1er': 1, '1re': 1, '1ère': 1, deuxième: 2, deuxieme: 2, '2e': 2, '2ème': 2, '2eme': 2, troisième: 3, troisieme: 3, '3e': 3, '3ème': 3, '3eme': 3, quatrième: 4, '4e': 4,
  primeiro: 1, terceiro: 3, quarto: 4,
  erste: 1, erstes: 1, ersten: 1, zweite: 2, zweites: 2, zweiten: 2, dritte: 3, drittes: 3,
  'первое': 1, 'первая': 1, 'второе': 2, 'вторая': 2, 'третья': 3, 'четвертая': 4, 'четвёртая': 4,
  'الأول': 1, 'الاول': 1, 'الثاني': 2, 'الثالث': 3,
};
const ROMAN_SMALL: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };
const CJK_NUM: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4 };

const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const UNIT_RE = [...UNIT_WORDS.map(([w]) => w)].sort((a, b) => b.length - a.length).map(esc).join('|');
const ORD_RE = Object.keys(ORDINALS).sort((a, b) => b.length - a.length).map(esc).join('|');
// Word boundaries that also work for non-Latin scripts (\b only knows ASCII letters).
const B = '(?<![\\p{L}\\p{N}])';
const E = '(?![\\p{L}\\p{N}])';
const NUM = '(\\d{1,2}|i{1,3}|iv|v|vi)';
// After NFKC, "1º" and "1ª" become "1o" and "1a".
const SUFFIX = '(?:st|nd|rd|th|er|re|ère|e|ème|º|ª|°|o|a|\\.|-?я|-?е)?';
const RE_ORD_UNIT = new RegExp(`${B}(${ORD_RE})\\s+(?:de\\s+|del\\s+)?(${UNIT_RE})${E}`, 'iu');
const RE_NUM_UNIT = new RegExp(`${B}${NUM}\\s*${SUFFIX}\\s*(${UNIT_RE})${E}`, 'iu');
const RE_UNIT_NUM = new RegExp(`${B}(${UNIT_RE})\\s*\\.?:?\\s*${NUM}${SUFFIX}${E}`, 'iu');
const RE_UNIT_ORD = new RegExp(`${B}(${UNIT_RE})\\s+(${ORD_RE})${E}`, 'iu');

const unitOfWord = (w: string): TermUnit => UNIT_WORDS.find(([x]) => w.toLowerCase().startsWith(x))?.[1] ?? 'term';
const within = (ordinal: number, unit: TermUnit) => ((ordinal - 1) % PER_YEAR[unit]) + 1;

/**
 * Finds a term, semester, trimester or quarter in a label, in any supported language:
 * "Second Term", "Term 2", "1st semester", "PRIMER SEMESTRE", "2e trimestre", "1º bimestre", "erstes Halbjahr",
 * "1. Halbjahr", "Học kỳ II", "2학기", "第二学期", "上学期", "2 четверть", "II полугодие", "الفصل الدراسي الثاني".
 */
export function detectTerm(raw: string): TermMatch | null {
  const s = asciiDigits(raw).toLowerCase().normalize('NFC');
  const hit = (ordinal: number, unitWord: string, text: string): TermMatch | null =>
    ordinal >= 1 && ordinal <= 12 ? { ordinal, index: within(ordinal, unitOfWord(unitWord)), unit: unitOfWord(unitWord), text } : null;
  let m: RegExpExecArray | null;
  const num = (x: string) => (/^\d/.test(x) ? +x : ROMAN_SMALL[x]);
  // Ordinal word, then the unit: "second term", "primer semestre", "2e trimestre", "erstes halbjahr".
  if ((m = RE_ORD_UNIT.exec(s))) return hit(ORDINALS[m[1]], m[2], m[0]);
  // Number (or Roman numeral) then the unit: "1st semester", "1º bimestre", "1. halbjahr", "2학기", "2 четверть", "ii полугодие".
  if ((m = RE_NUM_UNIT.exec(s))) return hit(num(m[1]), m[2], m[0]);
  // The unit, then a number or Roman numeral: "term 2", "semestre 1", "học kỳ ii", "trimestre 3".
  if ((m = RE_UNIT_NUM.exec(s))) return hit(num(m[2]), m[1], m[0]);
  // The unit, then an ordinal word after it: "الفصل الدراسي الثاني", "semestre primero".
  if ((m = RE_UNIT_ORD.exec(s))) return hit(ORDINALS[m[2]], m[1], m[0]);
  // Chinese: 第二学期, 上学期 / 下学期, 高一上 / 高二下.
  if ((m = /第([一二三四1-4])学期/u.exec(s))) return hit(CJK_NUM[m[1]] ?? +m[1], '学期', m[0]);
  if ((m = /([上下])学期/u.exec(s))) return hit(m[1] === '上' ? 1 : 2, '学期', m[0]);
  if ((m = /[高初][一二三]([上下])/u.exec(s))) return hit(m[1] === '上' ? 1 : 2, '学期', m[0]);
  // A bare "Termly" heading carries no position.
  return null;
}

/** Position within the year of a term printed in a label ("2"), or undefined. */
export function termOf(text: string): string | undefined {
  const t = detectTerm(text);
  return t ? String(t.index) : undefined;
}

const ROMAN: Record<string, number> = { vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12, xiii: 13 };

/** Generic grade-level guess from a period label when the system profile has no rule. */
export function genericLevel(text: string): number | null {
  const s = asciiDigits(text).toLowerCase();
  let m = /\b(?:grade|grade level|class|std|standard|klasse|jahrgangsstufe|lớp|lop|kelas|niveau)\s*\.?:?\s*(\d{1,2})\b/u.exec(s);
  if (m && +m[1] >= 6 && +m[1] <= 13) return Math.min(12, +m[1]);
  m = /\b(?:class|grade|std|standard)\s*\.?:?\s*(vii|viii|ix|xiii|xii|xi|x)\b/u.exec(s);
  if (m) return Math.min(12, ROMAN[m[1]]);
  m = /(\d{1,2})\s*(?:класс|학년|वीं|年级|\. klasse|\. sınıf)/u.exec(s);
  if (m && +m[1] >= 6 && +m[1] <= 12) return +m[1];
  m = /(?:कक्षा|दर्जा|الصف|صف|classe|grado|curso|kelas|darasa|sınıf|klas|班|年级)\s*:?\s*(\d{1,2})/u.exec(s);
  if (m && +m[1] >= 6 && +m[1] <= 13) return Math.min(12, +m[1]);
  // US class standing, only as a year label ("Junior year", "Class: Senior"). "Senior High School",
  // "Senior Secondary School" and "Junior High" are names of school types, not grade levels.
  const standing = /(?:^|\b(?:class|year|grade|standing)\s*:?\s*)(freshman|sophomore|junior|senior)(?:\s+(?:year|class))?\s*$|\b(freshman|sophomore|junior|senior)\s+(?:year|class)\b/u.exec(s.trim());
  if (standing) return { freshman: 9, sophomore: 10, junior: 11, senior: 12 }[(standing[1] ?? standing[2]) as 'freshman'];
  return null;
}

// ───────────── grade-shaped values ─────────────

const GRADE_WORDS = [
  'sehr gut', 'gut', 'befriedigend', 'ausreichend', 'mangelhaft', 'ungenügend', 'excellent', 'very good', 'good', 'credit', 'pass', 'fail', 'passed', 'failed',
  'satisfactory', 'outstanding', 'distinction', 'merit', 'đ', 'cđ', 'đạt', 'chưa đạt', '优', '优秀', '良', '良好', '中', '中等', '及格', '合格', '不及格', '不合格',
  '수', '우', '미', '양', '가', 'отлично', 'хорошо', 'удовлетворительно', 'неудовлетворительно', 'зачтено', 'ممتاز', 'جيد جدا', 'جيد', 'مقبول', 'ضعيف',
  'aprobado', 'reprobado', 'acreditado', 'aprovado', 'reprovado', 'admis', 'très bien', 'bien', 'assez bien', 'passable', 'insuffisant', 'ab', 'abs', 'absent', 'exempt',
  'incomplete', 'inc', 'withdrawn',
].map(key);

export function gradeWord(text: string): string | null {
  const k = key(text);
  return GRADE_WORDS.includes(k) ? k : null;
}

/** True when a cell could be a grade: number, letter grade, or a grade word. */
export function isGradeLike(text: string): boolean {
  const s = asciiDigits(text).trim();
  if (!s || s.length > 24) return false;
  if (/^\d{1,3}(?:[.,]\d{1,2})?%?$/.test(s)) return true;
  if (/^\d{1,3}(?:[.,]\d{1,2})?\s*\/\s*\d{1,3}$/.test(s)) return true;
  if (/^[A-Fa-fUu][+\-*]?$/.test(s) || /^[A-F][1-9]$/.test(s) || /^[PSNIW]$/.test(s) || /^A\*$/.test(s)) return true;
  if (/^(\d{1,2}|[A-E])\s*\(.+\)$/.test(s)) return true; // "5 (отлично)", "A(287)"
  return gradeWord(s) != null;
}

/** Splits "5 (отлично)" / "A(287)" / "9 NUEVE" into the grade and its trailing descriptor. */
// Grades written out in words beside the number: "8 OCHO" (Mexico), "5 (отлично)" (Russia),
// "EIGHT SEVEN" digit by digit (Indian boards' "total in words").
const NUMBER_WORDS: Record<string, number> = {};
const addWords = (n: number, ...ws: string[]) => ws.forEach((w) => (NUMBER_WORDS[key(w)] = n));
addWords(0, 'zero', 'cero', 'zéro', 'null', 'ноль', 'nil');
addWords(1, 'one', 'uno', 'un', 'une', 'um', 'uma', 'eins', 'один', 'единица');
addWords(2, 'two', 'dos', 'deux', 'dois', 'duas', 'zwei', 'два', 'неудовлетворительно', 'неуд');
addWords(3, 'three', 'tres', 'trois', 'três', 'drei', 'три', 'удовлетворительно', 'удовл');
addWords(4, 'four', 'cuatro', 'quatre', 'quatro', 'vier', 'четыре', 'хорошо', 'хор');
addWords(5, 'five', 'cinco', 'cinq', 'fünf', 'пять', 'отлично', 'отл');
addWords(6, 'six', 'seis', 'sechs', 'шесть');
addWords(7, 'seven', 'siete', 'sept', 'sete', 'sieben', 'семь');
addWords(8, 'eight', 'ocho', 'huit', 'oito', 'acht', 'восемь');
addWords(9, 'nine', 'nueve', 'neuf', 'nove', 'neun', 'девять');
addWords(10, 'ten', 'diez', 'dix', 'dez', 'zehn', 'десять');
const WORD_KEYS = Object.keys(NUMBER_WORDS);

/** One word as a number, tolerating an OCR slip in words of five letters or more. */
function wordNumber(w: string): number | undefined {
  // Inside a word a zero is a misread "o" ("0ne").
  const k = /\p{L}/u.test(w) ? key(w.replace(/0/g, 'o')) : key(w);
  if (k in NUMBER_WORDS) return NUMBER_WORDS[k];
  if (k.length < 3) return undefined;
  if (k.length < 5) {
    // A short word with one letter misread ("Twm" for "Two"), when only one number word fits.
    const near = WORD_KEYS.filter((x) => x.length === k.length && [...x].filter((ch, i) => ch !== k[i]).length === 1);
    const values = new Set(near.map((x) => NUMBER_WORDS[x]));
    return values.size === 1 ? [...values][0] : undefined;
  }
  const near = WORD_KEYS.filter((x) => x.length >= 5 && Math.abs(x.length - k.length) <= 1 && similarity(x, k) >= 0.8);
  const values = new Set(near.map((x) => NUMBER_WORDS[x]));
  return values.size === 1 ? [...values][0] : undefined;
}

/** The value of a grade written in words, or null when the words are not a number evalua knows. */
export function gradeFromWords(text: string): number | null {
  const words = text.replace(/[()（）.,;:]/g, ' ').trim().split(/[\s\-–]+/).filter(Boolean);
  if (!words.length || words.length > 4) return null;
  const values = words.map(wordNumber);
  if (values.some((v) => v == null)) return null;
  if (values.length === 1) return values[0]!;
  // Several words: digit by digit ("ZERO EIGHT SEVEN" = 87), each word a single digit.
  if (values.every((v) => v! <= 9)) return Number(values.join(''));
  return null;
}

export function splitGrade(text: string): { grade: string; rest: string; repaired?: boolean } {
  const s = asciiDigits(text).trim();
  const m = /^(\d{1,3}(?:[.,]\d{1,2})?|[A-F][1-9]?[+\-*]?)\s*[(（]\s*(.*?)\s*[)）\]]?$/.exec(s);
  if (m) return { grade: m[1], rest: m[2] };
  // "1(One)" as OCR often returns it: the opening bracket read as a letter or a zero ("10One)", "1jOma)", "1[Two)").
  // A closing bracket with no opening one gives it away; the misread bracket is the character after the first digit.
  const b = /^(\d)\s*[0OojJlI|{[]\s*(\p{L}{1,8})\s*[)）\]}]$/u.exec(s);
  if (b) return { grade: b[1], rest: b[2], repaired: true };
  const n = /^(\d{1,3}(?:[.,]\d{1,2})?)\s+([\p{L}][\p{L} ]+)$/u.exec(s);
  if (n) return { grade: n[1], rest: n[2] };
  return { grade: s, rest: '' };
}
