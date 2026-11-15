// Extraction: positioned text → structured record (student, school, system, courses), with provenance.
import type { Cell, Row } from './layout.ts';
import { rowText } from './layout.ts';
import { academicYear, detectTerm, genericLevel, infoField, infoFieldExact, isGradeLike, isPeriodLabel, looksLikeSchool, splitGrade, STUDENT_CLASS, termOf, type InfoField } from './lexicon.ts';
import { buildMatcher, fixOcrNumerals } from './match.ts';
import { readTables, type RawCourse, type TableResult } from './tables.ts';
import { asciiDigits, displayName, dominantScript, key, parseDate, parseNumber, stripDiacritics } from './text.ts';
import type { DocTokens, ExtractedCourse, Extraction, Field, KnowledgeBase, SourceRef, SystemProfile } from './types.ts';

const src = (c: Cell): SourceRef => ({ page: c.page, x: c.x, y: c.y, w: c.w, h: c.h });
const empty = <T>(value: T): Field<T> => ({ value, confidence: 0 });

export interface ExtractOptions {
  /** Force a system profile instead of detecting it. */
  systemId?: string;
}

export interface SystemGuess {
  profile: SystemProfile | undefined;
  score: number;
  runnerUp?: { id: string; score: number };
}

/** Scores every system profile by its weighted keywords found in the document text. */
export function detectSystem(text: string, systems: SystemProfile[]): SystemGuess {
  const k = ` ${key(text)} `;
  const scored = systems
    .filter((s) => s.id !== 'generic')
    .map((s) => {
      let score = 0;
      for (const d of s.detect) {
        const t = key(d.term);
        if (!t) continue;
        const hit = /[a-z]/.test(t) ? k.includes(` ${t} `) : k.includes(t);
        if (hit) score += d.weight;
      }
      return { s, score };
    })
    .sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top || top.score < 5) return { profile: undefined, score: top?.score ?? 0 };
  return { profile: top.s, score: top.score, runnerUp: scored[1] && scored[1].score > 0 ? { id: scored[1].s.id, score: scored[1].score } : undefined };
}

const OTHER_LABEL =
  /\b(father|mother|guardian|parent|padre|madre|tutor|pere|mere|vater|mutter|pai|mae|centre number|center number|school code|centre no|clave del centro|examination centre|exam centre|test centre|class teacher|adviser)\b|父|母|보호자|ولي|الأب|الأم|पिता|माता|отец|мать|отца|матери/u;

interface Pair {
  field: InfoField;
  label: string;
  value: string;
  cell: Cell;
  row: Row;
}

function splitLabel(text: string): { label: string; value: string } | null {
  const m = /^(.{1,70}?)\s*[:：]\s*(.*)$/.exec(text);
  if (m && !/^\d+$/.test(m[1])) return { label: m[1], value: m[2] };
  // No colon (OCR often drops it): accept only an exact known label at the start. Single Latin words are
  // too ambiguous ("STUDENT ACADEMIC TRANSCRIPT"), so those need at least two words.
  const words = text.split(/\s+/);
  for (let n = Math.min(6, words.length - 1); n >= 1; n--) {
    const label = words.slice(0, n).join(' ');
    const latin = /[A-Za-z]/.test(label);
    if (latin && n < 2) continue;
    if (infoFieldExact(label) !== 'other' && key(label).length >= 2) return { label, value: words.slice(n).join(' ') };
  }
  return null;
}

function readInfo(rows: Row[], rtl: boolean): Pair[] {
  const pairs: Pair[] = [];
  let lastRowPairs: Pair[] = [];
  for (const row of rows) {
    const cells = rtl ? [...row.cells].reverse() : row.cells;
    let found = false;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const sp = splitLabel(c.text);
      if (!sp) continue;
      let value = sp.value.trim();
      let cell = c;
      if (!value && cells[i + 1] && !splitLabel(cells[i + 1].text)) {
        value = cells[i + 1].text;
        cell = cells[i + 1];
        i++;
      }
      if (!value) continue;
      const k = key(sp.label);
      const field = OTHER_LABEL.test(k) ? 'other' : infoField(sp.label);
      pairs.push({ field, label: sp.label, value, cell, row });
      found = true;
    }
    // Wrapped values: a following line that starts under a name or school and carries no label of its own.
    // A line that has labels of its own ("NUMBER: KR117") is a new field, never a continuation.
    let continued = false;
    for (const c of found ? [] : row.cells) {
      if (/[:：]/.test(c.text) || c.text.length > 60 || splitLabel(c.text)) continue;
      const p = lastRowPairs.find(
        (q) => (q.field === 'name' || q.field === 'school') && row.page === q.row.page && row.y - q.row.y > 0 && row.y - q.row.y < q.row.h * 1.8 && c.x >= q.cell.x - 6 && c.x < q.cell.x + q.cell.w,
      );
      if (p) {
        p.value += ' ' + c.text;
        p.row = row;
        continued = true;
      }
    }
    if (found) lastRowPairs = pairs.filter((p) => p.row === row);
    else if (!continued) lastRowPairs = [];
  }
  return pairs;
}

function resolveLevel(label: string, profile: SystemProfile | undefined): { level: number | null; term?: string } {
  const s = asciiDigits(label);
  // OCR often drops or changes diacritics ("Lóp 10" for "Lớp 10"), so also compare without them.
  const bare = stripDiacritics(s);
  for (const rule of profile?.levels ?? []) {
    try {
      if (new RegExp(rule.pattern, 'iu').test(s) || new RegExp(stripDiacritics(rule.pattern), 'iu').test(bare)) return { level: rule.level, term: rule.term };
    } catch {
      // A malformed pattern in a profile must never break extraction.
    }
  }
  return { level: genericLevel(s) ?? genericLevel(bare) };
}

const COUNTRY_WORDS: Record<string, string[]> = {
  'The Gambia': ['gambia'], Nigeria: ['nigeria'], Ghana: ['ghana'], 'Sierra Leone': ['sierra leone'], Liberia: ['liberia'], Egypt: ['egypt', 'مصر'],
  Russia: ['россия', 'российская федерация', 'russian federation'], India: ['india', 'भारत', 'प्रदेश'], China: ['中国', '中华人民共和国'], Mexico: ['méxico', 'mexico', 'estados unidos mexicanos'],
  France: ['république française', 'france'], Germany: ['deutschland', 'bundesrepublik'], Brazil: ['brasil'], 'South Korea': ['대한민국'], Vietnam: ['việt nam'],
  Philippines: ['philippines', 'pilipinas'], 'United Kingdom': ['united kingdom', 'england', 'wales'], Ukraine: ['україна'], Pakistan: ['pakistan'], Bangladesh: ['bangladesh', 'বাংলাদেশ'],
  Nepal: ['nepal', 'नेपाल'], Kenya: ['kenya'], Ethiopia: ['ethiopia'], Colombia: ['colombia'], Guatemala: ['guatemala'], Honduras: ['honduras'], 'El Salvador': ['el salvador'],
  Venezuela: ['venezuela'], Haiti: ['haïti', 'haiti'], Afghanistan: ['afghanistan', 'افغانستان'], Syria: ['سوريا', 'syrian'], Iraq: ['العراق', 'iraq'], Jordan: ['الأردن', 'jordan'],
  Japan: ['日本'], Turkey: ['türkiye', 'turkiye'], Iran: ['ایران'], Cuba: ['cuba'], 'Dominican Republic': ['república dominicana'], Ecuador: ['ecuador'], Peru: ['perú'],
};

function findCountry(text: string, profile: SystemProfile | undefined): string {
  const k = ` ${key(text)} `;
  const candidates = profile && profile.countries.length ? profile.countries : Object.keys(COUNTRY_WORDS);
  if (profile && profile.countries.length === 1) return profile.countries[0];
  for (const c of candidates) {
    const words = COUNTRY_WORDS[c] ?? [c];
    if (words.some((w) => k.includes(/[a-z]/.test(key(w)) ? ` ${key(w)} ` : key(w)))) return c;
  }
  return profile?.countries.length ? profile.countries.join(' / ') : '';
}

const SCRIPT_LANG: Record<string, string> = { han: 'zh', hangul: 'ko', kana: 'ja', cyrillic: 'ru', arabic: 'ar', devanagari: 'hi', thai: 'th', greek: 'el', hebrew: 'he' };

function cleanGrade(text: string): { value: string; descriptor: string } {
  const { grade, rest } = splitGrade(text);
  let v = grade.trim();
  if (/^\d+,\d+$/.test(v)) v = v.replace(',', '.');
  if (/^0\d+(\.\d+)?$/.test(v)) v = v.replace(/^0+(?=\d)/, '');
  return { value: v, descriptor: rest };
}

function toCourse(raw: RawCourse, i: number, ctx: { profile?: SystemProfile; header: PageHeader; ocr: boolean; match: ReturnType<typeof buildMatcher> }): ExtractedCourse {
  const original = (ctx.ocr ? fixOcrNumerals(raw.name.text) : raw.name.text).replace(/\s+/g, ' ').trim();
  const look = ctx.match(original);
  const nameConf = Math.min(0.99, raw.name.conf);
  const course: ExtractedCourse = {
    id: `c${i + 1}`,
    name: { value: look.en || original, original, confidence: nameConf, source: src(raw.name) },
    translation: look.translation,
    grade: empty(''),
    period: { value: raw.period, original: raw.period, confidence: raw.period ? 0.95 : 0, source: raw.periodCell ? src(raw.periodCell) : undefined },
    level: null,
  };
  if (raw.grade) {
    const g = cleanGrade(raw.grade.text);
    const shape = isGradeLike(raw.grade.text) ? 1 : 0.55;
    course.grade = { value: g.value, original: raw.grade.text, confidence: Math.min(0.99, raw.grade.conf) * shape * (raw.gradeGuessed ? 0.7 : 1), source: src(raw.grade) };
    // "Annual", "Cumulative", "Cả năm" columns are whole-year results ("SEM FINAL GRADE" is not).
    if (raw.gradeHeader && WHOLE_YEAR.test(raw.gradeHeader) && !/\bsem/i.test(raw.gradeHeader)) course.wholeYear = true;
  }
  if (raw.score) {
    const first = /-?\d+(?:[.,]\d+)?/.exec(asciiDigits(raw.score.text));
    if (first) course.score = { value: first[0].replace(',', '.'), original: raw.score.text, confidence: Math.min(0.99, raw.score.conf), source: src(raw.score) };
  }
  const num = (c: Cell | undefined): Field<number> | undefined => {
    if (!c) return undefined;
    const n = parseNumber(c.text);
    return n == null ? undefined : { value: n, original: c.text, confidence: Math.min(0.99, c.conf), source: src(c) };
  };
  course.maxMark = num(raw.max);
  course.credits = num(raw.credits);
  course.hours = num(raw.hours);
  if (raw.qualifier && raw.qualifier.text.trim()) course.qualifier = raw.qualifier.text.trim();
  // The course's own period label (a matrix column, a heading over its table) comes first, then its report's header.
  const lv = resolveLevel(raw.period, ctx.profile);
  course.level = lv.level ?? ctx.header.level;
  course.term = lv.term ?? termOf(raw.period);
  course.academicYear = academicYear(raw.period) ?? ctx.header.year;
  return course;
}

interface PageHeader {
  level: number | null;
  year?: string;
  span: ReturnType<typeof documentPeriod>;
}

const LEVEL_LABEL = /^(class|grade|form|level|year group|standard|std|clase|grado|curso|classe|klasse|jahrgangsstufe|série|serie|ano|lớp|班级|年级|학년|الصف|कक्षा|класс)\b/iu;
const YEAR_LABEL = /^(year|academic year|school year|session|academic session|año escolar|ciclo escolar|año lectivo|année scolaire|schuljahr|ano letivo|ano lectivo|năm học|学年|学年度|学年度|학년도|العام الدراسي|السنة الدراسية|शैक्षणिक वर्ष|सत्र|учебный год)\b/iu;
const YEAR_RANGE = /\b(?:19|20)\d{2}\s*[-–—/]\s*(?:19|20)?\d{2}\b/;
const NOT_SCHOOL_YEAR = /born|birth|naci|naiss|geboren|生|생년|sinh|ميلاد|рожд|जन्म|issued|expedi|ausgestellt|emiss|printed|\d{1,2}:\d{2}/i;

/**
 * Grade level, school year and term for every page. Each is read from the page itself (labels such as
 * "Class:", "Year:", "Année scolaire", "Năm học", a "Second Term" heading), and a page without them
 * inherits from earlier pages of the same report only: a new file never inherits from the one before.
 */
function reportHeaders(tables: TableResult, pairs: Pair[], profile: SystemProfile | undefined, doc: DocTokens): PageHeader[] {
  const pageCount = Math.max(1, doc.pages.length, ...tables.rows.map((r) => r.page + 1));
  const starts = new Set([0, ...(doc.parts ?? []).map((p) => p.firstPage)]);
  const own: { level?: number | null; year?: string; span: ReturnType<typeof documentPeriod> }[] = [];
  for (let p = 0; p < pageCount; p++) {
    const mine = pairs.filter((x) => x.row.page === p);
    let level: number | null | undefined;
    let year: string | undefined;
    const lines = tables.freeRows.filter((r) => r.page === p).slice(0, 30).map(rowText);
    // 1. A period line printed on the page ("SS 2 (2022/2023)", "Lớp 11 — Năm học 2024 - 2025").
    for (const t of lines) {
      if (level != null) break;
      if (!/[:：]/.test(t) && isPeriodLabel(t)) level = resolveLevel(t, profile).level;
    }
    // 2. Labels: "Class: 10 Science 1", "Year: 2024/2025 Academic Year". Labels about the student rather than
    //    this report ("Class on Leaving", "Class at entry", "Last class attended") are not this report's class.
    for (const x of mine) {
      if (level == null && LEVEL_LABEL.test(x.label.trim()) && !STUDENT_CLASS.test(x.label)) level = resolveLevel(`${x.label} ${x.value}`, profile).level;
      if (!year && YEAR_LABEL.test(x.label.trim())) year = academicYear(x.value);
    }
    // 3. Any other line.
    for (const t of lines) {
      if (level == null && !(/[:：]/.test(t) && !/class|grade|कक्षा|classe|klasse|lớp/i.test(t))) level = resolveLevel(t, profile).level;
      if (year || NOT_SCHOOL_YEAR.test(t)) continue;
      // A school-year range anywhere ("2024/2025"), or a single year on a period line ("Summer 2023 — Year 11").
      if (YEAR_RANGE.test(asciiDigits(t))) year = academicYear(t);
      else if (isPeriodLabel(t) && /\b(?:19|20)\d{2}\b/.test(asciiDigits(t))) year = academicYear(t);
    }
    // Term headings come from lines outside tables: a table cell ("10,3 · Trimestre difficile") is not a heading.
    own[p] = { level: level ?? undefined, year, span: documentPeriod(lines) };
  }
  const out: PageHeader[] = [];
  let carried: PageHeader = { level: null, span: null };
  for (let p = 0; p < pageCount; p++) {
    if (starts.has(p)) carried = { level: null, span: null };
    carried = { level: own[p].level ?? carried.level, year: own[p].year ?? carried.year, span: own[p].span ?? carried.span };
    out[p] = carried;
  }
  // Exam certificates print no grade level: the system's default applies.
  for (const h of out) if (h.level == null) h.level = profile?.defaultLevel ?? null;
  return out;
}

/**
 * Report cards often number their rows ("1 MATHEMATICS", "2ENGLISH LANGUAGE"). When most names in the
 * table start with a run of increasing numbers, the numbers are a row index, not part of the name.
 */
function stripRowNumbers(all: RawCourse[]) {
  // Page by page: a record combined from several files can number rows on some pages and not others.
  const pages = new Map<number, RawCourse[]>();
  for (const c of all) pages.set(c.name.page, [...(pages.get(c.name.page) ?? []), c]);
  for (const courses of pages.values()) stripPage(courses);
}

function stripPage(courses: RawCourse[]) {
  const nums = courses.map((c) => /^\s*\(?(\d{1,2})[.)]?\s*(?=\p{L})/u.exec(asciiDigits(c.name.text)));
  const hits = nums.filter(Boolean).length;
  if (hits < 3 || hits < courses.length * 0.6) return;
  const values = nums.map((m) => (m ? +m[1] : null)).filter((v): v is number => v != null);
  // Numbering may restart at 1 for each report in a combined record; every run must count up by one.
  const counting = values.filter((v, i) => i === 0 || v === values[i - 1] + 1 || v === 1).length >= values.length * 0.8;
  if (!counting) return;
  courses.forEach((c, i) => {
    const m = nums[i];
    if (m) c.name = { ...c.name, text: asciiDigits(c.name.text).slice(m[0].length).trim() };
  });
}

/** What a period label calls its part of the year. */
function unitOf(label: string): ExtractedCourse['termUnit'] {
  return detectTerm(label)?.unit ?? (/\btermly\b/i.test(label) ? 'term' : undefined);
}

/** Column headings that mean the grade covers the whole year, even on a term report. */
const WHOLE_YEAR = /\b(annual|yearly|cumulative|cum\.?|session(al)?|year average|final average)\b|cả năm|学年|总评|학년말|итогов|jahres|moyenne annuelle|promedio final|média anual/iu;

/** "Second Term", "1st Semester", "Term 3" printed once for the whole document. */
function documentPeriod(lines: string[]): { term: string; label: string } | null {
  for (const line of lines.slice(0, 40)) {
    const s = line.trim();
    // A heading, not a sentence that happens to mention a term ("Bon trimestre.", "3rd term exams start…").
    if (s.length > 60) continue;
    const t = detectTerm(s);
    if (!t) continue;
    const letters = (s.match(/[\p{L}\p{N}]/gu) ?? []).length;
    const share = (t.text.match(/[\p{L}\p{N}]/gu) ?? []).length / Math.max(1, letters);
    if (share >= 0.35 || isPeriodLabel(s.replace(t.text, ' ')) || /\b(?:19|20)\d{2}\b/.test(asciiDigits(s))) {
      return { term: String(t.index), label: t.text.charAt(0).toUpperCase() + t.text.slice(1) };
    }
  }
  return null;
}

export interface ExtractResult {
  extraction: Extraction;
  tables: TableResult;
  profile: SystemProfile | undefined;
}

export function extract(doc: DocTokens, kb: KnowledgeBase, opts: ExtractOptions = {}): ExtractResult {
  const tables = readTables(doc);
  const allText = tables.rows.map(rowText).join('\n');
  const guess = detectSystem(allText, kb.systems);
  const forced = opts.systemId ? kb.systems.find((s) => s.id === opts.systemId) : undefined;
  const profile = forced ?? guess.profile;
  const script = dominantScript(allText);
  const rtl = script === 'arabic' || script === 'hebrew';
  const language = SCRIPT_LANG[script] ?? profile?.languages[0] ?? 'und';

  // ── student / school ──
  const pairs = readInfo(tables.freeRows, rtl);
  const first = (f: InfoField) => pairs.find((p) => p.field === f);
  const nameP = first('name');
  const dobP = first('dob');
  const idP = first('id');
  const schoolP = first('school');
  const issuedP = first('issued');
  const conf = (p: Pair) => Math.min(0.98, p.cell.conf);
  const student = { name: empty(''), dob: empty(''), id: empty('') };
  if (nameP) student.name = { value: displayName(nameP.value), original: nameP.value, confidence: conf(nameP), source: src(nameP.cell) };
  let dobAmbiguous = false;
  if (dobP) {
    const order = /mm\s*[/.-]\s*dd/i.test(dobP.label) ? 'mdy' : /dd\s*[/.-]\s*mm/i.test(dobP.label) ? 'dmy' : (profile?.dateOrder ?? 'dmy');
    const d = parseDate(dobP.value, order);
    dobAmbiguous = !!d?.ambiguous && !profile;
    student.dob = { value: d?.iso ?? '', original: dobP.value, confidence: d ? conf(dobP) * (d.ambiguous && !profile ? 0.6 : 1) : 0.2, source: src(dobP.cell) };
  }
  if (idP) student.id = { value: asciiDigits(idP.value).trim(), original: idP.value, confidence: conf(idP), source: src(idP.cell) };
  let school: Field<string> = empty('');
  if (schoolP) school = { value: schoolP.value.trim(), original: schoolP.value, confidence: conf(schoolP), source: src(schoolP.cell) };
  else {
    const cell = tables.freeRows.slice(0, 10).flatMap((r) => r.cells).find((c) => looksLikeSchool(c.text) && !/[:：]/.test(c.text) && c.text.length < 100);
    if (cell) school = { value: cell.text.trim(), original: cell.text, confidence: Math.min(0.7, cell.conf), source: src(cell) };
  }
  let issued: Field<string> | undefined;
  if (issuedP) {
    const d = parseDate(issuedP.value, profile?.dateOrder ?? 'dmy');
    if (d) issued = { value: d.iso, original: issuedP.value, confidence: conf(issuedP), source: src(issuedP.cell) };
  }

  // ── Each report's header: grade level, school year and term ──
  // A record can hold several reports (one file per term or per year, or several reports in one PDF), so these
  // are read page by page and never taken from another file.
  const headers = reportHeaders(tables, pairs, profile, doc);

  const englishDoc = (profile?.languages[0] ?? '') === 'en' || (!profile && script === 'latin' && /\b(subject|grade|school|name|date of birth)\b/i.test(allText));
  const match = buildMatcher(kb, profile, englishDoc);
  stripRowNumbers(tables.courses);
  const courses = tables.courses.map((c, i) => toCourse(c, i, { profile, header: headers[c.name.page] ?? headers[0], ocr: doc.kind === 'ocr', match }));
  for (const c of courses) {
    c.termUnit ??= unitOf(c.period.value);
    if (c.wholeYear) c.term = undefined;
  }
  // A term printed once on a report ("Second Term") applies to every course of that report that has none.
  for (const c of courses) {
    if (c.term || c.wholeYear) continue;
    const span = (headers[c.name.source?.page ?? 0] ?? headers[0]).span;
    if (!span) continue;
    c.term = span.term;
    c.termUnit = unitOf(span.label);
    if (!c.period.value) c.period = { value: span.label, original: span.label, confidence: 0.9 };
    else if (!c.period.value.toLowerCase().includes(span.label.toLowerCase())) c.period.value = `${span.label} · ${c.period.value}`;
  }

  const extraction: Extraction = {
    systemId: { value: profile?.id ?? 'generic', confidence: forced ? 1 : profile ? Math.min(0.99, 0.55 + guess.score / 40) : 0.3 },
    docType: profile?.name ?? 'Unprofiled system',
    country: { value: findCountry(allText, profile), confidence: profile ? 0.9 : 0.6 },
    language,
    student,
    school: { name: school },
    issued,
    courses,
    flags: [],
    method: 'rules',
  };
  if (dobAmbiguous) {
    extraction.flags.push({ id: 'dob-order', severity: 'check', title: 'Date of birth: day/month order unclear', detail: `“${dobP!.value}” could be read two ways. Confirm against another document.`, source: student.dob.source });
  }
  return { extraction, tables, profile };
}
