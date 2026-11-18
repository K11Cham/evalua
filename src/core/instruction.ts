// The language a student was taught in, and how strong the evidence is. This is never a decision about English-learner
// status: in the US that follows the district's identification process (a home language survey, then a language
// screener). It is evidence for that process, so a student taught in English is not assumed to need English classes
// because of the country on the record, which is what happens when staff go by country of origin.
import { key } from './text.ts';
import type { Extraction, InstructionAssessment, SystemProfile } from './types.ts';

// Language names as they appear on records, in the languages evalua reads → BCP-47.
const LANGUAGE_NAMES: [string, string[]][] = [
  ['en', ['english', 'inglés', 'ingles', 'anglais', 'inglês', 'ingles', 'englisch', 'англиискии', 'английский', '英语', '英文', '영어', 'tiếng anh', 'الإنجليزية', 'الانجليزية', 'अंग्रेज़ी', 'अंग्रेजी']],
  ['es', ['spanish', 'español', 'espanol', 'castellano', 'espagnol', 'espanhol', 'spanisch']],
  ['pt', ['portuguese', 'português', 'portugues', 'portugais', 'portugiesisch']],
  ['fr', ['french', 'français', 'francais', 'francés', 'frances', 'francês', 'französisch', 'الفرنسية']],
  ['de', ['german', 'deutsch', 'alemán', 'aleman', 'allemand', 'alemão']],
  ['hi', ['hindi', 'हिंदी', 'हिन्दी']],
  ['ar', ['arabic', 'árabe', 'arabe', 'العربية', 'عربي']],
  ['zh', ['chinese', 'mandarin', 'putonghua', '汉语', '中文', '普通话']],
  ['ko', ['korean', '한국어', '국어']],
  ['vi', ['vietnamese', 'tiếng việt', 'tieng viet']],
  ['ru', ['russian', 'русский', 'русском']],
  ['fil', ['filipino', 'tagalog']],
  ['wo', ['wolof']],
];
const NAME_TO_CODE = new Map<string, string>();
for (const [code, names] of LANGUAGE_NAMES) for (const n of names) NAME_TO_CODE.set(key(n), code);

export const LANGUAGE_LABEL: Record<string, string> = {
  en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French', de: 'German', hi: 'Hindi', ar: 'Arabic', zh: 'Chinese', ko: 'Korean', vi: 'Vietnamese', ru: 'Russian', fil: 'Filipino', wo: 'Wolof',
};
const label = (codes: string[]) => codes.map((c) => LANGUAGE_LABEL[c] ?? c).join(' or ');

// "Medium of instruction: English", "Langue d'enseignement : français", "Idioma de instrucción: español"…
const STATEMENT =
  /(medium of (?:instruction|teaching)|language of (?:instruction|teaching)|instruction language|langue d['’ ]?(?:enseignement|instruction)|lengua de (?:instrucción|instruccion|enseñanza|ensenanza)|idioma de (?:instrucción|instruccion|enseñanza|ensenanza)|l[íi]ngua de (?:instrução|instrucao|ensino)|unterrichtssprache|教学语言|授课语言|язык (?:обучения|преподавания)|ngôn ngữ giảng dạy|لغة التدريس|शिक्षा का माध्यम|माध्यम)\s*[:：\-–]?\s*([\p{L} ,/&]+?)(?=$|[.;\n]|\s{2,})/iu;

// "Certified translation", "translated by", a sworn translator's statement, in the languages evalua reads.
const TRANSLATION =
  /\b(certified (?:english )?translation|official translation|sworn translat|true (?:and (?:accurate|correct) )?translation|accurate translation|translated (?:from|by|into)|translator['’]?s? (?:statement|certificat|declaration|stamp|seal)|certified translator|traducci[óo]n (?:certificada|oficial|jurada|fiel)|traductor (?:p[úu]blico|jurado|certificado)|traduction (?:certifi[ée]e|officielle|asserment[ée]e)|traducteur (?:agr[ée]{1,2}|asserment[ée])|tradu[çc][ãa]o (?:juramentada|oficial)|tradutor (?:p[úu]blico|juramentado)|beglaubigte [üu]bersetzung|vereidigte[rn]? [üu]bersetzer)/iu;


/** Languages named in a statement value ("English", "Inglés y español"). */
function languagesIn(value: string): string[] {
  const k = ` ${key(value)} `;
  const out: string[] = [];
  for (const [name, code] of NAME_TO_CODE) if (k.includes(` ${name} `) && !out.includes(code)) out.push(code);
  return out;
}

export function printedInstruction(text: string): { languages: string[]; match: string } | null {
  for (const line of text.split(/\n/)) {
    const m = STATEMENT.exec(line);
    if (!m) continue;
    const languages = languagesIn(m[2]);
    if (languages.length) return { languages, match: m[0].trim() };
  }
  return null;
}

export function translationMarker(text: string): string | null {
  const m = TRANSLATION.exec(text);
  return m ? m[0] : null;
}

const VARIES: Record<string, string> = {
  'by-school': 'it depends on the school',
  'by-subject': 'it depends on the subject',
  'by-region': 'it can depend on the region',
  unknown: 'whether the student’s own school differed is not known',
};

/**
 * What the evidence says about the language the student was taught in, strongest first: a statement printed on the
 * record, then the system profile, then (weakly) the language the record is written in. A translation's language
 * says nothing about instruction.
 */
export function assessInstruction(ex: Pick<Extraction, 'language' | 'stated'> & { country?: Extraction['country'] }, profile: SystemProfile | undefined): InstructionAssessment {
  const evidence: InstructionAssessment['evidence'] = [];
  const translated = ex.stated?.translation?.text;
  if (translated) evidence.push({ text: `The record says it is a translation (“${translated}”), so the language it is written in says nothing about the language the student was taught in.`, ref: ex.stated?.translation?.source });

  const printed = ex.stated?.instruction ? { languages: ex.stated.instruction.languages, match: ex.stated.instruction.text } : null;
  const inst = profile?.instruction;
  if (printed) {
    evidence.push({ text: `The record states it: “${printed.match}”.`, ref: ex.stated?.instruction?.source });
    if (inst?.languages.length) evidence.push({ text: inst.note, source: inst.provenance.source });
    const english = printed.languages.includes('en');
    return { languages: printed.languages, english, strength: 'printed', translated: !!translated, summary: `Taught in ${label(printed.languages)}: the record says so.`, evidence };
  }
  if (inst && inst.languages.length) {
    const strong = inst.varies === 'no';
    evidence.push({ text: inst.note, source: inst.provenance.source });
    for (const s of inst.more ?? []) evidence.push({ text: `Also: ${s.title}.`, source: s });
    const english = inst.languages.includes('en') ? (inst.languages.length === 1 ? true : null) : false;
    // The record's own country when it names one ("The Gambia’s"), else the system's.
    const country = ex.country?.value && !ex.country.value.includes('/') ? ex.country.value : profile!.countries.length === 1 ? profile!.countries[0] : '';
    const where = country ? `${country}’s` : `${profile!.countries.slice(0, -1).join(', ')} and ${profile!.countries.at(-1)}’s`;
    const summary = strong
      ? `Taught in ${label(inst.languages)}: ${where} secondary schools teach in ${label(inst.languages)}.`
      : `Usually taught in ${label(inst.languages)} in ${where} schools, but ${VARIES[inst.varies]}. Check the record or ask the school.`;
    return { languages: inst.languages, english, strength: strong ? 'system' : 'system-varies', translated: !!translated, summary, evidence };
  }
  // Only the document's own language is left. Weak: many records are English translations of the original.
  if (!translated && ex.language) {
    evidence.push({ text: `The record is written in ${LANGUAGE_LABEL[ex.language] ?? ex.language}. That is weak evidence: many records are translations, and the education system was not recognised.` });
    return { languages: [ex.language], english: null, strength: 'document', translated: false, summary: `Not known. The record is written in ${LANGUAGE_LABEL[ex.language] ?? ex.language}, which alone does not show the language of instruction.`, evidence };
  }
  return { languages: [], english: null, strength: 'unknown', translated: !!translated, summary: 'Not known from this record. Ask the school or the family which language the student was taught in.', evidence };
}

/** How strong the evidence is, in words. */
export const STRENGTH_LABEL: Record<InstructionAssessment['strength'], string> = {
  printed: 'Strong: stated on the record',
  system: 'Good: the education system teaches in one language',
  'system-varies': 'Partial: the system teaches in more than one language',
  document: 'Weak: only the language the record is written in',
  unknown: 'None',
};

