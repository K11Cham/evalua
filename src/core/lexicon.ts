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
  return 'other';
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
  /\b(freshman|sophomore|junior|senior)\b/iu,
  /الصف\s+\S+|कक्षा\s*\S+|\d+\s*класс/u,
];
const YEAR_RE = /\b((?:19|20)\d{2})\s*[-–—/]\s*((?:19|20)?\d{2})\b/;

export function isPeriodLabel(text: string): boolean {
  const s = asciiDigits(text);
  if (PERIOD_RES.some((r) => r.test(s))) return true;
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

export function termOf(text: string): string | undefined {
  const s = asciiDigits(text).toLowerCase();
  let m: RegExpExecArray | null;
  if ((m = /(?:sem(?:ester|estre)?|term|hk|học kỳ|학기)\s*\.?:?\s*(\d|i{1,3})(?:st|nd|rd|th)?\b/u.exec(s))) return m[1].startsWith('i') ? String(m[1].length) : m[1];
  if ((m = /(\d)\s*(?:st|nd|rd|th)?\s*(?:sem(?:ester|estre)?|term|학기)\b/u.exec(s))) return m[1];
  if ((m = /第([一二三四])学期/u.exec(s))) return String('一二三四'.indexOf(m[1]) + 1);
  if (/上学期|[一二三]上/u.test(s)) return '1';
  if (/下学期|[一二三]下/u.test(s)) return '2';
  const ord = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto'];
  for (let i = 0; i < ord.length; i++) if (new RegExp(`\\b${ord[i]}o?\\s+semestre`).test(s)) return String((i % 2) + 1);
  return undefined;
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
  if (/\bfreshman\b/.test(s)) return 9;
  if (/\bsophomore\b/.test(s)) return 10;
  if (/\bjunior\b/.test(s)) return 11;
  if (/\bsenior\b/.test(s)) return 12;
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
export function splitGrade(text: string): { grade: string; rest: string } {
  const s = asciiDigits(text).trim();
  const m = /^(\d{1,3}(?:[.,]\d{1,2})?|[A-F][1-9]?[+\-*]?)\s*[(（]\s*(.*?)\s*[)）]?$/.exec(s);
  if (m) return { grade: m[1], rest: m[2] };
  const n = /^(\d{1,3}(?:[.,]\d{1,2})?)\s+([\p{L}][\p{L} ]+)$/u.exec(s);
  if (n) return { grade: n[1], rest: n[2] };
  return { grade: s, rest: '' };
}
