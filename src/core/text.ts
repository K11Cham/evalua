// Text utilities: normalisation across scripts, similarity, dates.

const DIGIT_MAP: Record<string, string> = {};
'٠١٢٣٤٥٦٧٨٩'.split('').forEach((d, i) => (DIGIT_MAP[d] = String(i))); // Arabic-Indic
'۰۱۲۳۴۵۶۷۸۹'.split('').forEach((d, i) => (DIGIT_MAP[d] = String(i))); // Extended Arabic-Indic
'०१२३४५६७८९'.split('').forEach((d, i) => (DIGIT_MAP[d] = String(i))); // Devanagari
'০১২৩৪৫৬৭৮৯'.split('').forEach((d, i) => (DIGIT_MAP[d] = String(i))); // Bengali
'๐๑๒๓๔๕๖๗๘๙'.split('').forEach((d, i) => (DIGIT_MAP[d] = String(i))); // Thai

/** Converts any supported script's digits to ASCII and applies NFKC (full-width → half-width, Ⅰ → I…). */
export function asciiDigits(s: string): string {
  return s.normalize('NFKC').replace(/[٠-٩۰-۹०-९০-৯๐-๙]/g, (d) => DIGIT_MAP[d] ?? d);
}

/** Strips diacritics from Latin text; leaves other scripts intact. */
export function stripDiacritics(s: string): string {
  return s
    .normalize('NFD')
    .replace(/(?<=[a-zA-Z])[̀-ͯ]+/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFC');
}

/**
 * Matching key: lower-case, ASCII digits, no diacritics on Latin letters, punctuation → space,
 * single spaces. Keeps letters of every script.
 */
export function key(s: string): string {
  return stripDiacritics(asciiDigits(s))
    // Words OCR ran together ("SecondarySchool", "StateofOrigin") are split where a word meets a capitalised word.
    // Both sides must look like words, so an OCR case slip inside one word ("OChO", "McDonald") stays whole.
    .replace(/(?<=\p{Ll}{2})(?=\p{Lu}\p{Ll}{2})/gu, ' ')
    .toLowerCase()
    .replace(/[ـ‌-‏ً-ْ]/g, '') // tatweel, bidi marks, Arabic vowel marks
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىی]/g, 'ي')
    .replace(/ھ/g, 'ه')
    .replace(/ک/g, 'ك')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
    .trim();
}

/** Like key() but with no spaces at all: tolerant of OCR dropping or adding spaces. */
export function tightKey(s: string): string {
  return key(s).replace(/ /g, '');
}

export function levenshtein(a: string, b: string, cap = Infinity): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > cap) return cap + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** 0–1 similarity on tight keys. */
export function similarity(a: string, b: string): number {
  const x = tightKey(a);
  const y = tightKey(b);
  if (!x.length && !y.length) return 1;
  if (!x.length || !y.length) return 0;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

/** True when most letters are right-to-left script. */
export function isRtl(s: string): boolean {
  const rtl = (s.match(/[֐-ࣿיִ-﷿ﹰ-ﻼ]/g) ?? []).length;
  const ltr = (s.match(/[A-Za-zÀ-ɏЀ-ӿ]/g) ?? []).length;
  return rtl > ltr;
}

export type Script = 'latin' | 'han' | 'hangul' | 'kana' | 'cyrillic' | 'arabic' | 'devanagari' | 'thai' | 'greek' | 'hebrew' | 'other';

const SCRIPT_RE: [Script, RegExp][] = [
  ['latin', /[A-Za-zÀ-ɏḀ-ỿ]/g],
  ['han', /[一-鿿㐀-䶿]/g],
  ['hangul', /[가-힯ᄀ-ᇿ]/g],
  ['kana', /[぀-ヿ]/g],
  ['cyrillic', /[Ѐ-ӿ]/g],
  ['arabic', /[؀-ۿݐ-ݿ]/g],
  ['devanagari', /[ऀ-ॿ]/g],
  ['thai', /[฀-๿]/g],
  ['greek', /[Ͱ-Ͽ]/g],
  ['hebrew', /[֐-׿]/g],
];

/** Letter counts per script. */
export function scriptCounts(s: string): Record<Script, number> {
  const out = { latin: 0, han: 0, hangul: 0, kana: 0, cyrillic: 0, arabic: 0, devanagari: 0, thai: 0, greek: 0, hebrew: 0, other: 0 } as Record<Script, number>;
  for (const [name, re] of SCRIPT_RE) out[name] = (s.match(re) ?? []).length;
  return out;
}

export function dominantScript(s: string): Script {
  const c = scriptCounts(s);
  let best: Script = 'other';
  let n = 0;
  for (const k of Object.keys(c) as Script[]) if (c[k] > n) ((best = k), (n = c[k]));
  return best;
}

// ───────────── numbers ─────────────

/** Parses "13,5", "8.0", "087", "9/10" (→ 9) into a number; null when not numeric. */
export function parseNumber(raw: string): number | null {
  const s = asciiDigits(raw).trim().replace(/\s/g, '');
  const m = /^(-?\d+(?:[.,]\d+)?)(?:\/\d+(?:[.,]\d+)?)?%?$/.exec(s);
  if (!m) return null;
  const v = Number(m[1].replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

// ───────────── dates ─────────────

const MONTHS: Record<string, number> = {};
const addMonths = (names: string[]) => names.forEach((n, i) => (MONTHS[key(n)] = (i % 12) + 1));
addMonths(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']);
addMonths(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']);
addMonths(['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']);
addMonths(['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']);
addMonths(['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember']);
addMonths(['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']);
addMonths(['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']);
addMonths(['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']);
addMonths(['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर']);
MONTHS[key('sept')] = 9;
MONTHS[key('setiembre')] = 9;

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) =>
  y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : null;

export interface ParsedDate {
  iso: string;
  /** True when day/month order could not be determined from the text. */
  ambiguous: boolean;
}

/**
 * Finds a date in free text in any of the supported languages/formats.
 * `order` is the day/month convention to assume for all-numeric dates.
 */
export function parseDate(raw: string, order: 'dmy' | 'mdy' | 'ymd' = 'dmy'): ParsedDate | null {
  const s = asciiDigits(raw);
  let m: RegExpExecArray | null;
  // CJK: 2007年3月14日 / 2008년 7월 3일
  if ((m = /(\d{4})\s*[年년]\s*(\d{1,2})\s*[月월]\s*(\d{1,2})\s*[日일]/.exec(s))) {
    const r = iso(+m[1], +m[2], +m[3]);
    if (r) return { iso: r, ambiguous: false };
  }
  // Vietnamese: 11 tháng 01 năm 2008
  if ((m = /(\d{1,2})\s*th[aá]ng\s*(\d{1,2})\s*n[aă]m\s*(\d{4})/i.exec(s))) {
    const r = iso(+m[3], +m[2], +m[1]);
    if (r) return { iso: r, ambiguous: false };
  }
  // Day + month name + year: "21 de septiembre de 2007", "3rd February, 2006", "6 июня 2007 года", "14-Nov-2006"
  if ((m = /(\d{1,2})(?:st|nd|rd|th|er|\.|º)?[\s\-./]*(?:de\s+|of\s+)?([\p{L}\p{M}]{3,})\.?,?[\s\-./]*(?:de\s+|del\s+)?(\d{4})/iu.exec(s))) {
    const mo = MONTHS[key(m[2])];
    if (mo) {
      const r = iso(+m[3], mo, +m[1]);
      if (r) return { iso: r, ambiguous: false };
    }
  }
  // Month name + day + year: "February 3, 2006"
  if ((m = /([\p{L}\p{M}]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/iu.exec(s))) {
    const mo = MONTHS[key(m[1])];
    if (mo) {
      const r = iso(+m[3], mo, +m[2]);
      if (r) return { iso: r, ambiguous: false };
    }
  }
  // Year first: 2007/04/25, 2007-04-25
  if ((m = /(\d{4})[-./](\d{1,2})[-./](\d{1,2})/.exec(s))) {
    const r = iso(+m[1], +m[2], +m[3]);
    if (r) return { iso: r, ambiguous: false };
  }
  // Numeric with year last: 17/08/2007, 04/26/2008, 19.10.2007
  if ((m = /(\d{1,2})[-./](\d{1,2})[-./](\d{4})/.exec(s))) {
    const a = +m[1];
    const b = +m[2];
    const y = +m[3];
    if (a > 12 && b <= 12) return wrap(iso(y, b, a), false);
    if (b > 12 && a <= 12) return wrap(iso(y, a, b), false);
    const r = order === 'mdy' ? iso(y, a, b) : iso(y, b, a);
    return wrap(r, a !== b);
  }
  return null;
}

function wrap(r: string | null, ambiguous: boolean): ParsedDate | null {
  return r ? { iso: r, ambiguous } : null;
}

/** "JALLOW, Fatoumatta Binta" → "Fatoumatta Binta Jallow"; fixes ALL-CAPS for display. */
export function displayName(raw: string): string {
  let s = raw.trim().replace(/\s+/g, ' ');
  const comma = /^([^,]+),\s*(.+)$/.exec(s);
  if (comma) s = `${comma[2]} ${comma[1]}`;
  // Initials ("G.D", "A.") stay in capitals.
  const initials = (w: string) => /^(\p{L}\.)+\p{L}?\.?$/u.test(w);
  if (/[A-Z]/.test(s) && s === s.toUpperCase()) {
    s = s
      .split(' ')
      .map((w) => (initials(w) ? w.toUpperCase() : w.toLowerCase().replace(/(^|[-'’])(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase())))
      .join(' ');
  } else {
    // Mixed case with a shouting surname: "Akosua Serwaa MENSAH"
    s = s.replace(/\b(\p{Lu}{2,})\b/gu, (w) => w[0] + w.slice(1).toLowerCase());
  }
  return s;
}

/** Order-insensitive comparison of personal names. */
export function sameName(a: string, b: string): boolean {
  const toks = (s: string) => key(s).split(' ').filter(Boolean).sort().join(' ');
  return toks(a) === toks(b);
}
