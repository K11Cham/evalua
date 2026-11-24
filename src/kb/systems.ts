// International system profiles. Every scale names the published table it follows; US equivalents are
// conventions used by evaluators, not law, and a counselor can override any of them.
// Grade tables were read from the cited pages on 2026-11-15.
import { INSTRUCTION } from './instruction.ts';
import { latamSystems, sn } from './latam.ts';
import type { GradeScale, Provenance, ScaleEntry, SourceInfo, SystemCourse, SystemProfile, USLetter } from '../core/types.ts';

const YEAR = '2026-27';
const ADDED = '2026-11-15';
const prov = (title: string, url?: string): Provenance => ({ source: { title, url }, schoolYear: YEAR, addedOn: ADDED });
const scholaro = (country: string, slug: string) => prov(`Scholaro: Grading System in ${country}`, `https://www.scholaro.com/db/Countries/${slug}/Grading-System`);
const WENR_WA: SourceInfo = { title: 'WES World Education News & Reviews: Ghana secondary education (BECE, WASSCE)', url: 'https://wenr.wes.org/country-profiles/secondary-sections/ghana-secondary-education/' };

const L = (labels: string[], us: USLetter, descriptor?: string): ScaleEntry => ({ labels, us, descriptor });
const R = (min: number, max: number, us: USLetter, descriptor?: string): ScaleEntry => ({ min, max, us, descriptor });
const course = (names: string[], en: string, concept: string, levels?: [number, number]): SystemCourse => ({ names, en, concept, ...(levels ? { levels } : {}) });
const d = (term: string, weight: number) => ({ term, weight });

const WAEC_LABELS: ScaleEntry[] = [
  L(['A1'], 'A', 'Excellent'), L(['B2'], 'A', 'Very Good'), L(['B3'], 'B', 'Good'), L(['C4'], 'B', 'Credit'), L(['C5'], 'C', 'Credit'), L(['C6'], 'C', 'Credit'),
  L(['D7'], 'D', 'Pass'), L(['E8'], 'D', 'Pass'), L(['F9'], 'F', 'Fail'),
];

const waec: SystemProfile = {
  id: 'waec',
  instruction: INSTRUCTION['waec'],
  name: 'WAEC / NECO senior secondary (WASSCE, SSCE, school transcripts)',
  countries: ['The Gambia', 'Nigeria', 'Ghana', 'Sierra Leone', 'Liberia'],
  languages: ['en'],
  summary:
    'Senior secondary school (SS/SHS 1–3) in Anglophone West Africa ends with the West African Senior School Certificate Examination (WASSCE) run by WAEC; Nigeria also has the NECO SSCE. Subjects are graded A1 (best) to F9. Universities in the region usually require credits (C6 or better) in five subjects including English and Mathematics.',
  detect: [
    d('west african examinations council', 8), d('wassce', 8), d('west african senior school certificate', 8), d('senior school certificate examination', 6), d('national examinations council', 7),
    d('neco', 5), d('ssce', 5), d('senior secondary school', 4), d('senior high school', 4), d('ss 1', 2), d('ss 2', 2), d('ss 3', 2), d('shs 1', 2), d('shs 2', 2), d('shs 3', 2),
    d('a1', 1), d('b2', 1), d('b3', 1), d('c4', 1), d('c5', 1), d('c6', 1), d('d7', 1), d('e8', 1), d('f9', 1), d('civic education', 2), d('core mathematics', 3), d('further mathematics', 1),
    d('nigeria', 1), d('ghana', 1), d('gambia', 1), d('sierra leone', 1), d('liberia', 1),
  ],
  dateOrder: 'dmy',
  levels: [
    { pattern: '\\b(ss|sss|shs|s\\.s\\.s?)\\s*\\.?\\s*(1|one|i)\\b', level: 10 },
    { pattern: '\\b(ss|sss|shs|s\\.s\\.s?)\\s*\\.?\\s*(2|two|ii)\\b', level: 11 },
    { pattern: '\\b(ss|sss|shs|s\\.s\\.s?)\\s*\\.?\\s*(3|three|iii)\\b', level: 12 },
    { pattern: '\\b(jss|jhs)\\s*\\.?\\s*3\\b', level: 9 },
    { pattern: '\\bgrade\\s*10\\b', level: 10 },
    { pattern: '\\bgrade\\s*11\\b', level: 11 },
    { pattern: '\\bgrade\\s*12\\b', level: 12 },
  ],
  defaultLevel: 12,
  scales: [
    { id: 'waec-grades', label: 'WAEC grades A1–F9 → US letter (Scholaro, Gambia/Nigeria)', kind: 'labels', passing: 'E8 is the lowest pass; C6 is the lowest credit', entries: WAEC_LABELS, provenance: scholaro('the Gambia', 'Gambia') },
    {
      id: 'waec-percent', label: 'WAEC percentage bands → US letter (Scholaro, Gambia/Nigeria)', kind: 'numeric', domain: [0, 100], requiresAbove: 9,
      entries: [R(75, 100, 'A', 'A1 Excellent'), R(70, 74.99, 'A', 'B2 Very Good'), R(65, 69.99, 'B', 'B3 Good'), R(60, 64.99, 'B', 'C4 Credit'), R(55, 59.99, 'C', 'C5 Credit'), R(50, 54.99, 'C', 'C6 Credit'), R(45, 49.99, 'D', 'D7 Pass'), R(40, 44.99, 'D', 'E8 Pass'), R(0, 39.99, 'F', 'F9 Fail')],
      provenance: scholaro('Nigeria', 'Nigeria'),
      note: 'Ghana publishes different percentage bands (A1 from 80%); when a letter-number grade is printed it is used instead of the percentage.',
    },
  ],
  credit: {
    examCourseYears: 3,
    note: 'A WASSCE or SSCE subject is examined at the end of three years of senior secondary study (SS/SHS 1–3). Year-by-year school transcripts show the same subjects each year.',
    provenance: { source: WENR_WA, schoolYear: YEAR, addedOn: ADDED },
  },
  courses: [
    course(['Core Mathematics', 'General Mathematics'], 'Mathematics', 'math.general'),
    course(['Elective Mathematics', 'Further Mathematics'], 'Further Mathematics', 'math.advanced'),
    course(['Integrated Science'], 'Integrated Science', 'sci.integrated'),
    course(['Social Studies'], 'Social Studies', 'ss.social'),
    course(['Civic Education'], 'Civic Education', 'ss.civics'),
    course(['Government'], 'Government', 'ss.civics'),
    course(['Literature in English', 'Literature-in-English'], 'Literature in English', 'ela.literature'),
    course(['Christian Religious Studies', 'Christian Religious Knowledge', 'C.R.S.', 'CRS', 'CRK'], 'Christian Religious Studies', 'ss.religion'),
    course(['Islamic Studies', 'Islamic Religious Studies', 'Islamic Religious Knowledge', 'I.R.S.', 'IRS', 'IRK'], 'Islamic Studies', 'ss.religion'),
    course(['Agricultural Science'], 'Agricultural Science', 'cte.agriculture'),
    course(['Data Processing'], 'Data Processing', 'cs'),
    course(['Computer Studies'], 'Computer Studies', 'cs'),
    course(['Financial Accounting', 'Principles of Accounts'], 'Financial Accounting', 'cte.business'),
    course(['Commerce'], 'Commerce', 'cte.business'),
    course(['Technical Drawing'], 'Technical Drawing', 'cte.technology'),
    course(['Food and Nutrition', 'Foods and Nutrition', 'Home Management'], 'Food and Nutrition', 'cte.home'),
  ],
  documentation: [
    WENR_WA,
    { title: 'WAEC Nigeria', url: 'https://www.waecnigeria.org' },
    { title: 'WAEC Ghana', url: 'https://www.waecgh.org' },
    { title: 'National Examinations Council (NECO), Nigeria', url: 'https://neco.gov.ng' },
  ],
  provenance: { source: WENR_WA, schoolYear: YEAR, addedOn: ADDED },
};

const gabece: SystemProfile = {
  id: 'gabece',
  instruction: INSTRUCTION['gabece'],
  name: 'GABECE / BECE (end of Grade 9 basic education)',
  countries: ['The Gambia', 'Ghana', 'Nigeria', 'Sierra Leone', 'Liberia'],
  languages: ['en'],
  summary:
    'The Gambia Basic Education Certificate Examination (GABECE) is taken at the end of Grade 9 (upper basic school). Subjects are graded 1 (best) to 9; the aggregate adds the four core subjects (English, Mathematics, Science, Social and Environmental Studies) and the two best others, so 6 is the best possible aggregate. Ghana, Sierra Leone and Liberia run comparable BECE examinations.',
  detect: [
    d('gabece', 10), d('gambia basic education certificate', 10), d('basic education certificate examination', 8), d('bece', 6), d('upper basic', 4), d('junior high school', 3),
    d('junior secondary', 3), d('aggregate', 2), d('social and environmental studies', 3),
  ],
  dateOrder: 'dmy',
  levels: [{ pattern: '\\b(grade|jss|jhs|form)\\s*\\.?\\s*(9|3)\\b', level: 9 }],
  defaultLevel: 9,
  scales: [
    {
      id: 'gabece-1-9', label: 'GABECE/BECE grades 1–9 → US letter (numeric WAEC scale, Scholaro, Gambia)', kind: 'numeric', domain: [1, 9], passing: 'Grades 1–6 are credits; 7–8 pass; 9 fail',
      entries: [R(1, 1, 'A', 'Excellent'), R(2, 2, 'A', 'Very Good'), R(3, 3, 'B', 'Good'), R(4, 4, 'B', 'Credit'), R(5, 5, 'C', 'Credit'), R(6, 6, 'C', 'Credit'), R(7, 7, 'D', 'Pass'), R(8, 8, 'D', 'Pass'), R(9, 9, 'F', 'Fail')],
      provenance: scholaro('the Gambia', 'Gambia'),
    },
  ],
  credit: {
    examCourseYears: 1,
    fitToYear: true,
    aggregate: { core: ['ela.english', 'math.', 'sci.integrated', 'ss.social'], best: 2, bestPossible: 6, label: 'aggregate' },
    note: 'GABECE/BECE covers Grades 7–9. Only the Grade 9 year is normally considered for US high school credit, and many districts treat it as evidence of Grade 9 completion rather than course-by-course credit, so the certificate\'s subjects share one normal year of credit. The aggregate adds the four core subjects and the best two others; 6 is the best possible.',
    provenance: { source: WENR_WA, schoolYear: YEAR, addedOn: ADDED },
  },
  courses: [
    course(['Social and Environmental Studies', 'Social and Env. Studies', 'Social & Environmental Studies', 'Social and Env Studies', 'SES', 'S.E.S'], 'Social and Environmental Studies', 'ss.social'),
    course(['Science', 'General Science', 'Integrated Science'], 'Science', 'sci.integrated'),
    course(['Islamic Religious Knowledge', 'Christian Religious Knowledge', 'Islamic Religious Studies', 'Islamic Rel. Studies', 'Christian Religious Studies', 'Christian Rel. Studies', 'IRK', 'CRK', 'IRS', 'CRS'], 'Religious Knowledge', 'ss.religion'),
    course(['Physical and Health Education', 'Physical & Health Educ.', 'Physical and Health Educ.', 'Physical & Health Education', 'PHE'], 'Physical and Health Education', 'pe'),
    course(['Art and Craft', 'Arts and Crafts', 'Art & Craft'], 'Art and Craft', 'arts.visual'),
    course(['Technical Drawing'], 'Technical Drawing', 'cte.technology'),
    course(['Agricultural Science', 'Agriculture'], 'Agricultural Science', 'cte.agriculture'),
    course(['Home Economics', 'Home Science'], 'Home Economics', 'cte.home'),
    course(['Arabic'], 'Arabic', 'wl.other'),
    course(['French'], 'French', 'wl.other'),
    course(['Religious and Moral Education'], 'Religious and Moral Education', 'ss.religion'),
    course(['Basic Design and Technology'], 'Basic Design and Technology', 'cte.technology'),
  ],
  documentation: [WENR_WA, { title: 'WAEC The Gambia', url: 'https://waecgambia.org' }],
  provenance: { source: WENR_WA, schoolYear: YEAR, addedOn: ADDED },
};

const jamb: SystemProfile = {
  id: 'jamb',
  instruction: INSTRUCTION['jamb'],
  name: 'JAMB UTME (Nigeria university entrance test)',
  countries: ['Nigeria'],
  languages: ['en'],
  summary:
    'The Unified Tertiary Matriculation Examination (UTME) is run by the Joint Admissions and Matriculation Board for admission to Nigerian universities. Candidates sit Use of English plus three subjects, each scored out of 100, for a total out of 400. It is an admission test, not a record of coursework.',
  detect: [d('joint admissions and matriculation board', 12), d('jamb', 8), d('utme', 8), d('unified tertiary matriculation', 10), d('aggregate score', 2), d('use of english', 3)],
  dateOrder: 'dmy',
  levels: [],
  defaultLevel: 12,
  scales: [
    {
      id: 'jamb-score', label: 'UTME subject score (0–100): not converted to a letter grade', kind: 'numeric', domain: [0, 100],
      entries: [{ min: 0, max: 100, us: 'NC', descriptor: 'Admission-test score, not a course grade' }],
      provenance: prov('Joint Admissions and Matriculation Board (JAMB)', 'https://www.jamb.gov.ng'),
    },
  ],
  credit: {
    noCredit: true,
    note: 'Use it as supporting evidence of subjects studied; ask for the WASSCE/NECO result or school transcript for credit.',
    provenance: prov('Joint Admissions and Matriculation Board (JAMB)', 'https://www.jamb.gov.ng'),
  },
  courses: [course(['Use of English'], 'Use of English', 'ela.english')],
  documentation: [{ title: 'Joint Admissions and Matriculation Board (JAMB)', url: 'https://www.jamb.gov.ng' }, WENR_WA],
  provenance: prov('Joint Admissions and Matriculation Board (JAMB)', 'https://www.jamb.gov.ng'),
};

const IB_SRC = prov('Scholaro: IB Diploma scale (shown on its country grading pages)', 'https://www.scholaro.com/db/Countries/United-Kingdom/Grading-System');
const ib: SystemProfile = {
  id: 'ib',
  instruction: INSTRUCTION['ib'],
  name: 'International Baccalaureate (Diploma Programme)',
  countries: ['International'],
  languages: ['en'],
  summary:
    'IB Diploma Programme subjects are studied over two years (grades 11–12) at Higher Level (HL) or Standard Level (SL) and graded 1–7. Theory of Knowledge and the Extended Essay are graded A–E. The diploma needs 24 of 45 points.',
  detect: [d('international baccalaureate', 12), d('diploma programme', 6), d('theory of knowledge', 5), d('extended essay', 5), d('ibo', 3), d('personal code', 3), d('hl', 1), d('sl', 1), d('middle years programme', 5)],
  dateOrder: 'dmy',
  levels: [
    { pattern: '\\b(dp|year)\\s*1\\b|\\bgrade\\s*11\\b', level: 11 },
    { pattern: '\\b(dp|year)\\s*2\\b|\\bgrade\\s*12\\b', level: 12 },
    { pattern: '\\bmyp\\s*5\\b|\\bgrade\\s*10\\b', level: 10 },
    { pattern: '\\bmyp\\s*4\\b|\\bgrade\\s*9\\b', level: 9 },
  ],
  defaultLevel: 12,
  scales: [
    { id: 'ib-1-7', label: 'IB grades 1–7 → US letter (Scholaro IB Diploma scale)', kind: 'numeric', domain: [1, 7], passing: '4 is the usual passing grade', entries: [R(6, 7, 'A'), R(5, 5.99, 'B'), R(4, 4.99, 'C'), R(3, 3.99, 'D'), R(1, 2.99, 'F')], provenance: IB_SRC },
    {
      id: 'ib-core', label: 'IB core components A–E (Theory of Knowledge, Extended Essay)', kind: 'labels',
      entries: [L(['A'], 'A', 'Excellent'), L(['B'], 'B', 'Good'), L(['C'], 'C', 'Satisfactory'), L(['D'], 'D', 'Mediocre'), L(['E'], 'F', 'Elementary (failing condition)')],
      provenance: prov('International Baccalaureate: Diploma Programme assessment', 'https://www.ibo.org/programmes/diploma-programme/assessment-and-exams/'),
      note: 'There is no published US table for the A–E core grades; this follows the IB descriptors.',
    },
  ],
  credit: {
    examCourseYears: 2,
    note: 'Each Diploma Programme subject is a two-year course (grades 11–12).',
    provenance: prov('International Baccalaureate: Diploma Programme curriculum', 'https://www.ibo.org/programmes/diploma-programme/curriculum/'),
  },
  courses: [
    course(['Theory of Knowledge', 'TOK'], 'Theory of Knowledge', 'ss.philosophy'),
    course(['Extended Essay'], 'Extended Essay', 'elective.other'),
    course(['Mathematics: Analysis and Approaches', 'Mathematics Analysis and Approaches', 'Math AA'], 'Mathematics: Analysis and Approaches', 'math.general'),
    course(['Mathematics: Applications and Interpretation', 'Mathematics Applications and Interpretation', 'Math AI'], 'Mathematics: Applications and Interpretation', 'math.general'),
    course(['Environmental Systems and Societies', 'ESS'], 'Environmental Systems and Societies', 'sci.environmental'),
    course(['Language and Literature'], 'Language and Literature', 'ela.english'),
    course(['Business Management'], 'Business Management', 'cte.business'),
    course(['Global Politics'], 'Global Politics', 'ss.civics'),
    course(['Sports, Exercise and Health Science'], 'Sports, Exercise and Health Science', 'health'),
    course(['Design Technology'], 'Design Technology', 'cte.technology'),
  ],
  documentation: [{ title: 'International Baccalaureate Organization', url: 'https://www.ibo.org' }],
  provenance: IB_SRC,
};

const UK_SRC = scholaro('the United Kingdom', 'United-Kingdom');
const uk: SystemProfile = {
  id: 'uk',
  instruction: INSTRUCTION['uk'],
  name: 'UK GCSE and A level',
  countries: ['United Kingdom'],
  languages: ['en'],
  summary:
    'GCSEs are taken at the end of Year 11 (age 16) and graded 9 (best) to 1 in England, with 4 a standard pass; older and Welsh/Northern Irish certificates use A*–G. A levels are two-year courses taken in Years 12–13 and graded A*–E. U means unclassified.',
  detect: [d('gcse', 10), d('general certificate of secondary education', 10), d('a level', 6), d('gce', 5), d('candidate statement of results', 6), d('statement of provisional results', 6), d('unique candidate identifier', 6), d('awarding organisation', 4), d('igcse', 8), d('year 11', 2), d('year 13', 2), d('sixth form', 3), d('ofqual', 4)],
  dateOrder: 'dmy',
  levels: [
    { pattern: '\\byear\\s*10\\b', level: 9 },
    { pattern: '\\byear\\s*11\\b', level: 10 },
    { pattern: '\\byear\\s*12\\b|lower sixth', level: 11 },
    { pattern: '\\byear\\s*13\\b|upper sixth', level: 12 },
  ],
  defaultLevel: 10,
  scales: [
    {
      id: 'uk-alevel', label: 'GCE A level A*–E → US letter (Scholaro, UK)', kind: 'labels', hint: 'a level|advanced|gce|year\\s*1[23]|sixth',
      entries: [L(['A*', 'A'], 'A'), L(['B'], 'B'), L(['C'], 'B'), L(['D'], 'C'), L(['E'], 'C', 'Lowest pass'), L(['U'], 'F', 'Ungraded')],
      provenance: UK_SRC,
    },
    {
      id: 'uk-gcse-9-1', label: 'GCSE 9–1 → US letter (Scholaro, UK “New GCSE”)', kind: 'labels', passing: '4 is a standard pass',
      entries: [L(['9', '8', '7'], 'A'), L(['6'], 'B'), L(['5', '4'], 'C'), L(['3', '2', '1'], 'D'), L(['U'], 'F', 'Ungraded')],
      provenance: UK_SRC,
    },
    {
      id: 'uk-gcse-letters', label: 'GCSE A*–G → US letter (Scholaro, UK)', kind: 'labels',
      entries: [L(['A*', 'A'], 'A'), L(['B'], 'B'), L(['C'], 'C'), L(['D', 'E', 'F', 'G'], 'D'), L(['U'], 'F', 'Ungraded')],
      provenance: UK_SRC,
    },
  ],
  credit: {
    examCourseYears: 2,
    note: 'A GCSE is normally a two-year course (Years 10–11) and an A level a two-year course (Years 12–13).',
    provenance: prov('Ofqual: GCSE grading (9 to 1)', 'https://www.gov.uk/government/publications/gcse-new-grading-scale-factsheets'),
  },
  courses: [
    course(['Combined Science', 'Combined Science: Trilogy', 'Combined Science: Synergy', 'Double Award Science'], 'Combined Science', 'sci.integrated'),
    course(['Design and Technology'], 'Design and Technology', 'cte.technology'),
    course(['Citizenship Studies'], 'Citizenship Studies', 'ss.civics'),
    course(['Food Preparation and Nutrition'], 'Food Preparation and Nutrition', 'cte.home'),
    course(['Further Mathematics'], 'Further Mathematics', 'math.advanced'),
  ],
  documentation: [{ title: 'Ofqual', url: 'https://www.gov.uk/government/organisations/ofqual' }],
  provenance: UK_SRC,
};

const IN_SRC = scholaro('India', 'India');
const CBSE_PCT: ScaleEntry[] = [R(91, 100, 'A', 'A1'), R(81, 90.99, 'A', 'A2'), R(71, 80.99, 'B', 'B1'), R(61, 70.99, 'B', 'B2'), R(51, 60.99, 'C', 'C1'), R(41, 50.99, 'C', 'C2'), R(33, 40.99, 'D', 'D'), R(0, 32.99, 'F', 'E')];
const inCbse: SystemProfile = {
  id: 'in-cbse',
  instruction: INSTRUCTION['in-cbse'],
  name: 'India: CBSE (Classes IX–XII)',
  countries: ['India'],
  languages: ['en', 'hi'],
  summary:
    'The Central Board of Secondary Education holds board examinations at the end of Class X (Secondary School Examination) and Class XII (Senior School Certificate Examination). Each subject is marked out of 100 (theory plus practical or internal assessment); 33% is the pass mark. A positional grade (A1–E) shows rank among those who passed.',
  detect: [d('central board of secondary education', 12), d('cbse', 8), d('केन्द्रीय माध्यमिक शिक्षा बोर्ड', 12), d('senior school certificate examination', 6), d('secondary school examination', 5), d('marks statement', 4), d('positional grade', 5), d('roll no', 2), d('class xii', 2), d('class x', 1), d('all india', 2)],
  dateOrder: 'dmy',
  levels: [
    { pattern: 'class\\s*\\(?\\s*(xii|12)\\b|senior school certificate', level: 12 },
    { pattern: 'class\\s*\\(?\\s*(xi|11)\\b', level: 11 },
    { pattern: 'class\\s*\\(?\\s*(x|10)\\b|secondary school examination', level: 10 },
    { pattern: 'class\\s*\\(?\\s*(ix|9)\\b', level: 9 },
  ],
  defaultLevel: 12,
  scales: [
    { id: 'cbse-marks', label: 'CBSE marks out of 100 → US letter (Scholaro, CBSE percentage bands)', kind: 'numeric', domain: [0, 100], requiresAbove: 10, passing: '33', entries: CBSE_PCT, provenance: IN_SRC },
    {
      id: 'cbse-grades', label: 'CBSE grades A1–E → US letter (Scholaro, CBSE)', kind: 'labels',
      entries: [L(['A1', 'A-1'], 'A'), L(['A2', 'A-2'], 'A'), L(['B1', 'B-1'], 'B'), L(['B2', 'B-2'], 'B'), L(['C1', 'C-1'], 'C'), L(['C2', 'C-2'], 'C'), L(['D', 'D1', 'D2'], 'D'), L(['E', 'E1', 'E2'], 'F')],
      provenance: IN_SRC,
    },
  ],
  credit: {
    examCourseYears: 2,
    note: 'The Class X examination covers Classes IX–X and the Class XII examination covers Classes XI–XII.',
    provenance: prov('Central Board of Secondary Education', 'https://www.cbse.gov.in'),
  },
  courses: [
    course(['English Core', 'English Elective', 'English Language and Literature', 'English Lang & Lit', 'English Comm.'], 'English', 'ela.english'),
    course(['Hindi Core', 'Hindi Elective', 'Hindi Course-A', 'Hindi Course-B'], 'Hindi', 'wl.native'),
    course(['Mathematics Standard', 'Mathematics Basic', 'Applied Mathematics'], 'Mathematics', 'math.general'),
    course(['Science'], 'Science', 'sci.integrated'),
    course(['Social Science'], 'Social Science', 'ss.social'),
    course(['Informatics Practices', 'Informatics Prac.'], 'Informatics Practices', 'cs'),
    course(['Accountancy'], 'Accountancy', 'cte.business'),
    course(['Business Studies'], 'Business Studies', 'cte.business'),
    course(['Political Science'], 'Political Science', 'ss.civics'),
    course(['Home Science'], 'Home Science', 'cte.home'),
  ],
  documentation: [{ title: 'Central Board of Secondary Education', url: 'https://www.cbse.gov.in' }],
  provenance: IN_SRC,
};

const inCisce: SystemProfile = {
  id: 'in-cisce',
  instruction: INSTRUCTION['in-cisce'],
  name: 'India: CISCE (ICSE Class X, ISC Class XII)',
  countries: ['India'],
  languages: ['en'],
  summary:
    'The Council for the Indian School Certificate Examinations awards the ICSE (Class X) and ISC (Class XII). Subjects are reported as percentage marks; the pass mark is 33% for ICSE and 35% for ISC.',
  detect: [d('council for the indian school certificate examinations', 12), d('cisce', 8), d('icse', 8), d('indian certificate of secondary education', 10), d('indian school certificate', 8), d('isc', 3), d('statement of marks', 3)],
  dateOrder: 'dmy',
  levels: [
    { pattern: 'class\\s*\\(?\\s*(xii|12)\\b|\\bisc\\b|indian school certificate examination', level: 12 },
    { pattern: 'class\\s*\\(?\\s*(xi|11)\\b', level: 11 },
    { pattern: 'class\\s*\\(?\\s*(x|10)\\b|\\bicse\\b', level: 10 },
    { pattern: 'class\\s*\\(?\\s*(ix|9)\\b', level: 9 },
  ],
  defaultLevel: 10,
  scales: [
    { id: 'cisce-marks', label: 'CISCE percentage marks → US letter (Scholaro, CISCE Standard X/XII)', kind: 'numeric', domain: [0, 100], requiresAbove: 10, passing: '33 (ICSE) / 35 (ISC)', entries: [R(60, 100, 'A', 'First Class'), R(50, 59.99, 'B', 'Second Class'), R(33, 49.99, 'C', 'Third Class'), R(0, 32.99, 'F')], provenance: IN_SRC },
    { id: 'cisce-internal', label: 'CISCE internal grades A–E (SUPW and community service)', kind: 'labels', entries: [L(['A'], 'A'), L(['B'], 'B'), L(['C', 'D'], 'C'), L(['E'], 'F')], provenance: IN_SRC },
  ],
  credit: {
    examCourseYears: 2,
    note: 'ICSE covers Classes IX–X; ISC covers Classes XI–XII.',
    provenance: prov('Council for the Indian School Certificate Examinations', 'https://cisce.org'),
  },
  courses: [
    course(['History, Civics and Geography', 'History Civics & Geography', 'H.C.G.'], 'History, Civics and Geography', 'ss.social'),
    course(['Socially Useful Productive Work', 'SUPW', 'SUPW and Community Service'], 'Socially Useful Productive Work and Community Service', 'elective.other'),
    course(['Commercial Studies'], 'Commercial Studies', 'cte.business'),
    course(['Computer Applications'], 'Computer Applications', 'cs'),
  ],
  documentation: [{ title: 'Council for the Indian School Certificate Examinations', url: 'https://cisce.org' }],
  provenance: IN_SRC,
};

const CN_SRC = scholaro('China', 'China');
const cn: SystemProfile = {
  id: 'cn',
  instruction: INSTRUCTION['cn'],
  name: 'China: senior high school (普通高中)',
  countries: ['China'],
  languages: ['zh'],
  summary:
    'Senior high school covers three years (高一, 高二, 高三; grades 10–12), usually reported per semester on a 100-point scale with 60 as the pass mark. Some schools print five-level results (优秀, 良好, 中等, 及格, 不及格). The national curriculum counts 18 class periods as one credit (学分).',
  detect: [d('成绩单', 6), d('普通高中', 6), d('学籍号', 5), d('高一', 2), d('高二', 2), d('高三', 2), d('学业水平', 4), d('会考', 4), d('中学', 3), d('教务处', 3), d('学分', 2), d('百分制', 3), d('语文', 2)],
  dateOrder: 'ymd',
  levels: [
    { pattern: '高一|高中一年级|十年级', level: 10 },
    { pattern: '高二|高中二年级|十一年级', level: 11 },
    { pattern: '高三|高中三年级|十二年级', level: 12 },
    { pattern: '初三|九年级', level: 9 },
  ],
  scales: [
    { id: 'cn-100', label: 'China 100-point scale → US letter (Scholaro, China five-scale)', kind: 'numeric', domain: [0, 100], requiresAbove: 10, passing: '60', entries: [R(90, 100, 'A', 'Excellent 优秀'), R(80, 89.99, 'B', 'Good 良好'), R(70, 79.99, 'C', 'Satisfactory 中等'), R(60, 69.99, 'D', 'Pass 及格'), R(0, 59.99, 'F', 'Fail 不及格')], provenance: CN_SRC },
    { id: 'cn-levels', label: 'China five-level results → US letter (Scholaro, China five-scale)', kind: 'labels', entries: [L(['优秀', '优', 'A'], 'A', 'Excellent'), L(['良好', '良', 'B'], 'B', 'Good'), L(['中等', '中', 'C'], 'C', 'Satisfactory'), L(['及格', 'D'], 'D', 'Pass'), L(['不及格', 'F', 'E'], 'F', 'Fail'), L(['合格', '通过'], 'P', 'Qualified')], provenance: CN_SRC },
  ],
  credit: {
    hoursPerCredit: 13.5,
    note: 'National senior high curriculum plan: one credit is 18 class periods of 45 minutes (13.5 hours).',
    provenance: prov('Ministry of Education of the PRC: 普通高中课程方案 (2017年版2020年修订)', 'http://www.moe.gov.cn/srcsite/A26/s8001/202006/t20200603_462199.html'),
  },
  courses: [
    course(['语文'], 'Chinese Language and Literature', 'wl.native'),
    course(['数学'], 'Mathematics', 'math.general'),
    course(['英语', '外语'], 'English', 'ela.efl'),
    course(['物理'], 'Physics', 'sci.physics'),
    course(['化学'], 'Chemistry', 'sci.chemistry'),
    course(['生物', '生物学'], 'Biology', 'sci.biology'),
    course(['思想政治', '政治'], 'Ideology and Politics', 'ss.civics'),
    course(['历史'], 'History', 'ss.history.world'),
    course(['地理'], 'Geography', 'ss.geography'),
    course(['信息技术'], 'Information Technology', 'cs'),
    course(['通用技术'], 'General Technology', 'cte.technology'),
    course(['体育与健康', '体育'], 'Physical Education and Health', 'pe'),
    course(['音乐'], 'Music', 'arts.music'),
    course(['美术'], 'Fine Arts', 'arts.visual'),
    course(['艺术'], 'Arts', 'arts.visual'),
    course(['综合实践活动', '研究性学习'], 'Comprehensive Practical Activity', 'elective.other'),
    course(['劳动', '劳动教育'], 'Labor Education', 'elective.other'),
  ],
  documentation: [{ title: 'Ministry of Education of the People’s Republic of China', url: 'http://en.moe.gov.cn' }],
  provenance: CN_SRC,
};

const MX_SRC = scholaro('Mexico', 'Mexico');
const mx: SystemProfile = {
  id: 'mx-sep',
  instruction: INSTRUCTION['mx-sep'],
  name: 'Mexico: bachillerato / preparatoria (SEP)',
  countries: ['Mexico'],
  languages: ['es'],
  summary:
    'Upper secondary education (bachillerato or preparatoria) lasts three years, organised in six semesters, and follows grades 1–3 of secundaria. Grades run from 5 to 10 with 6 the minimum pass. The Bachillerato General plan assigns credits per subject (two per weekly class hour in a semester).',
  detect: [d('secretaría de educación pública', 8), d('bachillerato', 6), d('preparatoria', 5), d('curp', 4), d('certificado de terminación de estudios', 8), d('dirección general del bachillerato', 8), d('clave del centro de trabajo', 5), d('calificación', 2), d('semestre', 2), d('historial académico', 4), d('kardex', 4), d('cobach', 5), d('cecyte', 5), d('conalep', 5), d('secundaria', 3), d('promedio general', 3)],
  dateOrder: 'dmy',
  levels: [
    { pattern: '\\b(primer|primero|1er\\.?|1°|1º|segundo|2do\\.?|2°|2º)\\s+semestre', level: 10 },
    { pattern: '\\b(tercer|tercero|3er\\.?|3°|3º|cuarto|4to\\.?|4°|4º)\\s+semestre', level: 11 },
    { pattern: '\\b(quinto|5to\\.?|5°|5º|sexto|6to\\.?|6°|6º)\\s+semestre', level: 12 },
    { pattern: '\\b(primer|1er\\.?)\\s+(año|grado)\\s+(de\\s+)?(bachillerato|preparatoria)', level: 10 },
    { pattern: '\\b(segundo|2do\\.?)\\s+(año|grado)\\s+(de\\s+)?(bachillerato|preparatoria)', level: 11 },
    { pattern: '\\b(tercer|3er\\.?)\\s+(año|grado)\\s+(de\\s+)?(bachillerato|preparatoria)', level: 12 },
    { pattern: '\\b(primer|primero|1er\\.?|1\\s*[°ºo]?)\\s*(año|grado)\\s+(de\\s+)?(educaci[óo]n\\s+)?secundaria', level: 7 },
    { pattern: '\\b(segundo|2do\\.?|2\\s*[°ºo]?)\\s*(año|grado)\\s+(de\\s+)?(educaci[óo]n\\s+)?secundaria', level: 8 },
    { pattern: '\\b(tercer|tercero|3er\\.?|3\\s*[°ºo]?)\\s*(año|grado)\\s+(de\\s+)?(educaci[óo]n\\s+)?secundaria', level: 9 },
    // English translations of the certificate print the semesters in English.
    { pattern: '\\b(first|1st|second|2nd)\\s+semester', level: 10 },
    { pattern: '\\b(third|3rd|fourth|4th)\\s+semester', level: 11 },
    { pattern: '\\b(fifth|5th|sixth|6th)\\s+semester', level: 12 },
  ],
  scales: [
    { id: 'mx-10', label: 'Mexico 0–10 scale, pass at 6 → US letter (Scholaro, Mexico)', kind: 'numeric', domain: [0, 10], passing: '6', entries: [R(9, 10, 'A', 'Excelente / Muy bien'), R(8, 8.99, 'B', 'Bien'), R(6, 7.99, 'C', 'Suficiente'), R(0, 5.99, 'F', 'Reprobado')], provenance: MX_SRC },
    { id: 'mx-100', label: 'Mexico 0–100 scale, pass at 60 → US letter (Scholaro, Mexico)', kind: 'numeric', domain: [0, 100], requiresAbove: 10, passing: '60', entries: [R(90, 100, 'A'), R(80, 89.99, 'B'), R(60, 79.99, 'C'), R(0, 59.99, 'F')], provenance: MX_SRC },
    { id: 'mx-words', label: 'Mexico accreditation marks', kind: 'labels', entries: [L(['AC', 'Acreditada', 'Acreditado', 'A'], 'P', 'Accredited'), L(['NA', 'N/A', 'No acreditada', 'NP'], 'F', 'Not accredited')], provenance: MX_SRC },
  ],
  credit: {
    hoursPerCredit: 8,
    note: 'Bachillerato General study plan: two credits per weekly class hour over a 16-week semester, so one credit is about 8 class hours (a 10-credit subject meets 5 hours a week).',
    provenance: prov('Dirección General del Bachillerato (SEP): plan de estudios', 'https://dgb.sep.gob.mx'),
  },
  courses: [
    // Bachillerato (US grades 10–12).
    course(['Matemáticas I'], 'Mathematics I (Algebra)', 'math.algebra1', [10, 12]),
    course(['Matemáticas II'], 'Mathematics II (Geometry and Trigonometry)', 'math.geometry', [10, 12]),
    course(['Matemáticas III'], 'Mathematics III (Analytic Geometry)', 'math.algebra2', [10, 12]),
    course(['Matemáticas IV'], 'Mathematics IV (Functions)', 'math.precalc', [10, 12]),
    // Secundaria (grades 1–3, US grades 7–9), SEP Plan de Estudios 2011: the same names are the middle-school sequence,
    // and each year's science course has its emphasis (Ciencias I biology, II physics, III chemistry).
    course(['Matemáticas I', 'Matemáticas II', 'Matemáticas III', 'Matemáticas'], 'Mathematics', 'math.general', [7, 9]),
    course(['Español I', 'Español II', 'Español III', 'Español'], 'Spanish', 'wl.native', [7, 9]),
    course(['Ciencias I', 'Ciencias I (énfasis en Biología)'], 'Science I (emphasis on Biology)', 'sci.biology', [7, 9]),
    course(['Ciencias II', 'Ciencias II (énfasis en Física)'], 'Science II (emphasis on Physics)', 'sci.physics', [7, 9]),
    course(['Ciencias III', 'Ciencias III (énfasis en Química)'], 'Science III (emphasis on Chemistry)', 'sci.chemistry', [7, 9]),
    course(['Historia I'], 'History I (world history)', 'ss.history.world', [7, 9]),
    course(['Historia II'], 'History II (history of Mexico)', 'ss.history.national', [7, 9]),
    course(['Segunda Lengua: Inglés', 'Segunda Lengua: Inglés I', 'Segunda Lengua: Inglés II', 'Segunda Lengua: Inglés III', 'Segunda Lengua Inglés'], 'Second Language: English', 'ela.efl'),
    course(['Formación Cívica y Ética', 'Formación Cívica y Ética I', 'Formación Cívica y Ética II'], 'Civic and Ethical Education', 'ss.civics'),
    course(['Tecnología', 'Tecnología I', 'Tecnología II', 'Tecnología III'], 'Technology', 'cte.technology'),
    course(['Educación Física', 'Educación Física I', 'Educación Física II', 'Educación Física III'], 'Physical Education', 'pe'),
    course(['Artes', 'Artes I', 'Artes II', 'Artes III'], 'Arts', 'arts.visual'),
    course(['Asignatura Estatal'], 'State-defined subject', 'elective.other'),
    course(['Taller de Lectura y Redacción'], 'Reading and Writing Workshop', 'wl.native'),
    course(['Literatura'], 'Literature', 'wl.native'),
    course(['Inglés', 'Lengua Adicional al Español', 'Lengua Extranjera'], 'English', 'ela.efl'),
    course(['Informática'], 'Computer Science', 'cs'),
    course(['Ética', 'Ética y Valores'], 'Ethics', 'ss.philosophy'),
    course(['Metodología de la Investigación'], 'Research Methodology', 'elective.other'),
    course(['Introducción a las Ciencias Sociales'], 'Introduction to Social Sciences', 'ss.social'),
    course(['Historia de México'], 'History of Mexico', 'ss.history.national'),
    course(['Historia Universal Contemporánea'], 'Contemporary World History', 'ss.history.world'),
    course(['Estructura Socioeconómica de México'], 'Socioeconomic Structure of Mexico', 'ss.economics'),
    course(['Geografía'], 'Geography', 'ss.geography'),
    course(['Química'], 'Chemistry', 'sci.chemistry'),
    course(['Temas Selectos de Química'], 'Selected Topics in Chemistry', 'sci.chemistry'),
    course(['Física'], 'Physics', 'sci.physics'),
    course(['Biología'], 'Biology', 'sci.biology'),
    course(['Ecología y Medio Ambiente'], 'Ecology and Environment', 'sci.environmental'),
    course(['Cálculo Diferencial'], 'Differential Calculus', 'math.calculus'),
    course(['Cálculo Integral'], 'Integral Calculus', 'math.calculus'),
    course(['Probabilidad y Estadística'], 'Probability and Statistics', 'math.statistics'),
    course(['Filosofía'], 'Philosophy', 'ss.philosophy'),
    course(['Orientación Educativa', 'Tutorías'], 'Educational Guidance', 'elective.other'),
    course(['Actividades Paraescolares', 'Paraescolares'], 'Extracurricular Activities', 'elective.other'),
  ],
  documentation: [{ title: 'Dirección General del Bachillerato (SEP)', url: 'https://dgb.sep.gob.mx' }, { title: 'Secretaría de Educación Pública', url: 'https://www.gob.mx/sep' }],
  provenance: MX_SRC,
};

const FR_SRC = scholaro('France', 'France');
const fr: SystemProfile = {
  id: 'fr',
  instruction: INSTRUCTION['fr'],
  name: 'France: lycée and baccalauréat',
  countries: ['France'],
  languages: ['fr'],
  summary:
    'The lycée lasts three years: Seconde, Première and Terminale (grades 10–12), ending with the baccalauréat. Marks are out of 20 and 10 is the pass mark; marks above 16 are uncommon. Since 2021 the general track combines common subjects with specialty subjects (spécialités).',
  detect: [d('baccalauréat', 8), d('lycée', 6), d('relevé de notes', 7), d('académie', 4), d('bulletin', 3), d('terminale', 4), d('première', 2), d('seconde', 2), d('moyenne', 2), d('appréciations', 3), d('ministère de l éducation nationale', 8), d('proviseur', 4), d('trimestre', 2), d('collège', 2), d('brevet', 4)],
  dateOrder: 'dmy',
  levels: [
    { pattern: '\\bseconde\\b|\\b2nde\\b', level: 10 },
    { pattern: '\\bpremi[èe]re\\b|\\b1[èe]re\\b', level: 11 },
    { pattern: '\\bterminale\\b|\\btle\\b', level: 12 },
    { pattern: '\\btroisi[èe]me\\b|\\b3[èe]me\\b', level: 9 },
  ],
  scales: [
    {
      id: 'fr-20', label: 'France marks out of 20 → US letter (Scholaro, Most Common Francophone)', kind: 'numeric', domain: [0, 20], passing: '10',
      entries: [R(16, 20, 'A', 'Très bien'), R(14, 15.99, 'A', 'Bien'), R(12, 13.99, 'B', 'Assez bien'), R(10, 11.99, 'C', 'Passable'), R(0, 9.99, 'F', 'Échec')],
      provenance: FR_SRC,
      note: 'French marking is severe: the table treats 14/20 and above as an A.',
    },
  ],
  credit: {
    note: 'French transcripts list yearly averages without hours; coefficients show weighting, not instructional time.',
    provenance: prov('Ministère de l’Éducation nationale: le lycée', 'https://www.education.gouv.fr/le-lycee-41642'),
  },
  courses: [
    course(['Français'], 'French', 'wl.native'),
    course(['Histoire-Géographie', 'Histoire Géographie', 'Histoire-géographie'], 'History-Geography', 'ss.history.world'),
    course(['Enseignement moral et civique', 'EMC'], 'Moral and Civic Education', 'ss.civics'),
    course(['Enseignement scientifique'], 'Scientific Education', 'sci.integrated'),
    course(['Sciences de la vie et de la Terre', 'SVT'], 'Life and Earth Sciences', 'sci.biology'),
    course(['Physique-Chimie', 'Physique Chimie'], 'Physics-Chemistry', 'sci.physical'),
    course(['Sciences économiques et sociales', 'SES'], 'Economic and Social Sciences', 'ss.economics'),
    course(['Sciences numériques et technologie', 'SNT'], 'Digital Sciences and Technology', 'cs'),
    course(['Numérique et sciences informatiques', 'NSI'], 'Digital and Computer Sciences', 'cs'),
    course(['Éducation physique et sportive', 'EPS'], 'Physical Education and Sport', 'pe'),
    course(['LVA Anglais', 'Anglais LVA', 'Anglais LV1', 'Anglais'], 'Modern Language A: English', 'ela.efl'),
    course(['LVB Espagnol', 'Espagnol LVB', 'Espagnol LV2', 'Espagnol'], 'Modern Language B: Spanish', 'wl.other'),
    course(['LVB Allemand', 'Allemand LVB', 'Allemand LV2', 'Allemand'], 'Modern Language B: German', 'wl.other'),
    course(['Philosophie'], 'Philosophy', 'ss.philosophy'),
    course(['Spécialité Mathématiques', 'Mathématiques (spécialité)'], 'Specialty: Mathematics', 'math.advanced'),
    course(['Spécialité Physique-Chimie'], 'Specialty: Physics-Chemistry', 'sci.physical'),
    course(['Spécialité Sciences de la vie et de la Terre', 'Spécialité SVT'], 'Specialty: Life and Earth Sciences', 'sci.biology'),
    course(['Histoire-géographie, géopolitique et sciences politiques', 'HGGSP'], 'History-Geography, Geopolitics and Political Science', 'ss.history.world'),
    course(['Humanités, littérature et philosophie', 'HLP'], 'Humanities, Literature and Philosophy', 'ss.philosophy'),
    course(['Mathématiques'], 'Mathematics', 'math.general'),
  ],
  documentation: [{ title: 'Ministère de l’Éducation nationale', url: 'https://www.education.gouv.fr' }, { title: 'Eduscol', url: 'https://eduscol.education.fr' }],
  provenance: FR_SRC,
};

const DE_SRC = scholaro('Germany', 'Germany');
const de: SystemProfile = {
  id: 'de',
  instruction: INSTRUCTION['de'],
  name: 'Germany: Gymnasium and Abitur',
  countries: ['Germany'],
  languages: ['de'],
  summary:
    'Up to grade 10, German schools use marks 1 (sehr gut) to 6 (ungenügend), with 4 the lowest pass. In the gymnasiale Oberstufe (the last two or three years before the Abitur) marks are given as points from 15 to 0, where 5 points is the usual pass.',
  detect: [d('zeugnis', 6), d('abitur', 7), d('allgemeine hochschulreife', 9), d('gymnasium', 5), d('qualifikationsphase', 7), d('einführungsphase', 6), d('befriedigend', 4), d('ausreichend', 4), d('sehr gut', 2), d('jahrgangsstufe', 4), d('schulleiter', 3), d('realschule', 5), d('gesamtschule', 5), d('halbjahr', 3), d('notenstufen', 4), d('punkte', 1)],
  dateOrder: 'dmy',
  levels: [
    { pattern: 'einführungsphase|\\bklasse\\s*10\\b|jahrgangsstufe\\s*10\\b|\\bE1\\b|\\bE2\\b', level: 10 },
    { pattern: 'qualifikationsphase\\s*1|\\bQ1\\b|\\bQ2\\b|jahrgangsstufe\\s*11\\b|\\bklasse\\s*11\\b', level: 11 },
    { pattern: 'qualifikationsphase\\s*2|\\bQ3\\b|\\bQ4\\b|jahrgangsstufe\\s*1[23]\\b|\\bklasse\\s*1[23]\\b', level: 12 },
    { pattern: '\\bklasse\\s*9\\b|jahrgangsstufe\\s*9\\b', level: 9 },
  ],
  scales: [
    {
      id: 'de-words', label: 'German grade words → US letter (Scholaro, Germany)', kind: 'labels', passing: 'ausreichend',
      entries: [L(['sehr gut'], 'A', '1'), L(['gut'], 'A', '2'), L(['befriedigend'], 'B', '3'), L(['ausreichend'], 'C', '4'), L(['mangelhaft'], 'D', '5 (not a pass in Germany)'), L(['ungenügend'], 'F', '6')],
      provenance: DE_SRC,
    },
    {
      id: 'de-points', label: 'German upper-secondary points 15–0 → US letter (Scholaro, Germany, Gymnasium 11th–13th grade)', kind: 'numeric', domain: [0, 15], requiresAbove: 6, hint: 'punkte|qualifikationsphase|kursstufe|oberstufe', passing: '5 points',
      entries: [R(13, 15, 'A', 'sehr gut'), R(10, 12.99, 'A', 'gut'), R(7, 9.99, 'B', 'befriedigend'), R(4, 6.99, 'C', 'ausreichend'), R(1, 3.99, 'D', 'mangelhaft'), R(0, 0.99, 'F', 'ungenügend')],
      provenance: DE_SRC,
    },
    {
      id: 'de-1-6', label: 'German marks 1–6 → US letter (Scholaro, Germany, grades 1–10)', kind: 'numeric', domain: [1, 6], passing: '4',
      entries: [R(1, 2.5, 'A', 'sehr gut / gut'), R(2.51, 3.5, 'B', 'befriedigend'), R(3.51, 4.5, 'C', 'ausreichend'), R(4.51, 5.5, 'D', 'mangelhaft (not a pass in Germany)'), R(5.51, 6, 'F', 'ungenügend')],
      provenance: DE_SRC,
    },
  ],
  credit: {
    note: 'German reports list marks without hours. Subjects in the Oberstufe are taught as basic (Grundkurs) or advanced (Leistungskurs) courses.',
    provenance: prov('Kultusministerkonferenz (KMK): the German education system', 'https://www.kmk.org/dokumentation-statistik/informationen-zum-deutschen-bildungssystem.html'),
  },
  courses: [
    course(['Deutsch'], 'German', 'wl.native'),
    course(['Englisch'], 'English', 'ela.efl'),
    course(['Französisch'], 'French', 'wl.other'),
    course(['Spanisch'], 'Spanish', 'wl.other'),
    course(['Latein'], 'Latin', 'wl.other'),
    course(['Mathematik'], 'Mathematics', 'math.general'),
    course(['Biologie'], 'Biology', 'sci.biology'),
    course(['Chemie'], 'Chemistry', 'sci.chemistry'),
    course(['Physik'], 'Physics', 'sci.physics'),
    course(['Geschichte'], 'History', 'ss.history.world'),
    course(['Erdkunde', 'Geographie'], 'Geography', 'ss.geography'),
    course(['Politik und Wirtschaft', 'Politik', 'Sozialkunde', 'Gemeinschaftskunde', 'Politik-Wirtschaft'], 'Politics and Economics', 'ss.civics'),
    course(['Kunst', 'Bildende Kunst'], 'Art', 'arts.visual'),
    course(['Musik'], 'Music', 'arts.music'),
    course(['Sport'], 'Physical Education', 'pe'),
    course(['Ethik', 'Werte und Normen', 'Philosophie'], 'Ethics', 'ss.philosophy'),
    course(['Religion', 'Religionslehre', 'Katholische Religion', 'Evangelische Religion'], 'Religion', 'ss.religion'),
    course(['Informatik'], 'Computer Science', 'cs'),
    course(['Darstellendes Spiel'], 'Drama', 'arts.performing'),
  ],
  documentation: [{ title: 'Kultusministerkonferenz (KMK)', url: 'https://www.kmk.org' }],
  provenance: DE_SRC,
};

const PH_SRC = scholaro('the Philippines', 'Philippines');
const ph: SystemProfile = {
  id: 'ph-k12',
  instruction: INSTRUCTION['ph-k12'],
  name: 'Philippines: K to 12 (junior and senior high school)',
  countries: ['Philippines'],
  languages: ['en', 'tl'],
  summary:
    'Junior high school is Grades 7–10 and senior high school Grades 11–12, reported on forms such as SF9 (report card) and SF10 (permanent record). Grades are percentages from 60 to 100 with 75 the pass mark; senior high is reported per semester with core, applied and specialized subjects.',
  detect: [d('department of education', 4), d('republic of the philippines', 8), d('deped', 6), d('sf10', 8), d('sf9', 6), d('lrn', 6), d('form 137', 8), d('form 138', 8), d('learner s permanent academic record', 8), d('senior high school', 2), d('track strand', 5), d('araling panlipunan', 6), d('filipino', 3), d('mapeh', 6), d('quarter', 1)],
  dateOrder: 'mdy',
  levels: [
    { pattern: 'grade\\s*(level)?\\s*:?\\s*12\\b', level: 12 },
    { pattern: 'grade\\s*(level)?\\s*:?\\s*11\\b', level: 11 },
    { pattern: 'grade\\s*(level)?\\s*:?\\s*10\\b', level: 10 },
    { pattern: 'grade\\s*(level)?\\s*:?\\s*9\\b', level: 9 },
  ],
  scales: [
    {
      id: 'ph-100', label: 'Philippines percentage grades → US letter (Scholaro, Most Common Secondary)', kind: 'numeric', domain: [0, 100], requiresAbove: 10, passing: '75',
      entries: [R(95, 100, 'A', 'Excellent'), R(90, 94.99, 'B', 'Very Good'), R(85, 89.99, 'B', 'Good'), R(80, 84.99, 'C', 'Satisfactory'), R(75, 79.99, 'C', 'Fairly Satisfactory'), R(0, 74.99, 'F', 'Did not meet expectations')],
      provenance: PH_SRC,
      note: 'DepEd Order 8, s. 2015 describes 90–100 as Outstanding; the US equivalents here follow the Scholaro table.',
    },
  ],
  credit: {
    note: 'Senior high subjects are one semester each (80 hours in the K to 12 curriculum guides).',
    provenance: prov('Department of Education, Philippines: K to 12 Basic Education Curriculum', 'https://www.deped.gov.ph/k-to-12/about/k-to-12-basic-education-curriculum/'),
  },
  courses: [
    course(['Araling Panlipunan', 'AP'], 'Social Studies', 'ss.social'),
    course(['Filipino'], 'Filipino', 'wl.native'),
    course(['Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino'], 'Communication and Research in Filipino Language and Culture', 'wl.native'),
    course(['Pagbasa at Pagsusuri ng Iba’t Ibang Teksto Tungo sa Pananaliksik', "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik"], 'Reading and Analysis of Various Texts Toward Research (Filipino)', 'wl.native'),
    course(['MAPEH', 'Music, Arts, Physical Education and Health'], 'Music, Arts, Physical Education and Health', 'pe'),
    course(['Edukasyon sa Pagpapakatao', 'EsP', 'Values Education'], 'Values Education', 'ss.religion'),
    course(['Technology and Livelihood Education', 'TLE'], 'Technology and Livelihood Education', 'cte.technology'),
    // The English subject of the 2002 Basic Education Curriculum, still on records of students who started before K to 12.
    course(['Communication Arts and Skills Through Philippine Literature', 'Communication Arts and Skills Through Literature', 'Comm. Arts & Skills Through Literature', 'Communication Arts', 'Communication Arts and Skills Through', 'Comm. Arts & Skills Through', 'Comm Arts & Skills Through'], 'English (Communication Arts)', 'ela.english'),
    course(['Speech and Oral Communication', 'Speech & Oral Communication'], 'Speech and Oral Communication', 'ela.english'),
    course(['Christian Living Education', 'Christian Living', 'CLE'], 'Christian Living Education', 'ss.religion'),
    course(['Understanding Culture, Society and Politics'], 'Understanding Culture, Society and Politics', 'ss.social'),
    course(['Personal Development'], 'Personal Development', 'health'),
    course(['Empowerment Technologies'], 'Empowerment Technologies', 'cs'),
    course(['Earth and Life Science'], 'Earth and Life Science', 'sci.earth'),
    course(['Physical Science'], 'Physical Science', 'sci.physical'),
    course(['Contemporary Philippine Arts from the Regions'], 'Contemporary Philippine Arts from the Regions', 'arts.visual'),
    course(['Media and Information Literacy'], 'Media and Information Literacy', 'cs'),
    course(['Introduction to the Philosophy of the Human Person'], 'Introduction to the Philosophy of the Human Person', 'ss.philosophy'),
    course(['Disaster Readiness and Risk Reduction'], 'Disaster Readiness and Risk Reduction', 'sci.earth'),
    course(['Practical Research 1', 'Practical Research 2', 'Inquiries, Investigations and Immersion'], 'Practical Research', 'elective.other'),
  ],
  documentation: [{ title: 'Department of Education, Philippines', url: 'https://www.deped.gov.ph' }],
  provenance: PH_SRC,
};

const KE_SRC = scholaro('Kenya', 'Kenya');
const ke: SystemProfile = {
  id: 'ke',
  instruction: INSTRUCTION['ke'],
  name: 'Kenya: secondary school (Form 1–4, KCSE)',
  countries: ['Kenya'],
  languages: ['en', 'sw'],
  summary:
    'Secondary school is four years after eight years of primary school (Scholaro: “After 4 years of study they write their Kenya Certificate of Secondary Education examination”), so Form 1–4 match US grades 9–12. Report forms give marks out of 100 with KCSE letter grades from A to E.',
  detect: [d('republic of kenya', 10), d('kenya', 6), d('kcse', 8), d('kenya certificate of secondary education', 12), d('knec', 8), d('kenya national examinations council', 10), d('kiswahili', 6), d('history and government', 5), d('history & government', 5), d('christian religious education', 4), d('islamic religious education', 4), d('nairobi', 3), d('mombasa', 3), d('kisumu', 3), d('nakuru', 3), d('eldoret', 3)],
  dateOrder: 'dmy',
  levels: [
    { pattern: '\\bform\\s*(?:1|one|i)\\b', level: 9 },
    { pattern: '\\bform\\s*(?:2|two|ii)\\b', level: 10 },
    { pattern: '\\bform\\s*(?:3|three|iii)\\b', level: 11 },
    { pattern: '\\bform\\s*(?:4|four|iv)\\b', level: 12 },
  ],
  scales: [
    {
      id: 'ke-100', label: 'Kenya marks out of 100 → US letter (Scholaro, KCSE)', kind: 'numeric', domain: [0, 100], requiresAbove: 12, passing: '30 (D−)',
      entries: [R(75, 100, 'A', 'A (80–100), A− (75–79)'), R(60, 74.99, 'B', 'B+ (70–74), B (65–69), B− (60–64)'), R(45, 59.99, 'C', 'C+ (55–59), C (50–54), C− (45–49)'), R(30, 44.99, 'D', 'D+ (40–44), D (35–39), D− (30–34)'), R(0, 29.99, 'F', 'E (0–29)')],
      provenance: KE_SRC,
      note: 'Scholaro gives a US grade with a plus or minus for each KCSE grade; evalua keeps the letter.',
    },
    {
      id: 'ke-letters', label: 'Kenya KCSE letter grades → US letter (Scholaro, KCSE)', kind: 'labels',
      entries: [L(['A', 'A-'], 'A'), L(['B+', 'B', 'B-'], 'B'), L(['C+', 'C', 'C-'], 'C'), L(['D+', 'D', 'D-'], 'D'), L(['E'], 'F')],
      provenance: KE_SRC,
    },
  ],
  credit: { note: 'One full-year subject is one course; hours are used when the record prints them.', provenance: KE_SRC },
  courses: [
    course(['English'], 'English', 'ela.english'),
    course(['Kiswahili', 'Swahili'], 'Kiswahili', 'wl.other'),
    course(['History and Government', 'History & Government', 'History & Govt', 'Hist & Govt', 'History and Govt'], 'History and Government', 'ss.social'),
    course(['Christian Religious Education', 'CRE', 'C.R.E'], 'Christian Religious Education', 'ss.religion'),
    course(['Islamic Religious Education', 'IRE', 'I.R.E'], 'Islamic Religious Education', 'ss.religion'),
    course(['Hindu Religious Education', 'HRE', 'H.R.E'], 'Hindu Religious Education', 'ss.religion'),
    course(['Business Studies'], 'Business Studies', 'cte.business'),
    course(['Agriculture'], 'Agriculture', 'cte.agriculture'),
    course(['Home Science'], 'Home Science', 'cte.home'),
    course(['Computer Studies'], 'Computer Studies', 'cs'),
    course(['Art and Design', 'Art & Design'], 'Art and Design', 'arts.visual'),
  ],
  documentation: [{ title: 'Scholaro: Education System in Kenya', url: 'https://www.scholaro.com/db/Countries/Kenya/Education-System' }],
  provenance: KE_SRC,
};

const BR_SRC = scholaro('Brazil', 'Brazil');
const br: SystemProfile = {
  id: 'br',
  instruction: INSTRUCTION['br'],
  name: 'Brazil: ensino médio',
  countries: ['Brazil'],
  languages: ['pt'],
  summary:
    'Ensino médio is three years (1ª, 2ª and 3ª série; grades 10–12). The histórico escolar lists each curricular component with a mark, usually 0–10, and its yearly workload in hours (carga horária). Pass marks vary by state and school between 5 and 7.',
  detect: [d('histórico escolar', 10), d('ensino médio', 8), d('carga horária', 6), d('secretaria de estado da educação', 6), d('componentes curriculares', 6), d('série', 2), d('aprovado', 3), d('aprovada', 3), d('colégio estadual', 5), d('escola estadual', 5), d('ensino fundamental', 4), d('naturalidade', 3), d('rg', 1)],
  dateOrder: 'dmy',
  levels: [
    { pattern: '\\b1\\s*[ªaºo]\\.?\\s*s[ée]rie|primeira\\s+s[ée]rie|\\b1\\s*[ºo]\\.?\\s*ano\\b', level: 10 },
    { pattern: '\\b2\\s*[ªaºo]\\.?\\s*s[ée]rie|segunda\\s+s[ée]rie|\\b2\\s*[ºo]\\.?\\s*ano\\b', level: 11 },
    { pattern: '\\b3\\s*[ªaºo]\\.?\\s*s[ée]rie|terceira\\s+s[ée]rie|\\b3\\s*[ºo]\\.?\\s*ano\\b', level: 12 },
    { pattern: '\\b9\\s*[ºo]\\.?\\s*ano\\b', level: 9 },
  ],
  scales: [
    { id: 'br-10', label: 'Brazil 0–10 scale, pass at 5 → US letter (Scholaro, Brazil secondary)', kind: 'numeric', domain: [0, 10], passing: '5–7 depending on the school', entries: [R(9, 10, 'A', 'Excelente'), R(7, 8.99, 'B', 'Bom'), R(6, 6.99, 'C', 'Aceitável'), R(5, 5.99, 'D', 'Suficiente'), R(0, 4.99, 'F', 'Deficiente')], provenance: BR_SRC },
    { id: 'br-100', label: 'Brazil 0–100 scale → US letter (Scholaro, Brazil secondary)', kind: 'numeric', domain: [0, 100], requiresAbove: 10, entries: [R(90, 100, 'A'), R(70, 89.99, 'B'), R(60, 69.99, 'C'), R(50, 59.99, 'D'), R(0, 49.99, 'F')], provenance: BR_SRC },
    { id: 'br-letters', label: 'Brazil concept grades', kind: 'labels', entries: [L(['A'], 'A'), L(['B'], 'B'), L(['C'], 'C'), L(['D'], 'D'), L(['S'], 'P', 'Satisfatório'), L(['F', 'E'], 'F')], provenance: BR_SRC },
  ],
  credit: {
    note: 'The histórico escolar prints the yearly workload (carga horária) in hours for each subject, which converts directly to Carnegie units.',
    provenance: prov('Ministério da Educação (Brazil): ensino médio', 'https://www.gov.br/mec/pt-br'),
  },
  courses: [
    course(['Língua Portuguesa', 'Português', 'Língua Portuguesa e Literatura'], 'Portuguese Language', 'wl.native'),
    course(['Matemática'], 'Mathematics', 'math.general'),
    course(['Biologia'], 'Biology', 'sci.biology'),
    course(['Física'], 'Physics', 'sci.physics'),
    course(['Química'], 'Chemistry', 'sci.chemistry'),
    course(['História'], 'History', 'ss.history.world'),
    course(['Geografia'], 'Geography', 'ss.geography'),
    course(['Sociologia'], 'Sociology', 'ss.sociology'),
    course(['Filosofia'], 'Philosophy', 'ss.philosophy'),
    course(['Língua Inglesa', 'Inglês', 'Língua Estrangeira Moderna - Inglês', 'LEM Inglês'], 'English Language', 'ela.efl'),
    course(['Língua Espanhola', 'Espanhol'], 'Spanish Language', 'wl.other'),
    course(['Arte', 'Artes'], 'Art', 'arts.visual'),
    course(['Educação Física'], 'Physical Education', 'pe'),
    course(['Projeto de Vida'], 'Life Project', 'elective.other'),
    course(['Ensino Religioso'], 'Religious Education', 'ss.religion'),
  ],
  documentation: [{ title: 'Ministério da Educação (MEC)', url: 'https://www.gov.br/mec/pt-br' }],
  provenance: BR_SRC,
};

const KR_SRC = scholaro('South Korea', 'South-Korea');
const kr: SystemProfile = {
  id: 'kr',
  instruction: INSTRUCTION['kr'],
  name: 'South Korea: high school (고등학교)',
  countries: ['South Korea'],
  languages: ['ko'],
  summary:
    'High school is three years (1–3학년; grades 10–12), reported per semester in the school life record (학교생활기록부). Each subject shows units (단위수), raw score with subject mean, an achievement level A–E (90, 80, 70, 60 percent bands) and, for most subjects, a nine-level rank grade (석차등급) where 1 is the top 4%.',
  detect: [d('학교생활기록부', 10), d('고등학교', 6), d('성취도', 6), d('석차등급', 7), d('단위수', 6), d('교과학습발달상황', 9), d('원점수', 5), d('성적증명서', 8), d('학년', 2), d('학기', 2), d('생년월일', 3), d('중학교', 4)],
  dateOrder: 'ymd',
  levels: [
    { pattern: '1\\s*학년', level: 10 },
    { pattern: '2\\s*학년', level: 11 },
    { pattern: '3\\s*학년', level: 12 },
  ],
  scales: [
    {
      id: 'kr-achievement', label: 'Korea achievement levels A–E → US letter (Scholaro, same percentage bands as 수/우/미/양/가)', kind: 'labels',
      entries: [L(['A', '수'], 'A', '90% and above'), L(['B', '우'], 'A', '80–89%'), L(['C', '미'], 'B', '70–79%'), L(['D', '양'], 'C', '60–69%'), L(['E', '가'], 'D', 'below 60%'), L(['P'], 'P', 'Pass')],
      provenance: KR_SRC,
      note: 'Scholaro publishes US equivalents for the older 수–가 labels, which use the same percentage bands as today’s A–E achievement levels. E is still a completed course in Korea.',
    },
    {
      id: 'kr-rank', label: 'Korea nine-level rank grade → US letter (Scholaro, South Korea secondary)', kind: 'numeric', domain: [1, 9], hint: '석차|rank',
      entries: [R(1, 1, 'A', 'top 4%'), R(2, 2, 'A', 'next 7%'), R(3, 3, 'B', 'next 12%'), R(4, 4, 'B', 'next 17%'), R(5, 5, 'C', 'middle 20%'), R(6, 6, 'C', 'next 17%'), R(7, 7, 'D', 'next 12%'), R(8, 8, 'D', 'next 7%'), R(9, 9, 'F', 'bottom 4%')],
      provenance: KR_SRC,
      note: 'Rank grades are relative to classmates, not a measure of mastery.',
    },
  ],
  credit: {
    hoursPerCredit: 14.2,
    note: 'National curriculum: one unit (단위) is 50 minutes of class a week for one semester of 17 weeks, about 14 hours.',
    provenance: prov('Korea National Curriculum Information Center (NCIC)', 'https://ncic.re.kr'),
  },
  courses: [
    course(['국어'], 'Korean Language', 'wl.native'),
    course(['문학'], 'Literature', 'wl.native'),
    course(['독서'], 'Reading', 'wl.native'),
    course(['화법과 작문'], 'Speech and Writing', 'wl.native'),
    course(['언어와 매체'], 'Language and Media', 'wl.native'),
    course(['수학'], 'Mathematics', 'math.general'),
    course(['수학Ⅰ', '수학 I', '수학1'], 'Mathematics I', 'math.algebra2'),
    course(['수학Ⅱ', '수학 II', '수학2'], 'Mathematics II', 'math.precalc'),
    course(['미적분'], 'Calculus', 'math.calculus'),
    course(['확률과 통계'], 'Probability and Statistics', 'math.statistics'),
    course(['기하'], 'Geometry', 'math.geometry'),
    course(['영어', '영어Ⅰ', '영어Ⅱ', '영어 I', '영어 II', '영어 회화', '영어 독해와 작문'], 'English', 'ela.efl'),
    course(['한국사'], 'Korean History', 'ss.history.national'),
    course(['통합사회'], 'Integrated Social Studies', 'ss.social'),
    course(['통합과학'], 'Integrated Science', 'sci.integrated'),
    course(['과학탐구실험'], 'Science Inquiry Experiments', 'sci.integrated'),
    course(['물리학Ⅰ', '물리학Ⅱ', '물리학', '물리학 I'], 'Physics', 'sci.physics'),
    course(['화학Ⅰ', '화학Ⅱ', '화학', '화학 I'], 'Chemistry', 'sci.chemistry'),
    course(['생명과학Ⅰ', '생명과학Ⅱ', '생명과학', '생명과학 I'], 'Life Science', 'sci.biology'),
    course(['지구과학Ⅰ', '지구과학Ⅱ', '지구과학'], 'Earth Science', 'sci.earth'),
    course(['세계지리'], 'World Geography', 'ss.geography'),
    course(['한국지리'], 'Korean Geography', 'ss.geography'),
    course(['세계사'], 'World History', 'ss.history.world'),
    course(['동아시아사'], 'East Asian History', 'ss.history.world'),
    course(['생활과 윤리', '윤리와 사상'], 'Ethics', 'ss.philosophy'),
    course(['정치와 법'], 'Politics and Law', 'ss.civics'),
    course(['경제'], 'Economics', 'ss.economics'),
    course(['사회·문화', '사회문화'], 'Society and Culture', 'ss.social'),
    course(['체육', '운동과 건강', '스포츠 생활'], 'Physical Education', 'pe'),
    course(['음악'], 'Music', 'arts.music'),
    course(['미술'], 'Art', 'arts.visual'),
    course(['기술·가정', '기술가정'], 'Technology and Home Economics', 'cte.technology'),
    course(['정보'], 'Informatics', 'cs'),
    course(['일본어Ⅰ', '일본어 I', '일본어'], 'Japanese', 'wl.other'),
    course(['중국어Ⅰ', '중국어 I', '중국어'], 'Chinese', 'wl.other'),
    course(['한문Ⅰ', '한문'], 'Classical Chinese', 'wl.other'),
    course(['창의적 체험활동'], 'Creative Experiential Activities', 'elective.other'),
  ],
  documentation: [{ title: 'Ministry of Education, Republic of Korea', url: 'https://english.moe.go.kr' }, { title: 'National Curriculum Information Center', url: 'https://ncic.re.kr' }],
  provenance: KR_SRC,
};

const VN_SRC = scholaro('Vietnam', 'Vietnam');
const vn: SystemProfile = {
  id: 'vn',
  instruction: INSTRUCTION['vn'],
  name: 'Vietnam: upper secondary (THPT)',
  countries: ['Vietnam'],
  languages: ['vi'],
  summary:
    'Upper secondary school (trung học phổ thông) is grades 10–12. The học bạ (school record) lists each subject with semester averages and a yearly average on a 10-point scale; 5.0 is the pass mark. Some subjects (physical education, arts) are marked Đ (đạt, pass) or CĐ (chưa đạt).',
  detect: [d('học bạ', 10), d('trung học phổ thông', 8), d('thpt', 6), d('sở giáo dục', 6), d('học kỳ', 4), d('cả năm', 4), d('môn học', 4), d('năm học', 3), d('hiệu trưởng', 4), d('bộ giáo dục và đào tạo', 8), d('điểm trung bình', 4), d('ngữ văn', 3), d('lớp', 1)],
  dateOrder: 'dmy',
  levels: [
    { pattern: 'l[ớo]p\\s*12', level: 12 },
    { pattern: 'l[ớo]p\\s*11', level: 11 },
    { pattern: 'l[ớo]p\\s*10', level: 10 },
    { pattern: 'l[ớo]p\\s*9\\b', level: 9 },
  ],
  scales: [
    {
      id: 'vn-10', label: 'Vietnam 10-point scale → US letter (Scholaro, Most Common 10-point)', kind: 'numeric', domain: [0, 10], passing: '5.0',
      entries: [R(9, 10, 'A', 'Xuất sắc'), R(8, 8.99, 'A', 'Giỏi'), R(7, 7.99, 'B', 'Khá'), R(6, 6.99, 'B', 'Trung bình khá'), R(5, 5.99, 'C', 'Trung bình'), R(0, 4.99, 'F', 'Không đạt')],
      provenance: VN_SRC,
      note: 'A subject mark below 5.0 can still be carried if the overall yearly average is at least 5.0; the table shows it as failing.',
    },
    { id: 'vn-pass', label: 'Vietnam pass marks (Đ / CĐ)', kind: 'labels', entries: [L(['Đ', 'Đạt', 'D'], 'P', 'Đạt (pass)'), L(['CĐ', 'Chưa đạt', 'KĐ', 'Không đạt'], 'F', 'Chưa đạt (not passed)')], provenance: VN_SRC },
  ],
  credit: {
    note: 'The học bạ lists yearly averages without hours.',
    provenance: prov('Ministry of Education and Training of Vietnam', 'https://moet.gov.vn'),
  },
  courses: [
    course(['Toán', 'Toán học'], 'Mathematics', 'math.general'),
    course(['Ngữ văn', 'Văn'], 'Vietnamese Literature', 'wl.native'),
    course(['Tiếng Anh', 'Ngoại ngữ', 'Ngoại ngữ 1', 'Anh văn'], 'English', 'ela.efl'),
    course(['Vật lí', 'Vật lý', 'Lý'], 'Physics', 'sci.physics'),
    course(['Hóa học', 'Hoá học', 'Hóa'], 'Chemistry', 'sci.chemistry'),
    course(['Sinh học', 'Sinh'], 'Biology', 'sci.biology'),
    course(['Lịch sử', 'Sử'], 'History', 'ss.history.world'),
    course(['Địa lí', 'Địa lý', 'Địa'], 'Geography', 'ss.geography'),
    course(['Giáo dục công dân', 'GDCD'], 'Civic Education', 'ss.civics'),
    course(['Giáo dục kinh tế và pháp luật', 'GDKT&PL'], 'Economic and Legal Education', 'ss.civics'),
    course(['Tin học'], 'Informatics', 'cs'),
    course(['Công nghệ'], 'Technology', 'cte.technology'),
    course(['Thể dục', 'Giáo dục thể chất'], 'Physical Education', 'pe'),
    course(['Giáo dục quốc phòng và an ninh', 'GDQP-AN', 'Giáo dục quốc phòng - an ninh', 'GDQP'], 'National Defense and Security Education', 'elective.other'),
    course(['Âm nhạc'], 'Music', 'arts.music'),
    course(['Mĩ thuật', 'Mỹ thuật'], 'Fine Arts', 'arts.visual'),
    course(['Hoạt động trải nghiệm, hướng nghiệp', 'HĐTN-HN'], 'Experiential and Career Activities', 'elective.other'),
  ],
  documentation: [{ title: 'Ministry of Education and Training (MOET)', url: 'https://moet.gov.vn' }],
  provenance: VN_SRC,
};

const RU_SRC = scholaro('Russia', 'Russia');
const ru: SystemProfile = {
  id: 'ru',
  instruction: INSTRUCTION['ru'],
  name: 'Russia: secondary general education (аттестат)',
  countries: ['Russia'],
  languages: ['ru'],
  summary:
    'General education runs for 11 years; the аттестат о среднем общем образовании is awarded after grade 11 and its supplement lists final marks. Marks run from 5 (отлично) to 2 (неудовлетворительно); 3 is the lowest pass.',
  detect: [d('аттестат', 8), d('о среднем общем образовании', 9), d('российская федерация', 6), d('итоговая отметка', 7), d('учебных предметов', 5), d('общеобразовательн', 4), d('отлично', 2), d('хорошо', 2), d('удовлетворительно', 2), d('класс', 1), d('обществознание', 3), d('об основном общем образовании', 8)],
  dateOrder: 'dmy',
  levels: [
    { pattern: '11\\s*класс|среднем общем образовании', level: 11 },
    { pattern: '10\\s*класс', level: 10 },
    { pattern: '9\\s*класс|основном общем образовании', level: 9 },
  ],
  defaultLevel: 11,
  scales: [
    { id: 'ru-5', label: 'Russia five-point marks → US letter (Scholaro, Russia/USSR Most Common)', kind: 'numeric', domain: [2, 5], passing: '3', entries: [R(5, 5, 'A', 'отлично'), R(4, 4.99, 'B', 'хорошо'), R(3, 3.99, 'C', 'удовлетворительно'), R(2, 2.99, 'F', 'неудовлетворительно')], provenance: RU_SRC },
    { id: 'ru-words', label: 'Russia mark words → US letter (Scholaro, Russia/USSR Most Common)', kind: 'labels', entries: [L(['отлично'], 'A'), L(['хорошо'], 'B'), L(['удовлетворительно'], 'C'), L(['неудовлетворительно'], 'F'), L(['зачтено', 'зачёт', 'зачет'], 'P', 'Credit')], provenance: RU_SRC },
  ],
  credit: {
    examCourseYears: 2,
    note: 'The supplement to the аттестат reports final marks for grades 10–11 together, without hours.',
    provenance: prov('Ministry of Education of the Russian Federation', 'https://edu.gov.ru'),
  },
  courses: [
    course(['Русский язык'], 'Russian Language', 'wl.native'),
    course(['Литература'], 'Literature', 'wl.native'),
    course(['Родной язык', 'Родная литература'], 'Native Language', 'wl.native'),
    course(['Иностранный язык (английский)', 'Английский язык', 'Иностранный язык'], 'Foreign Language (English)', 'ela.efl'),
    course(['Алгебра и начала математического анализа', 'Алгебра и начала анализа'], 'Algebra and Introductory Calculus', 'math.precalc'),
    course(['Алгебра'], 'Algebra', 'math.algebra1'),
    course(['Геометрия'], 'Geometry', 'math.geometry'),
    course(['Математика'], 'Mathematics', 'math.general'),
    course(['Информатика', 'Информатика и ИКТ'], 'Informatics', 'cs'),
    course(['История', 'История России', 'Всеобщая история'], 'History', 'ss.history.world'),
    course(['Обществознание'], 'Social Studies', 'ss.social'),
    course(['География'], 'Geography', 'ss.geography'),
    course(['Биология'], 'Biology', 'sci.biology'),
    course(['Физика'], 'Physics', 'sci.physics'),
    course(['Химия'], 'Chemistry', 'sci.chemistry'),
    course(['Астрономия'], 'Astronomy', 'sci.earth'),
    course(['Физическая культура'], 'Physical Education', 'pe'),
    course(['Основы безопасности жизнедеятельности', 'ОБЖ'], 'Fundamentals of Life Safety', 'health'),
    course(['Технология'], 'Technology', 'cte.technology'),
    course(['Индивидуальный проект'], 'Individual Project', 'elective.other'),
  ],
  documentation: [{ title: 'Ministry of Education of the Russian Federation', url: 'https://edu.gov.ru' }],
  provenance: RU_SRC,
};

const EG_SRC = scholaro('Egypt', 'Egypt');
const eg: SystemProfile = {
  id: 'eg',
  instruction: INSTRUCTION['eg'],
  name: 'Egypt: general secondary certificate (الثانوية العامة)',
  countries: ['Egypt'],
  languages: ['ar'],
  summary:
    'General secondary school is three years (grades 10–12) and ends with the Thanaweya Amma examinations. The statement of marks lists each subject with its maximum and minimum marks and the student’s mark; marks are converted to a percentage of the maximum, with 50% the pass mark.',
  detect: [d('الثانوية العامة', 10), d('جمهورية مصر العربية', 9), d('وزارة التربية والتعليم', 7), d('رقم الجلوس', 6), d('النهاية العظمى', 6), d('النهاية الصغرى', 6), d('بيان درجات', 6), d('الصف الثالث الثانوي', 6), d('الإدارة التعليمية', 4)],
  dateOrder: 'ymd',
  levels: [
    { pattern: 'الصف الثالث الثانوي|الثانوية العامة', level: 12 },
    { pattern: 'الصف الثاني الثانوي', level: 11 },
    { pattern: 'الصف الأول الثانوي', level: 10 },
  ],
  defaultLevel: 12,
  scales: [
    {
      id: 'eg-percent', label: 'Egypt secondary percentage of the maximum mark → US letter (Scholaro, Egypt secondary education)', kind: 'numeric', domain: [0, 100], passing: '50%',
      entries: [R(90, 100, 'A', 'Excellent ممتاز'), R(80, 89.99, 'B', 'Very good جيد جداً'), R(65, 79.99, 'B', 'Good جيد'), R(50, 64.99, 'C', 'Pass مقبول'), R(0, 49.99, 'F', 'Fail')],
      provenance: EG_SRC,
      note: 'Each mark is first divided by the maximum printed for that subject.',
    },
  ],
  credit: {
    examCourseYears: 1,
    note: 'The Thanaweya Amma statement reports the final (third) secondary year only.',
    provenance: prov('Ministry of Education and Technical Education, Egypt', 'https://moe.gov.eg'),
  },
  courses: [
    course(['اللغة العربية'], 'Arabic Language', 'wl.native'),
    course(['اللغة الأجنبية الأولى', 'اللغة الأجنبية الأولى (الإنجليزية)', 'اللغة الإنجليزية'], 'First Foreign Language (English)', 'ela.efl'),
    course(['اللغة الأجنبية الثانية', 'اللغة الأجنبية الثانية (الفرنسية)', 'اللغة الفرنسية'], 'Second Foreign Language (French)', 'wl.other'),
    course(['الكيمياء'], 'Chemistry', 'sci.chemistry'),
    course(['الفيزياء'], 'Physics', 'sci.physics'),
    course(['الأحياء'], 'Biology', 'sci.biology'),
    course(['الجيولوجيا وعلوم البيئة', 'الجيولوجيا'], 'Geology and Environmental Science', 'sci.earth'),
    course(['الرياضيات البحتة'], 'Pure Mathematics', 'math.advanced'),
    course(['الرياضيات التطبيقية'], 'Applied Mathematics', 'math.advanced'),
    course(['التاريخ'], 'History', 'ss.history.world'),
    course(['الجغرافيا'], 'Geography', 'ss.geography'),
    course(['الفلسفة والمنطق'], 'Philosophy and Logic', 'ss.philosophy'),
    course(['علم النفس والاجتماع'], 'Psychology and Sociology', 'ss.psychology'),
    course(['التربية الدينية'], 'Religious Education', 'ss.religion'),
    course(['التربية الوطنية'], 'National Education', 'ss.civics'),
    course(['الاقتصاد والإحصاء'], 'Economics and Statistics', 'ss.economics'),
  ],
  documentation: [{ title: 'Ministry of Education and Technical Education, Egypt', url: 'https://moe.gov.eg' }],
  provenance: EG_SRC,
};

const GENERIC_SRC: Provenance = prov('College Board BigFuture: How to Convert Your GPA to a 4.0 Scale', 'https://bigfuture.collegeboard.org/plan-for-college/college-basics/how-to-convert-gpa-4.0-scale');
const generic: SystemProfile = {
  id: 'generic',
  instruction: INSTRUCTION['generic'],
  name: 'Unprofiled system (generic rules)',
  countries: [],
  languages: [],
  summary:
    'Used when a document does not match any profiled system. Subjects are matched by the multilingual subject dictionary. Grades are converted only when the document itself gives enough to go on: a maximum mark, a grade word, or a plain letter. Results are marked low confidence.',
  detect: [],
  dateOrder: 'dmy',
  levels: [],
  scales: [
    {
      id: 'generic-percent', label: 'Generic percentage bands 90/80/70/60 (US convention; no country table applied)', kind: 'numeric', domain: [0, 100],
      entries: [R(90, 100, 'A'), R(80, 89.99, 'B'), R(70, 79.99, 'C'), R(60, 69.99, 'D'), R(0, 59.99, 'F')],
      provenance: GENERIC_SRC,
      note: 'This is the usual US percentage convention, not the source country’s scale. Many systems mark more severely; check the country’s pass mark.',
    },
    {
      id: 'generic-descriptors', label: 'Grade words printed on the document (generic)', kind: 'labels',
      entries: [
        L(['excellent', 'outstanding', 'distinction', 'отлично', 'ممتاز', '优秀', '优', 'sehr gut', 'très bien', 'excelente', 'muy bien', 'ottimo', 'sobresaliente', 'उत्कृष्ट'], 'A'),
        L(['very good', 'good', 'хорошо', 'جيد جدا', 'جيد جداً', 'جيد', '良好', '良', 'gut', 'bien', 'bom', 'buono', 'notable', 'merit', 'अच्छा'], 'B'),
        L(['satisfactory', 'credit', 'average', 'удовлетворительно', '中等', '中', 'befriedigend', 'assez bien', 'regular', 'suficiente', 'discreto', 'aprobado', 'संतोषजनक'], 'C'),
        L(['sufficient', 'fair', 'مقبول', '及格', 'ausreichend', 'passable', 'sufficiente'], 'D'),
        L(['fail', 'failed', 'неудовлетворительно', 'ضعيف', 'راسب', '不及格', 'mangelhaft', 'ungenügend', 'insuffisant', 'reprobado', 'reprovado', 'insufficiente', 'अनुत्तीर्ण'], 'F'),
        L(['pass', 'passed', 'зачтено', 'зачёт', '合格', '通过', 'đạt', 'acreditado', 'aprovado', 'admis', 'bestanden', 'उत्तीर्ण', 'ناجح'], 'P'),
      ],
      provenance: GENERIC_SRC,
      note: 'Grade words are read literally; their meaning differs between countries.',
    },
    { id: 'generic-letters', label: 'Letter grades A–F as printed (generic)', kind: 'labels', entries: [L(['A', 'A+', 'A-'], 'A'), L(['B', 'B+', 'B-'], 'B'), L(['C', 'C+', 'C-'], 'C'), L(['D', 'D+', 'D-'], 'D'), L(['F', 'E'], 'F'), L(['P', 'S'], 'P')], provenance: GENERIC_SRC },
  ],
  credit: {
    note: 'No national credit rule is known for this system: credit is suggested from hours when printed, otherwise one credit per full-year course.',
    provenance: { source: { title: 'Carnegie Foundation for the Advancement of Teaching: the Carnegie Unit', url: 'https://www.carnegiefoundation.org/faqs/carnegie-unit/' }, schoolYear: YEAR, addedOn: ADDED },
  },
  courses: [],
  documentation: [],
  provenance: GENERIC_SRC,
};

// ── School calendars: how a year is divided, so a report for one part counts as that fraction of a year.
// The document's own wording wins ("semester" is always one of two); these are the defaults when it only says "term".
const cal = (unit: 'term' | 'semester', perYear: number, note: string, source: SourceInfo): NonNullable<SystemProfile['calendar']> => ({ unit, perYear, note, provenance: { source, schoolYear: YEAR, addedOn: ADDED } });
const CALENDARS: Record<string, NonNullable<SystemProfile['calendar']>> = {
  waec: cal('term', 3, 'Senior secondary schools in The Gambia, Nigeria and Sierra Leone divide the school year into three terms (first, second, third), and school reports are issued each term. Ghanaian senior high schools have moved to two semesters; a report that says “semester” is read as one of two.', {
    title: 'Three-term year as printed on West African school reports (“First/Second/Third Term”, “termly” results); confirm with the sending school',
  }),
  cn: cal('semester', 2, 'The Chinese school year has two semesters (上学期, 下学期).', CN_SRC.source),
  'mx-sep': cal('semester', 2, 'The bachillerato is organised in six semesters, two per year.', MX_SRC.source),
  ph: cal('semester', 2, 'Senior high school (Grades 11–12) runs two semesters a year, each with two quarters.', PH_SRC.source),
  'ph-k12': cal('semester', 2, 'Senior high school (Grades 11–12) runs two semesters a year, each with two quarters.', PH_SRC.source),
  kr: cal('semester', 2, 'Korean high schools have two semesters (1학기, 2학기) a year.', KR_SRC.source),
  vn: cal('semester', 2, 'The Vietnamese school year has two semesters (học kỳ I, học kỳ II).', VN_SRC.source),
  fr: cal('term', 3, 'The French school year has three trimesters; most lycées issue a report each trimester.', FR_SRC.source),
  de: cal('semester', 2, 'German schools issue reports for each half-year (Halbjahr).', DE_SRC.source),
  br: cal('term', 4, 'Brazilian schools commonly report by bimestre, four per year.', BR_SRC.source),
};
for (const s of [waec, gabece, jamb, ib, uk, inCbse, inCisce, cn, mx, fr, de, ph, br, kr, vn, ru, eg, generic]) {
  const c = CALENDARS[s.id];
  if (c) s.calendar = c;
}

// ── What each year of WAEC-family mathematics covers, in the topic vocabulary of src/kb/usCourses.ts.
// Read 2026-11-15. No Gambian (MoBSE) or Nigerian (NERDC) year-by-year mathematics curriculum could be found
// online, so Ghana's official SHS curriculum (also taught to the WASSCE syllabus) is the year-by-year reference.
const NACCA_SHS: SourceInfo = { title: 'Ghana NaCCA: Senior High School Mathematics Curriculum (September 2023), SHS 1–3', url: 'https://curriculumresources.edu.gh/wp-content/uploads/2024/11/Mathematics-Curriculum.pdf' };
const WAEC_FURTHER: SourceInfo = { title: 'WAEC WASSCE syllabus: Further Mathematics / Mathematics (Elective) (undated copy, RACHEL offline library)', url: 'https://rachel.core2learn.org/modules/en-wassce/WASSCESYLABUS/FURTHER_MATHEMATICS_OR_MATHEMATICS%20_ELECTIVE.pdf' };
waec.sequences = [
  {
    concept: 'math.general', ladder: 'math', kind: 'spiral', confidence: 0.6, source: NACCA_SHS,
    // Ghana Common Core Programme B7–B9 (junior high): linear equations and inequalities, gradient and equation of a line,
    // Pythagoras and basic trig ratios, simultaneous equations, surds, construction and loci, mean/median/mode.
    before: ['lin-eq', 'lin-fn', 'coord-geo', 'right-trig', 'systems', 'exp-rad', 'construct', 'stats-1'],
    byLevel: {
      '10': ['poly-factor', 'rational', 'geo-proof', 'right-trig', 'area-vol', 'vectors', 'stats-1', 'prob-inf'],
      '11': ['exp-rad', 'exp-log', 'variation', 'systems', 'seq-series', 'exp-fn', 'transform', 'vectors', 'prob-inf'],
      '12': ['quad-solve', 'circles', 'trig-fn', 'stats-1', 'prob-inf'],
    },
    note: 'Year-by-year topics follow Ghana’s official SHS curriculum, used as the reference for WAEC-family schools. Gambian and Nigerian schools teach to the same WASSCE syllabus but may order topics differently, so check placement against the school’s scheme of work. The WASSCE General Mathematics syllabus also lists introductory calculus (simple differentiation and integration), which is not counted as a US calculus course.',
  },
  {
    concept: 'math.advanced', ladder: 'math', kind: 'targeted', minRung: 4, confidence: 0.4, source: WAEC_FURTHER,
    before: [],
    byLevel: {
      '10': ['fn-analysis', 'poly-fn', 'rational', 'exp-log', 'binomial'],
      '11': ['seq-series', 'matrices', 'trig-id', 'conics', 'vectors'],
      '12': ['limits', 'derivative', 'deriv-app', 'integral', 'integ-app'],
    },
    note: 'The WAEC Further Mathematics syllabus lists its topics (functions, polynomials, logarithms, binomial theorem, matrices, conics, differentiation, integration, statistics, mechanics) without a year split; evalua spreads them over three years in syllabus order. Check with the school.',
  },
];

export const systems: SystemProfile[] = [waec, gabece, jamb, ib, uk, inCbse, inCisce, cn, mx, fr, de, ph, ke, br, kr, vn, ru, eg, ...latamSystems, sn, generic];
export type { GradeScale };
