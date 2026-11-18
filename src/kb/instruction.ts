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
  generic: entry([], 'unknown', 'The education system was not recognised, so the language of instruction is not known from it.', src('evalua: no profile for this system', 'https://evalua-5ly.pages.dev/#/reference')),
} satisfies Record<string, InstructionLanguage>;
