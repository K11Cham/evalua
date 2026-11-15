// Extraction: positioned text → structured record (student, school, system, courses), with provenance.
import type { Cell, Row } from './layout.ts';
import { rowText } from './layout.ts';
import { academicYear, genericLevel, infoField, infoFieldExact, isGradeLike, looksLikeSchool, splitGrade, termOf, type InfoField } from './lexicon.ts';
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
    let continued = false;
    for (const c of row.cells) {
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

function toCourse(raw: RawCourse, i: number, ctx: { profile?: SystemProfile; docLevel: number | null; docYear?: string; ocr: boolean; match: ReturnType<typeof buildMatcher> }): ExtractedCourse {
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
  const lv = resolveLevel(raw.period, ctx.profile);
  course.level = lv.level ?? ctx.docLevel;
  course.term = lv.term ?? termOf(raw.period);
  course.academicYear = academicYear(raw.period) ?? ctx.docYear;
  return course;
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

  // ── document-level year and grade level (exam certificates have no per-table heading) ──
  let docLevel: number | null = null;
  let docYear: string | undefined;
  for (const r of tables.freeRows.slice(0, 14)) {
    const t = rowText(r);
    if (/[:：]/.test(t) && !/class|grade|कक्षा|classe|klasse|lớp/i.test(t)) continue;
    if (docLevel == null) docLevel = resolveLevel(t, profile).level;
    if (!docYear) {
      const m = /\b(20\d{2})\b/.exec(asciiDigits(t));
      if (m && !/born|birth|naci|naiss|geboren|生|생년|sinh|ميلاد|рожд|जन्म/i.test(t)) docYear = academicYear(t) ?? m[1];
    }
  }
  if (docLevel == null) docLevel = profile?.defaultLevel ?? null;

  const englishDoc = (profile?.languages[0] ?? '') === 'en' || (!profile && script === 'latin' && /\b(subject|grade|school|name|date of birth)\b/i.test(allText));
  const match = buildMatcher(kb, profile, englishDoc);
  const courses = tables.courses.map((c, i) => toCourse(c, i, { profile, docLevel, docYear, ocr: doc.kind === 'ocr', match }));

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
