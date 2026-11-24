// Course name → canonical concept (+ English name). Rules and dictionaries only: no model needed.
import { asciiDigits, key, similarity } from './text.ts';
import type { Concept, KnowledgeBase, SystemProfile, TranslationSource } from './types.ts';

export interface CourseLookup {
  conceptId: string;
  /** English name ('' when no translation is available). */
  en: string;
  translation: TranslationSource;
  /** 0–1 */
  confidence: number;
  /** How the match was made, for the reasoning panel. */
  how: 'system-profile' | 'system-profile-fuzzy' | 'alias' | 'alias-part' | 'alias-fuzzy' | 'none';
  matched?: string;
}

// A trailing course number: after a space, or directly after a CJK/Hangul character ("수학Ⅰ" → "수학i").
const NUMERAL = /(?:\s+|(?<=[぀-鿿가-힯]))(?:(i{1,3}|iv|v|vi{0,3})|([1-9]))$/;

/** "Matemáticas1" / "Quimica ll" / "Ética IIl" → proper Roman numerals (common OCR confusions). */
export function fixOcrNumerals(name: string): string {
  let s = name.replace(/\s+/g, ' ').trim();
  s = s.replace(/([\p{Ll}])([1Il|]{1,3})$/u, (_m, a: string, n: string) => (n.length <= 3 && /[\p{Ll}]/u.test(a) && /^[1Il|]+$/.test(n) && !/^l+$/.test(n) ? `${a} ${n}` : a + n));
  s = s.replace(/\s([1Il|]{1,3})$/, (_m, n: string) => ' ' + 'I'.repeat(n.length));
  s = s.replace(/\s[1Il|]V$/, ' IV').replace(/\sV[1Il|]$/, ' VI');
  return s;
}

function splitNumeral(k: string): { base: string; suffix: string } {
  const m = NUMERAL.exec(k);
  if (!m) return { base: k, suffix: '' };
  return { base: k.slice(0, m.index), suffix: (m[1] ?? m[2]).toUpperCase() };
}

const hasLatin = (s: string) => /[a-z]/.test(s);

function containsWords(hay: string, needle: string): boolean {
  if (!hasLatin(needle)) return hay.includes(needle);
  return ` ${hay} `.includes(` ${needle} `);
}

const titleCase = (s: string) =>
  s === s.toUpperCase() && /[A-Z]{3}/.test(s)
    ? s.toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase()).replace(/\b(Of|And|In|The|For|To)\b/g, (w) => w.toLowerCase())
    : s;

export type Matcher = (name: string, level?: number | null) => CourseLookup;

export function buildMatcher(kb: KnowledgeBase, profile: SystemProfile | undefined, englishDoc: boolean): Matcher {
  // A name can mean different courses at different levels ("Matemáticas III" is the last year of secundaria, and also
  // the analytic geometry of bachillerato), so each name keeps every course it names, with its US grade range.
  type Entry = { en: string; concept: string; levels?: [number, number] };
  const entries = new Map<string, Entry[]>();
  const add = (k: string, e: Entry) => entries.set(k, [...(entries.get(k) ?? []), e]);
  for (const c of profile?.courses ?? []) for (const n of c.names) add(key(n), { en: c.en, concept: c.concept, levels: c.levels });
  const at = (k: string, level: number | null | undefined): Entry | undefined => {
    const all = entries.get(k);
    if (!all) return undefined;
    const open = all.filter((e) => !e.levels);
    if (level == null) return open[0] ?? all[0];
    return all.find((e) => e.levels && level >= e.levels[0] && level <= e.levels[1]) ?? open[0];
  };
  const profileIndex = { has: (k: string) => entries.has(k), keys: () => entries.keys() };
  // A translated record prints the English names ("Mathematics I" for "Matemáticas I"), so the profile's own English
  // names are known too, with and without their gloss ("Mathematics I (Algebra)"). They never replace a native name.
  for (const c of profile?.courses ?? [])
    for (const en of [c.en, c.en.replace(/\s*\([^)]*\)\s*/g, ' ').trim()]) if (en && !profileIndex.has(key(en))) add(key(en), { en: c.en, concept: c.concept, levels: c.levels });
  const aliasIndex: { alias: string; concept: Concept }[] = [];
  for (const c of kb.concepts) for (const a of [c.label, ...c.aliases]) aliasIndex.push({ alias: key(a), concept: c });
  aliasIndex.sort((a, b) => b.alias.length - a.alias.length);
  const aliasExact = new Map<string, Concept>();
  for (const a of [...aliasIndex].reverse()) aliasExact.set(a.alias, a.concept);

  const match = (rawName: string, level?: number | null): CourseLookup => {
    // Weekly hours printed after the name ("MATEMÁTICAS I (5)") are not part of it.
    const name = asciiDigits(rawName).replace(/\s+/g, ' ').trim().replace(/\s*\(\s*\d{1,2}\s*\)$/, '');
    // "Ciencias III (énfasis en Química)": a general subject taught as one science is that science.
    const emph = /(?:^|[\s(])(?:[ée]nfasis|enfoque|emphasis|ênfase)\s+(?:en|in|on|em)\s+(\p{L}[\p{L} ]{2,40}?)\s*\)?$/iu.exec(name);
    if (emph) {
      const inner = match(emph[1], level);
      if (inner.conceptId !== 'elective.other' && inner.confidence >= 0.85) {
        const science = /^\s*(ciencias?|science|ci[êe]ncias?)\b/i.test(name);
        return { ...inner, en: science ? `Science (emphasis on ${inner.en})` : inner.en, confidence: Math.min(inner.confidence, 0.9) };
      }
    }
    const k = key(name);
    const { base, suffix } = splitNumeral(k);
    const withSuffix = (en: string) => (suffix && !new RegExp(`\\b${suffix}$`, 'i').test(en) ? `${en} ${suffix}` : en);
    const same = englishDoc && /[A-Za-z]/.test(name);
    const english = (fallback: string, src: TranslationSource): { en: string; translation: TranslationSource } =>
      same ? { en: titleCase(name), translation: 'same' } : { en: fallback, translation: src };

    // 1. The system profile's own course list.
    const pk0 = at(k, level);
    const p = pk0 ?? at(base, level);
    if (p) {
      const en = pk0 ? p.en : withSuffix(p.en);
      return { conceptId: p.concept, ...english(en, 'system-profile'), confidence: 0.97, how: 'system-profile', matched: p.en };
    }
    // 2. Exact concept alias.
    const exact = aliasExact.get(k) ?? aliasExact.get(base);
    if (exact) return { conceptId: exact.id, ...english(withSuffix(exact.label), 'dictionary'), confidence: 0.9, how: 'alias', matched: exact.label };
    // 3. Fuzzy on the system profile (OCR typos).
    let best: { score: number; en: string; concept: string } | null = null;
    for (const pk of profileIndex.keys()) {
      const v = at(pk, level);
      if (!v || Math.abs(pk.length - base.length) > 3) continue;
      const s = Math.max(similarity(pk, k), similarity(pk, base));
      if (s >= 0.84 && (!best || s > best.score)) best = { score: s, en: v.en, concept: v.concept };
    }
    if (best) {
      return { conceptId: best.concept, ...english(withSuffix(best.en), 'system-profile'), confidence: 0.6 + 0.3 * best.score, how: 'system-profile-fuzzy', matched: best.en };
    }
    // 4. Longest alias contained in the name ("Spécialité Mathématiques", "General Biology 1").
    for (const { alias, concept } of aliasIndex) {
      const minLen = hasLatin(alias) ? 4 : 2;
      if (alias.length >= minLen && containsWords(k, alias)) {
        return { conceptId: concept.id, ...english(withSuffix(concept.label), 'dictionary'), confidence: 0.78, how: 'alias-part', matched: concept.label };
      }
    }
    // 5. Fuzzy alias.
    let fz: { score: number; concept: Concept } | null = null;
    for (const { alias, concept } of aliasIndex) {
      if (alias.length < 5 || Math.abs(alias.length - base.length) > 2) continue;
      const s = similarity(alias, base);
      if (s >= 0.84 && (!fz || s > fz.score)) fz = { score: s, concept };
    }
    if (fz) return { conceptId: fz.concept.id, ...english(withSuffix(fz.concept.label), 'dictionary'), confidence: 0.45 + 0.25 * fz.score, how: 'alias-fuzzy', matched: fz.concept.label };

    return { conceptId: 'elective.other', ...english('', 'none'), confidence: 0.2, how: 'none' };
  };
  return match;
}

export const conceptById = (kb: KnowledgeBase, id: string) => kb.concepts.find((c) => c.id === id) ?? concepts0;
const concepts0: Concept = { id: 'elective.other', label: 'Elective (unclassified)', area: 'elective', sced: '22 Miscellaneous', aliases: [] };
