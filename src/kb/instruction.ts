// The language each system's secondary schools teach in, from the cited source. Where a source could not be found,
// the entry says "unknown": evalua never guesses this, because a wrong answer can put a student who was taught in
// English into English-learner classes, or the reverse.
// Sources read on 2026-11-17.
import type { InstructionLanguage, SourceInfo } from '../core/types.ts';

const YEAR = '2026-27';
const ADDED = '2026-11-17';
const src = (title: string, url: string): SourceInfo => ({ title, url });
const entry = (languages: string[], varies: InstructionLanguage['varies'], note: string, source: SourceInfo, more?: SourceInfo[]): InstructionLanguage => ({
  languages, varies, note, provenance: { source, schoolYear: YEAR, addedOn: ADDED }, more,
});

const WENR = (country: string, slug: string) => src(`WES World Education News & Reviews: ${country} secondary education (Language of Instruction)`, `https://wenr.wes.org/country-profiles/secondary-sections/${slug}-secondary-education/`);
const GAMBIA = src('ADEA Knowledge Hub: The Gambia, overview of the country', 'https://knowledgehub.adeanet.org/node/161');
const SIERRA_LEONE = src('Parliament of Sierra Leone: The Basic and Senior Secondary Education Act, 2023, Part XI (English is medium of instruction)', 'https://www.parliament.gov.sl/uploads/acts/The Basic and Senior Secondary Education Act, 2023.pdf');
const CONST = (country: string, slug: string) => src(`Constitute Project: constitution of ${country} (English translation)`, `https://www.constituteproject.org/constitution/${slug}`);
const LIBERIA = src('UNESCO GEM education profiles: Liberia (Education Reform Act 2011)', 'https://education-profiles.org/node/320');

export const INSTRUCTION = {
  waec: entry(
    ['en'], 'no',
    'Secondary schools in The Gambia, Nigeria, Ghana, Sierra Leone and Liberia teach in English. National languages are used only in the first years of primary school (grades 1–3 in The Gambia and Ghana).',
    GAMBIA, [WENR('Nigeria', 'nigeria'), WENR('Ghana', 'ghana'), SIERRA_LEONE, LIBERIA],
  ),
  gabece: entry(
    ['en'], 'no',
    'Upper basic schools (grades 7–9) in The Gambia teach in English, as do the comparable BECE systems in Ghana, Nigeria, Sierra Leone and Liberia. National languages are used only in grades 1–3.',
    GAMBIA, [WENR('Ghana', 'ghana'), WENR('Nigeria', 'nigeria'), SIERRA_LEONE, LIBERIA],
  ),
  jamb: entry(['en'], 'no', 'Nigerian secondary schools teach in English, and the UTME is taken in English.', WENR('Nigeria', 'nigeria')),
  ib: entry(
    ['en', 'fr', 'es'], 'by-school',
    'IB schools teach and examine in English, French or Spanish (the IB’s three working languages), and some in other languages. Which one depends on the school.',
    src('International Baccalaureate: Language policy', 'https://ibo.org/language-policy/'),
  ),
  uk: entry(
    ['en'], 'by-school',
    'Schools in the UK teach in English, except Welsh-medium schools in Wales (about a quarter of pupils there) and Gaelic-medium schools in Scotland.',
    src('Welsh Government: Schools’ census results, January 2024', 'https://www.gov.wales/schools-census-results-january-2024-html'),
  ),
  'in-cbse': entry(
    ['en', 'hi'], 'by-school',
    'CBSE schools teach in English or in Hindi, depending on the school. The record or the school can say which.',
    WENR('India', 'india'),
  ),
  'in-cisce': entry(
    ['en'], 'no',
    'The ICSE and ISC are designed for study through the medium of English, and CISCE schools are English-medium.',
    src('CISCE: Indian Certificate of Secondary Education (ICSE)', 'https://cisce.org/?p=276356'),
  ),
  cn: entry(['zh'], 'no', 'Chinese secondary schools teach in Standard Chinese (Mandarin).', WENR('China', 'china')),
  'mx-sep': entry(
    ['es'], 'by-region',
    'Mexican schools teach in Spanish. Students who speak an indigenous language may be taught in that language and Spanish.',
    src('Cámara de Diputados: Ley General de Educación', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGE.pdf'),
  ),
  fr: entry(
    ['fr'], 'no',
    'French is the language of teaching and examinations in French schools (Code de l’éducation).',
    src('Légifrance: Code de l’éducation (langue de l’enseignement)', 'https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006071191/'),
  ),
  de: entry(['de'], 'no', 'German secondary schools teach in German.', WENR('Germany', 'germany')),
  'ph-k12': entry(
    ['en', 'fil'], 'by-subject',
    'Filipino and English are the primary languages of instruction in Philippine secondary schools (Republic Act 10533, Section 4). The Act does not say which subjects use which.',
    src('Republic Act No. 10533 (Enhanced Basic Education Act of 2013), Section 4', 'https://lawphil.net/statutes/repacts/ra2013/ra_10533_2013.html'),
  ),
  br: entry(['pt'], 'no', 'Brazilian secondary schools (ensino médio) teach in Portuguese.', WENR('Brazil', 'brazil')),
  kr: entry(['ko'], 'no', 'South Korean secondary schools teach in Korean.', WENR('South Korea', 'south-korea')),
  vn: entry(
    ['vi'], 'no',
    'Vietnamese is the official language of schools in Vietnam (Law on Education 2019, Article 11).',
    src('Law on Education No. 43/2019/QH14, Article 11', 'https://caselaw.vn/van-ban-phap-luat/334488-luat-giao-duc-so-43-2019-qh14-ngay-14-06-2019-cua-quoc-hoi'),
  ),
  ru: entry(
    ['ru'], 'by-region',
    'Russian schools teach in Russian; schools in the republics may also teach in the republic’s state language (Federal Law 273-FZ, Article 14).',
    src('Federal Law No. 273-FZ “On Education in the Russian Federation”, Article 14', 'https://legalacts.ru/doc/273_FZ-ob-obrazovanii/glava-2/statja-14/'),
  ),
  // Whether some Egyptian schools teach in English or French is not stated in the source, so it is left unknown.
  eg: entry(['ar'], 'unknown', 'Egyptian secondary schools teach in Arabic. Whether this student’s school taught some subjects in another language is not known from the system.', WENR('Egypt', 'egypt')),
  // ── Latin America and the Caribbean: constitutions (Constitute Project, English text), else an education law or the
  // IEA PIRLS / TIMSS encyclopedias. Private bilingual schools exist everywhere; where they matter, "varies" says so.
  ar: entry(['es'], 'by-school', 'Spanish is the medium of instruction in all public schools in Argentina; private bilingual schools also teach in another language, and indigenous peoples have a constitutional right to bilingual intercultural education (Art. 75).', src('IEA PIRLS 2016 Encyclopedia: Buenos Aires, Argentina', 'https://pirls2016.org/encyclopedia/benchmarking-participants/buenos-aires-argentina'), [CONST('Argentina', 'Argentina_1994')]),
  co: entry(['es'], 'by-region', 'Spanish is the official language of Colombia (Constitution Art. 10); communities with their own languages are taught bilingually.', CONST('Colombia', 'Colombia_2015')),
  ve: entry(['es'], 'by-region', 'Spanish is the official language of Venezuela (Constitution Art. 9); indigenous languages are also official for their peoples.', CONST('Venezuela', 'Venezuela_2009')),
  do: entry(['es'], 'by-school', 'Spanish is the official language of the Dominican Republic (Constitution Art. 29).', CONST('the Dominican Republic', 'Dominican_Republic_2015')),
  pe: entry(['es'], 'by-region', 'Spanish is an official language of Peru, as are Quechua, Aymara and other native languages where they predominate (Constitution Art. 48), which some schools teach in.', CONST('Peru', 'Peru_2021')),
  cl: entry(['es'], 'by-school', 'Spanish is the language of instruction in the vast majority of Chilean schools; a few bilingual schools teach subjects in a foreign language, and some schools teach in indigenous languages.', src('IEA TIMSS 2015 Encyclopedia: Chile', 'https://timss2015.org/encyclopedia/?p=116')),
  ec: entry(['es'], 'by-region', 'Spanish is Ecuador’s official language; Kichwa and Shuar are official for intercultural ties, and people have the right to learn in their own language (Constitution Arts. 2 and 29).', CONST('Ecuador', 'Ecuador_2021')),
  bo: entry(['es'], 'by-region', 'Spanish and the languages of Bolivia’s indigenous peoples are official (Constitution Art. 5); schools teach in Spanish and, in many regions, an indigenous language.', CONST('Bolivia', 'Bolivia_2009')),
  py: entry(['es', 'gn'], 'by-school', 'Paraguay has two official languages, Spanish and Guaraní; schooling begins in the student’s own official language and both are taught (Constitution Art. 77).', CONST('Paraguay', 'Paraguay_2011')),
  uy: entry(['es'], 'by-region', 'Uruguay’s Education Law names Uruguayan Spanish, Uruguayan Portuguese and Uruguayan Sign Language as the country’s mother tongues (Ley 18.437, Art. 40).', src('IMPO: Ley General de Educación 18.437, Art. 40', 'https://impo.com.uy/bases/leyes/18437-2008/40')),
  gt: entry(['es'], 'by-region', 'Spanish is the official language of Guatemala (Constitution Art. 143); schools in mainly indigenous areas teach bilingually.', CONST('Guatemala', 'Guatemala_1993')),
  hn: entry(['es'], 'by-school', 'Spanish is the official language of Honduras (Constitution Art. 6).', CONST('Honduras', 'Honduras_2013')),
  sv: entry(['es'], 'by-school', 'Spanish is the official language of El Salvador (Constitution Art. 62).', CONST('El Salvador', 'El_Salvador_2014')),
  ni: entry(['es'], 'by-region', 'Spanish is the official language of Nicaragua (Constitution Art. 11); peoples of the Atlantic Coast have the right to intercultural education in their own language (Art. 121).', CONST('Nicaragua', 'Nicaragua_2014')),
  cr: entry(['es'], 'by-school', 'Spanish is the official language of Costa Rica (Constitution Art. 76).', CONST('Costa Rica', 'Costa_Rica_2020')),
  pa: entry(['es'], 'by-school', 'Education in Panama is given in the official language, Spanish (Constitution Arts. 7 and 100).', CONST('Panama', 'Panama_2004')),
  cu: entry(['es'], 'no', 'Spanish is the official language of Cuba (Constitution Art. 2).', CONST('Cuba', 'Cuba_2019')),
  pr: entry([], 'unknown', 'Many private schools in Puerto Rico teach in English; the source does not say which language public schools use, so it is not known from the system. Check the record or ask the school.', src('Scholaro: Education System in Puerto Rico', 'https://www.scholaro.com/db/Countries/Puerto-Rico/Education-System')),
  sn: entry(['fr'], 'by-school', 'French is the official language of Senegal (Constitution Art. 1).', CONST('Senegal', 'Senegal_2016')),
  generic: entry([], 'unknown', 'The education system was not recognised, so the language of instruction is not known from it.', src('evalua: no profile for this system', 'https://evalua-5ly.pages.dev/#/reference')),
} satisfies Record<string, InstructionLanguage>;
