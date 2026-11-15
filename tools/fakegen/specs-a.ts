// Fictitious transcript specifications, part A (English-language systems).
// All students and schools are invented. Do not replace with real records.
import type { FakeCourse, FakeSpec } from './types.ts';

const c = (n: string, en: string, g: string, k: string, us: string, extra: Partial<FakeCourse> = {}): FakeCourse => ({
  n, en, g, k, us, ...extra,
});

const waecWord: Record<string, string> = {
  A1: 'EXCELLENT', B2: 'VERY GOOD', B3: 'GOOD', C4: 'CREDIT', C5: 'CREDIT', C6: 'CREDIT', D7: 'PASS', E8: 'PASS', F9: 'FAIL',
};
const w = (n: string, g: string, k: string, us: string): FakeCourse => c(n, titleCase(n), g, k, us, { x: { word: waecWord[g] } });

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());
}

export const gmWassce: FakeSpec = {
  id: 'gm-wassce',
  system: 'waec',
  country: 'The Gambia',
  lang: 'en',
  formats: ['pdf', 'photo-jpg'],
  layout: 'slip',
  style: 'sans',
  issuer: ['THE WEST AFRICAN EXAMINATIONS COUNCIL', 'BANJUL, THE GAMBIA'],
  title: 'WEST AFRICAN SENIOR SCHOOL CERTIFICATE EXAMINATION (WASSCE)',
  subtitle: 'FOR SCHOOL CANDIDATES, MAY/JUNE 2025 — STATEMENT OF RESULT',
  info: [
    { label: 'Candidate Name', value: 'JALLOW, Fatoumatta Binta', role: 'name' },
    { label: 'Examination Number', value: '5010230147', role: 'id' },
    { label: 'Date of Birth', value: '17/08/2007', role: 'dob' },
    { label: 'Sex', value: 'Female' },
    { label: 'Centre', value: 'Kombo Riverside Senior Secondary School', role: 'school' },
    { label: 'Centre Number', value: '5010230' },
  ],
  student: { name: 'Fatoumatta Binta Jallow', dob: '2007-08-17', id: '5010230147' },
  school: { name: 'Kombo Riverside Senior Secondary School' },
  cols: [
    { h: 'SUBJECT', f: 'n' },
    { h: 'GRADE', f: 'g', align: 'c' },
    { h: 'INTERPRETATION', f: 'x.word' },
  ],
  years: [
    {
      label: 'WASSCE 2025', level: 12, academicYear: '2024-2025',
      courses: [
        w('ENGLISH LANGUAGE', 'B3', 'ela.english', 'B'),
        w('MATHEMATICS', 'C4', 'math.general', 'C'),
        w('BIOLOGY', 'B2', 'sci.biology', 'B'),
        w('CHEMISTRY', 'C5', 'sci.chemistry', 'C'),
        w('PHYSICS', 'C6', 'sci.physics', 'C'),
        w('GEOGRAPHY', 'A1', 'ss.geography', 'A'),
        w('ECONOMICS', 'B3', 'ss.economics', 'B'),
        w('AGRICULTURAL SCIENCE', 'D7', 'cte.agriculture', 'D'),
        w('ISLAMIC STUDIES', 'B2', 'ss.religion', 'B'),
      ],
    },
  ],
  notes: [
    'Grade interpretation: A1 Excellent; B2 Very Good; B3 Good; C4, C5, C6 Credit; D7, E8 Pass; F9 Fail.',
    'This statement is issued without alteration or erasure. It is not a certificate.',
  ],
  signatures: ['Head of National Office'],
  specimen: 'SPECIMEN — FICTITIOUS RECORD FOR SOFTWARE TESTING',
};

const ng = (n: string, pct: number, k: string): FakeCourse => {
  const g = pct >= 75 ? 'A1' : pct >= 70 ? 'B2' : pct >= 65 ? 'B3' : pct >= 60 ? 'C4' : pct >= 55 ? 'C5' : pct >= 50 ? 'C6' : pct >= 45 ? 'D7' : pct >= 40 ? 'E8' : 'F9';
  const us = pct >= 75 ? 'A' : pct >= 65 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
  return c(n, n, g, k, us, { x: { pct: String(pct) } });
};

export const ngSss: FakeSpec = {
  id: 'ng-sss',
  system: 'waec',
  country: 'Nigeria',
  lang: 'en',
  formats: ['scan-jpg'],
  layout: 'matrix',
  style: 'typewriter',
  issuer: ['GREENFIELD UNITY COLLEGE, IBADAN', 'P.M.B. 4471, Oyo State, Nigeria'],
  title: 'SENIOR SECONDARY SCHOOL ACADEMIC TRANSCRIPT',
  info: [
    { label: 'Name of Student', value: 'Chukwuemeka Tobenna OKAFOR', role: 'name' },
    { label: 'Admission No.', value: 'GUC/2019/0388', role: 'id' },
    { label: 'Date of Birth', value: '3rd February, 2006', role: 'dob' },
    { label: 'School', value: 'Greenfield Unity College', role: 'school' },
    { label: 'Class on Leaving', value: 'SS 3 Science' },
    { label: 'Date Issued', value: '12th September, 2024', role: 'issued' },
  ],
  student: { name: 'Chukwuemeka Tobenna Okafor', dob: '2006-02-03', id: 'GUC/2019/0388' },
  school: { name: 'Greenfield Unity College', city: 'Ibadan' },
  rowHeader: 'SUBJECT',
  cols: [
    { h: 'Score %', f: 'x.pct', align: 'c' },
    { h: 'Grade', f: 'g', align: 'c' },
  ],
  years: [
    {
      label: 'SS 1 (2021/2022)', short: 'SS 1', level: 10, academicYear: '2021-2022',
      courses: [
        ng('English Language', 68, 'ela.english'), ng('Mathematics', 74, 'math.general'), ng('Civic Education', 81, 'ss.civics'),
        ng('Biology', 66, 'sci.biology'), ng('Chemistry', 59, 'sci.chemistry'), ng('Physics', 62, 'sci.physics'),
        ng('Further Mathematics', 55, 'math.advanced'), ng('Geography', 70, 'ss.geography'), ng('Economics', 72, 'ss.economics'),
        ng('Computer Studies', 85, 'cs'), ng('Yoruba Language', 77, 'wl.native'),
      ],
    },
    {
      label: 'SS 2 (2022/2023)', short: 'SS 2', level: 11, academicYear: '2022-2023',
      courses: [
        ng('English Language', 71, 'ela.english'), ng('Mathematics', 78, 'math.general'), ng('Civic Education', 76, 'ss.civics'),
        ng('Biology', 69, 'sci.biology'), ng('Chemistry', 63, 'sci.chemistry'), ng('Physics', 58, 'sci.physics'),
        ng('Further Mathematics', 49, 'math.advanced'), ng('Geography', 73, 'ss.geography'), ng('Economics', 67, 'ss.economics'),
        ng('Computer Studies', 88, 'cs'), ng('Yoruba Language', 80, 'wl.native'),
      ],
    },
    {
      label: 'SS 3 (2023/2024)', short: 'SS 3', level: 12, academicYear: '2023-2024',
      courses: [
        ng('English Language', 65, 'ela.english'), ng('Mathematics', 80, 'math.general'), ng('Civic Education', 79, 'ss.civics'),
        ng('Biology', 72, 'sci.biology'), ng('Chemistry', 61, 'sci.chemistry'), ng('Physics', 64, 'sci.physics'),
        ng('Further Mathematics', 52, 'math.advanced'), ng('Geography', 75, 'ss.geography'), ng('Economics', 70, 'ss.economics'),
        ng('Computer Studies', 90, 'cs'), ng('Yoruba Language', 83, 'wl.native'),
      ],
    },
  ],
  notes: [
    'KEY TO GRADES: A1 75-100 Excellent; B2 70-74 Very Good; B3 65-69 Good; C4 60-64 Credit; C5 55-59 Credit; C6 50-54 Credit; D7 45-49 Pass; E8 40-44 Pass; F9 0-39 Fail.',
    'Scores are the cumulative average of three terms (Continuous Assessment 40%, Examination 60%).',
  ],
  signatures: ['Principal', 'Registrar'],
  specimen: 'SPECIMEN — FICTITIOUS RECORD FOR SOFTWARE TESTING',
};

const gh = (n: string, g: string, k: string): FakeCourse => {
  const us = ({ A1: 'A', B2: 'B', B3: 'B', C4: 'C', C5: 'C', C6: 'C', D7: 'D', E8: 'D', F9: 'F' } as Record<string, string>)[g];
  return c(n, n, g, k, us);
};

export const ghShs: FakeSpec = {
  id: 'gh-shs',
  system: 'waec',
  country: 'Ghana',
  lang: 'en',
  formats: ['docx'],
  layout: 'stacked',
  style: 'serif',
  issuer: ['ASANTEMAN VALLEY SENIOR HIGH SCHOOL', 'P.O. Box 219, Kumasi, Ashanti Region, Ghana'],
  title: 'STUDENT ACADEMIC TRANSCRIPT',
  subtitle: 'Programme: General Science',
  info: [
    { label: 'Name', value: 'Akosua Serwaa MENSAH', role: 'name' },
    { label: 'Index Number', value: '0040511092', role: 'id' },
    { label: 'Date of Birth', value: '22 November 2007', role: 'dob' },
    { label: 'School', value: 'Asanteman Valley Senior High School', role: 'school' },
    { label: 'Date of Issue', value: '4 August 2025', role: 'issued' },
  ],
  student: { name: 'Akosua Serwaa Mensah', dob: '2007-11-22', id: '0040511092' },
  school: { name: 'Asanteman Valley Senior High School', city: 'Kumasi' },
  cols: [
    { h: 'Subject', f: 'n' },
    { h: 'Grade', f: 'g', align: 'c' },
  ],
  years: [
    {
      label: 'SHS 1 — 2022/2023 Academic Year', level: 10, academicYear: '2022-2023',
      courses: [
        gh('English Language', 'B3', 'ela.english'), gh('Core Mathematics', 'B2', 'math.general'), gh('Integrated Science', 'A1', 'sci.integrated'),
        gh('Social Studies', 'B3', 'ss.social'), gh('Elective Mathematics', 'C4', 'math.advanced'), gh('Physics', 'C5', 'sci.physics'),
        gh('Chemistry', 'B3', 'sci.chemistry'), gh('Biology', 'B2', 'sci.biology'), gh('Information and Communication Technology', 'A1', 'cs'),
        gh('Physical Education', 'B2', 'pe'),
      ],
    },
    {
      label: 'SHS 2 — 2023/2024 Academic Year', level: 11, academicYear: '2023-2024',
      courses: [
        gh('English Language', 'B2', 'ela.english'), gh('Core Mathematics', 'B3', 'math.general'), gh('Integrated Science', 'B2', 'sci.integrated'),
        gh('Social Studies', 'A1', 'ss.social'), gh('Elective Mathematics', 'C6', 'math.advanced'), gh('Physics', 'C4', 'sci.physics'),
        gh('Chemistry', 'C4', 'sci.chemistry'), gh('Biology', 'A1', 'sci.biology'), gh('Information and Communication Technology', 'B2', 'cs'),
        gh('Physical Education', 'A1', 'pe'),
      ],
    },
    {
      label: 'SHS 3 — 2024/2025 Academic Year', level: 12, academicYear: '2024-2025',
      courses: [
        gh('English Language', 'B3', 'ela.english'), gh('Core Mathematics', 'C4', 'math.general'), gh('Integrated Science', 'B3', 'sci.integrated'),
        gh('Social Studies', 'B2', 'ss.social'), gh('Elective Mathematics', 'D7', 'math.advanced'), gh('Physics', 'C6', 'sci.physics'),
        gh('Chemistry', 'C5', 'sci.chemistry'), gh('Biology', 'B2', 'sci.biology'),
      ],
    },
  ],
  notes: ['Grading: A1 (80-100) Excellent, B2 (70-79) Very Good, B3 (65-69) Good, C4 (60-64), C5 (55-59), C6 (50-54) Credit, D7 (45-49), E8 (40-44) Pass, F9 (0-39) Fail.'],
  signatures: ['Assistant Headmaster (Academic)'],
  specimen: 'SPECIMEN — FICTITIOUS RECORD FOR SOFTWARE TESTING',
};

const ibUs = (g: string) => ({ '7': 'A', '6': 'A', '5': 'B', '4': 'C', '3': 'D', '2': 'F', '1': 'F' } as Record<string, string>)[g];
const ib = (n: string, en: string, lvl: string, g: string, k: string): FakeCourse => c(n, en, g, k, ibUs(g), { x: { lvl } });

export const ibDp: FakeSpec = {
  id: 'ib-dp',
  system: 'ib',
  country: 'International',
  lang: 'en',
  formats: ['pdf'],
  layout: 'slip',
  style: 'sans',
  issuer: ['International Baccalaureate Diploma Programme'],
  title: 'TRANSCRIPT OF GRADES',
  subtitle: 'May 2025 Examination Session',
  info: [
    { label: 'Candidate', value: 'Ilse Marguerite van der Velde', role: 'name' },
    { label: 'Personal code', value: 'hxq417', role: 'id' },
    { label: 'Date of birth', value: '09 Jan 2007', role: 'dob' },
    { label: 'School', value: 'Harbourline International School of Rotterdam', role: 'school' },
    { label: 'School code', value: '904418' },
    { label: 'Category', value: 'Diploma' },
  ],
  student: { name: 'Ilse Marguerite van der Velde', dob: '2007-01-09', id: 'hxq417' },
  school: { name: 'Harbourline International School of Rotterdam', city: 'Rotterdam' },
  cols: [
    { h: 'Subject', f: 'n' },
    { h: 'Level', f: 'x.lvl', align: 'c' },
    { h: 'Grade', f: 'g', align: 'c' },
  ],
  years: [
    {
      label: 'Diploma Programme results', level: 12, academicYear: '2024-2025',
      courses: [
        ib('ENGLISH A: Language and Literature', 'English A: Language and Literature', 'HL', '5', 'ela.english'),
        ib('DUTCH B', 'Dutch B', 'SL', '7', 'wl.other'),
        ib('HISTORY', 'History', 'HL', '6', 'ss.history.world'),
        ib('BIOLOGY', 'Biology', 'HL', '5', 'sci.biology'),
        ib('MATHEMATICS: Applications and Interpretation', 'Mathematics: Applications and Interpretation', 'SL', '4', 'math.general'),
        ib('VISUAL ARTS', 'Visual Arts', 'SL', '6', 'arts.visual'),
        c('THEORY OF KNOWLEDGE', 'Theory of Knowledge', 'B', 'ss.philosophy', 'B', { x: { lvl: 'TK' } }),
        c('EXTENDED ESSAY (History)', 'Extended Essay (History)', 'C', 'elective.other', 'C', { x: { lvl: 'EE' } }),
      ],
    },
  ],
  notes: [
    'Subject grades are awarded on a scale of 1 (lowest) to 7 (highest). Theory of knowledge and the extended essay are graded A to E.',
    'Total points: 35. Result: Diploma awarded.',
  ],
  specimen: 'SPECIMEN — FICTITIOUS RECORD FOR SOFTWARE TESTING',
};

const gcseUs = (g: string) => ({ '9': 'A', '8': 'A', '7': 'A', '6': 'B', '5': 'B', '4': 'C', '3': 'D', '2': 'D', '1': 'D', U: 'F' } as Record<string, string>)[g];
const alUs = (g: string) => ({ 'A*': 'A', A: 'A', B: 'B', C: 'C', D: 'D', E: 'D', U: 'F' } as Record<string, string>)[g];
const gcse = (n: string, g: string, k: string): FakeCourse => c(n, n, g, k, gcseUs(g), { x: { q: 'GCSE' } });
const alev = (n: string, g: string, k: string): FakeCourse => c(n, n, g, k, alUs(g), { x: { q: 'GCE A Level' } });

export const ukGcse: FakeSpec = {
  id: 'uk-gcse',
  system: 'uk',
  country: 'United Kingdom',
  lang: 'en',
  formats: ['scan-pdf'],
  layout: 'stacked',
  style: 'sans',
  issuer: ['Wrenbury Park Academy', 'Marsh Lane, Shrewsbury, Shropshire'],
  title: 'CANDIDATE STATEMENT OF RESULTS',
  info: [
    { label: 'Candidate name', value: 'OYELARAN-HUGHES, Daniel Ife', role: 'name' },
    { label: 'Candidate number', value: '4172', role: 'id' },
    { label: 'Date of birth', value: '30/06/2007', role: 'dob' },
    { label: 'Centre', value: 'Wrenbury Park Academy', role: 'school' },
    { label: 'Centre number', value: '29418' },
    { label: 'Unique Candidate Identifier', value: '294180071772K' },
  ],
  student: { name: 'Daniel Ife Oyelaran-Hughes', dob: '2007-06-30', id: '4172' },
  school: { name: 'Wrenbury Park Academy', city: 'Shrewsbury' },
  cols: [
    { h: 'Qualification', f: 'x.q' },
    { h: 'Subject', f: 'n' },
    { h: 'Grade', f: 'g', align: 'c' },
  ],
  years: [
    {
      label: 'Summer 2023 — Year 11', level: 10, academicYear: '2022-2023',
      courses: [
        gcse('English Language', '6', 'ela.english'), gcse('English Literature', '7', 'ela.literature'), gcse('Mathematics', '8', 'math.general'),
        gcse('Biology', '7', 'sci.biology'), gcse('Chemistry', '6', 'sci.chemistry'), gcse('Physics', '7', 'sci.physics'),
        gcse('Geography', '5', 'ss.geography'), gcse('French', '4', 'wl.other'), gcse('Computer Science', '9', 'cs'),
        gcse('Religious Studies', '5', 'ss.religion'),
      ],
    },
    {
      label: 'Summer 2025 — Year 13', level: 12, academicYear: '2024-2025',
      courses: [alev('Mathematics', 'A', 'math.advanced'), alev('Physics', 'B', 'sci.physics'), alev('Computer Science', 'A*', 'cs')],
    },
  ],
  notes: [
    'GCSE qualifications are graded 9 to 1, where 9 is the highest grade. GCE A Level qualifications are graded A* to E. U denotes unclassified.',
    'These results are provisional and are subject to confirmation by the awarding organisation.',
  ],
  signatures: ['Examinations Officer'],
  specimen: 'SPECIMEN — FICTITIOUS RECORD FOR SOFTWARE TESTING',
};

const cbseUs = (t: number) => (t >= 60 ? 'A' : t >= 50 ? 'B' : t >= 33 ? 'C' : 'F');
const words = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
const inWords = (t: number) => String(t).padStart(3, '0').split('').map((d) => words[+d]).join(' ');
const cbse = (code: string, n: string, th: number, pr: number, pos: string, k: string): FakeCourse => {
  const t = th + pr;
  return c(n, titleCase(n), String(t).padStart(3, '0'), k, cbseUs(t), {
    x: { code, th: String(th).padStart(3, '0'), pr: String(pr).padStart(3, '0'), words: inWords(t), pos },
  });
};

export const inCbse: FakeSpec = {
  id: 'in-cbse',
  system: 'in-cbse',
  country: 'India',
  lang: 'en',
  formats: ['scan-png', 'pdf'],
  layout: 'slip',
  style: 'serif',
  issuer: ['केन्द्रीय माध्यमिक शिक्षा बोर्ड', 'CENTRAL BOARD OF SECONDARY EDUCATION'],
  title: 'अंक विवरणिका सह प्रमाण पत्र  MARKS STATEMENT CUM CERTIFICATE',
  subtitle: 'सीनियर स्कूल सर्टिफिकेट परीक्षा  SENIOR SCHOOL CERTIFICATE EXAMINATION (CLASS XII), 2025',
  info: [
    { label: 'This is to certify that / प्रमाणित किया जाता है कि', value: 'ANANYA RAGHUNATHAN', role: 'name' },
    { label: 'Roll No. / अनुक्रमांक', value: '26148830', role: 'id' },
    { label: "Mother's Name / माता का नाम", value: 'LAKSHMI RAGHUNATHAN' },
    { label: "Father's / Guardian's Name", value: 'SURESH RAGHUNATHAN' },
    { label: 'Date of Birth / जन्म तिथि', value: '05/12/2007', role: 'dob' },
    { label: 'School / विद्यालय', value: '70931 SARASWATI VIDYA NIKETAN SR SEC SCHOOL COIMBATORE TN', role: 'school' },
  ],
  student: { name: 'Ananya Raghunathan', dob: '2007-12-05', id: '26148830' },
  school: { name: 'Saraswati Vidya Niketan Sr Sec School', city: 'Coimbatore' },
  cols: [
    { h: 'SUB. CODE', f: 'x.code', align: 'c' },
    { h: 'SUBJECT', f: 'n' },
    { h: 'THEORY', f: 'x.th', align: 'c' },
    { h: 'PRACTICAL / IA', f: 'x.pr', align: 'c' },
    { h: 'TOTAL', f: 'g', align: 'c' },
    { h: 'TOTAL IN WORDS', f: 'x.words' },
    { h: 'POSITIONAL GRADE', f: 'x.pos', align: 'c' },
  ],
  years: [
    {
      label: 'Class XII', level: 12, academicYear: '2024-2025',
      courses: [
        cbse('301', 'ENGLISH CORE', 71, 19, 'A2', 'ela.english'),
        cbse('041', 'MATHEMATICS', 62, 20, 'B1', 'math.general'),
        cbse('042', 'PHYSICS', 48, 29, 'B2', 'sci.physics'),
        cbse('043', 'CHEMISTRY', 51, 30, 'B1', 'sci.chemistry'),
        cbse('083', 'COMPUTER SCIENCE', 65, 30, 'A1', 'cs'),
        cbse('048', 'PHYSICAL EDUCATION', 58, 30, 'A2', 'pe'),
      ],
    },
  ],
  notes: ['Result: PASS', 'Maximum marks for each subject: 100. Minimum marks required to pass: 33.', 'Dated: 13-05-2025'],
  signatures: ['Controller of Examinations'],
  specimen: 'SPECIMEN — FICTITIOUS RECORD FOR SOFTWARE TESTING',
};

const phUs = (g: number) => (g >= 90 ? 'A' : g >= 85 ? 'B' : g >= 80 ? 'C' : g >= 75 ? 'D' : 'F');
const ph = (n: string, en: string, type: string, q1: number, q2: number, k: string): FakeCourse => {
  const fin = Math.round((q1 + q2) / 2);
  return c(n, en, String(fin), k, phUs(fin), { x: { type, q1: String(q1), q2: String(q2), act: fin >= 75 ? 'PASSED' : 'FAILED' } });
};

export const phSf10: FakeSpec = {
  id: 'ph-sf10',
  system: 'ph-k12',
  country: 'Philippines',
  lang: 'en',
  formats: ['photo-jpg', 'pdf'],
  layout: 'stacked',
  style: 'sans',
  issuer: ['Republic of the Philippines', 'Department of Education', 'Region IV-A CALABARZON'],
  title: "LEARNER'S PERMANENT ACADEMIC RECORD FOR SENIOR HIGH SCHOOL (SF10-SHS)",
  info: [
    { label: 'LAST NAME, FIRST NAME, MIDDLE NAME', value: 'DELA CRUZ, Maria Liezel Santos', role: 'name' },
    { label: 'LRN', value: '108834170092', role: 'id' },
    { label: 'Date of Birth (MM/DD/YYYY)', value: '04/26/2008', role: 'dob' },
    { label: 'Sex', value: 'Female' },
    { label: 'SCHOOL', value: 'San Isidro Integrated National High School', role: 'school' },
    { label: 'TRACK/STRAND', value: 'Academic — STEM' },
  ],
  student: { name: 'Maria Liezel Santos Dela Cruz', dob: '2008-04-26', id: '108834170092' },
  school: { name: 'San Isidro Integrated National High School' },
  cols: [
    { h: 'Indicate if Subject is CORE, APPLIED, or SPECIALIZED', f: 'x.type' },
    { h: 'SUBJECTS', f: 'n' },
    { h: 'Quarter 1', f: 'x.q1', align: 'c' },
    { h: 'Quarter 2', f: 'x.q2', align: 'c' },
    { h: 'SEM FINAL GRADE', f: 'g', align: 'c' },
    { h: 'ACTION TAKEN', f: 'x.act', align: 'c' },
  ],
  years: [
    {
      label: 'GRADE LEVEL: 11   SY: 2024-2025   SEM: 1st', level: 11, term: '1', academicYear: '2024-2025',
      courses: [
        ph('Oral Communication', 'Oral Communication', 'Core', 88, 90, 'ela.english'),
        ph('Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', 'Communication and Research in Filipino Language and Culture', 'Core', 91, 93, 'wl.native'),
        ph('General Mathematics', 'General Mathematics', 'Core', 84, 86, 'math.general'),
        ph('Earth Science', 'Earth Science', 'Core', 87, 85, 'sci.earth'),
        ph('Understanding Culture, Society and Politics', 'Understanding Culture, Society and Politics', 'Core', 92, 94, 'ss.social'),
        ph('Physical Education and Health', 'Physical Education and Health', 'Core', 95, 96, 'pe'),
        ph('Pre-Calculus', 'Pre-Calculus', 'Specialized', 79, 83, 'math.precalc'),
        ph('General Biology 1', 'General Biology 1', 'Specialized', 86, 88, 'sci.biology'),
      ],
    },
    {
      label: 'GRADE LEVEL: 11   SY: 2024-2025   SEM: 2nd', level: 11, term: '2', academicYear: '2024-2025',
      courses: [
        ph('Reading and Writing', 'Reading and Writing', 'Core', 89, 91, 'ela.english'),
        ph('Pagbasa at Pagsusuri ng Iba’t Ibang Teksto Tungo sa Pananaliksik', 'Reading and Analysis of Various Texts Toward Research (Filipino)', 'Core', 90, 92, 'wl.native'),
        ph('Statistics and Probability', 'Statistics and Probability', 'Core', 82, 80, 'math.statistics'),
        ph('Personal Development', 'Personal Development', 'Core', 93, 95, 'health'),
        ph('Empowerment Technologies', 'Empowerment Technologies', 'Applied', 94, 92, 'cs'),
        ph('Basic Calculus', 'Basic Calculus', 'Specialized', 76, 78, 'math.calculus'),
        ph('General Chemistry 1', 'General Chemistry 1', 'Specialized', 81, 84, 'sci.chemistry'),
        ph('General Biology 2', 'General Biology 2', 'Specialized', 88, 90, 'sci.biology'),
      ],
    },
  ],
  notes: [
    'Descriptors: 90-100 Outstanding; 85-89 Very Satisfactory; 80-84 Satisfactory; 75-79 Fairly Satisfactory; Below 75 Did Not Meet Expectations.',
    'REMARKS: Eligible for admission to Grade 12. Copy for transfer purposes.',
  ],
  signatures: ['Class Adviser', 'School Head', 'Certified True Copy — Registrar'],
  specimen: 'SPECIMEN — FICTITIOUS RECORD FOR SOFTWARE TESTING',
};

// ───────────────────────── The Gambia: GABECE (end of Grade 9) ─────────────────────────
const gabWord: Record<string, string> = {
  '1': 'EXCELLENT', '2': 'VERY GOOD', '3': 'GOOD', '4': 'CREDIT', '5': 'CREDIT', '6': 'CREDIT', '7': 'PASS', '8': 'PASS', '9': 'FAIL',
};
const gabUs: Record<string, string> = { '1': 'A', '2': 'B', '3': 'B', '4': 'C', '5': 'C', '6': 'C', '7': 'D', '8': 'D', '9': 'F' };
const gab = (n: string, g: string, k: string): FakeCourse => c(n, titleCase(n), g, k, gabUs[g], { x: { word: gabWord[g] } });

export const gmGabece: FakeSpec = {
  id: 'gm-gabece',
  system: 'gabece',
  country: 'The Gambia',
  lang: 'en',
  formats: ['scan-jpg', 'pdf'],
  layout: 'slip',
  style: 'sans',
  issuer: ['THE WEST AFRICAN EXAMINATIONS COUNCIL', 'THE GAMBIA NATIONAL OFFICE'],
  title: 'GAMBIA BASIC EDUCATION CERTIFICATE EXAMINATION (GABECE)',
  subtitle: 'MAY/JUNE 2022 — RESULT SLIP',
  info: [
    { label: 'Name of Candidate', value: 'CEESAY, Lamin Ousman', role: 'name' },
    { label: 'Index Number', value: '3020417056', role: 'id' },
    { label: 'Date of Birth', value: '09/03/2007', role: 'dob' },
    { label: 'Sex', value: 'Male' },
    { label: 'School', value: 'Tallinding Meadow Upper Basic School', role: 'school' },
  ],
  student: { name: 'Lamin Ousman Ceesay', dob: '2007-03-09', id: '3020417056' },
  school: { name: 'Tallinding Meadow Upper Basic School' },
  cols: [
    { h: 'SUBJECT', f: 'n' },
    { h: 'GRADE', f: 'g', align: 'c' },
    { h: 'REMARK', f: 'x.word' },
  ],
  years: [
    {
      label: 'GABECE 2022', level: 9, academicYear: '2021-2022',
      courses: [
        gab('ENGLISH LANGUAGE', '3', 'ela.english'),
        gab('MATHEMATICS', '2', 'math.general'),
        gab('SCIENCE', '4', 'sci.integrated'),
        gab('SOCIAL AND ENVIRONMENTAL STUDIES', '1', 'ss.social'),
        gab('AGRICULTURAL SCIENCE', '5', 'cte.agriculture'),
        gab('ARABIC', '2', 'wl.other'),
        gab('ISLAMIC RELIGIOUS KNOWLEDGE', '1', 'ss.religion'),
        gab('FRENCH', '6', 'wl.other'),
        gab('PHYSICAL AND HEALTH EDUCATION', '3', 'pe'),
      ],
    },
  ],
  notes: [
    'AGGREGATE: 13 (best six subjects including the four core subjects).',
    'Interpretation of grades: 1 Excellent; 2 Very Good; 3 Good; 4, 5, 6 Credit; 7, 8 Pass; 9 Fail.',
  ],
  signatures: ['Head of National Office'],
  specimen: 'SPECIMEN — FICTITIOUS RECORD FOR SOFTWARE TESTING',
};

// ───────────────────────── Nigeria: JAMB UTME (entrance examination, not coursework) ─────────────────────────
const jamb = (n: string, score: number, k: string): FakeCourse => c(n, titleCase(n), String(score), k, 'NC');

export const ngJamb: FakeSpec = {
  id: 'ng-jamb',
  system: 'jamb',
  country: 'Nigeria',
  lang: 'en',
  formats: ['pdf', 'photo-jpg'],
  layout: 'slip',
  style: 'sans',
  issuer: ['JOINT ADMISSIONS AND MATRICULATION BOARD'],
  title: 'UNIFIED TERTIARY MATRICULATION EXAMINATION (UTME) 2025',
  subtitle: 'RESULT SLIP',
  info: [
    { label: 'Candidate Name', value: 'ADEYEMI, Oluwaseun Bolanle', role: 'name' },
    { label: 'Registration Number', value: '202550418837FA', role: 'id' },
    { label: 'Date of Birth', value: '14-Nov-2006', role: 'dob' },
    { label: 'Gender', value: 'Female' },
    { label: 'State of Origin', value: 'Ogun' },
    { label: 'Examination Centre', value: 'Lagoonview Digital Test Centre, Abeokuta' },
  ],
  student: { name: 'Oluwaseun Bolanle Adeyemi', dob: '2006-11-14', id: '202550418837FA' },
  school: { name: '' },
  cols: [
    { h: 'SUBJECT', f: 'n' },
    { h: 'SCORE', f: 'g', align: 'c' },
  ],
  years: [
    {
      label: 'UTME 2025', level: 12, academicYear: '2024-2025',
      courses: [
        jamb('USE OF ENGLISH', 64, 'ela.english'),
        jamb('MATHEMATICS', 71, 'math.general'),
        jamb('PHYSICS', 58, 'sci.physics'),
        jamb('CHEMISTRY', 66, 'sci.chemistry'),
      ],
    },
  ],
  notes: ['AGGREGATE SCORE: 259 out of 400. Each subject is scored out of 100.', 'This slip is valid for the 2025/2026 admission exercise only.'],
  specimen: 'SPECIMEN — FICTITIOUS RECORD FOR SOFTWARE TESTING',
};

// ───────────────────────── Nigeria: NECO SSCE ─────────────────────────
export const ngNeco: FakeSpec = {
  id: 'ng-neco',
  system: 'waec',
  country: 'Nigeria',
  lang: 'en',
  formats: ['scan-jpg'],
  layout: 'slip',
  style: 'typewriter',
  issuer: ['NATIONAL EXAMINATIONS COUNCIL (NECO)', 'MINNA, NIGER STATE, NIGERIA'],
  title: 'SENIOR SCHOOL CERTIFICATE EXAMINATION (SSCE) INTERNAL — JUNE/JULY 2024',
  subtitle: 'STATEMENT OF RESULT',
  info: [
    { label: 'Candidate Name', value: 'ABUBAKAR, Zainab Hauwa', role: 'name' },
    { label: 'Examination Number', value: '2410493871GK', role: 'id' },
    { label: 'Date of Birth', value: '28/01/2007', role: 'dob' },
    { label: 'Centre Name', value: 'Sardauna Crescent Model Secondary School, Kaduna', role: 'school' },
  ],
  student: { name: 'Zainab Hauwa Abubakar', dob: '2007-01-28', id: '2410493871GK' },
  school: { name: 'Sardauna Crescent Model Secondary School', city: 'Kaduna' },
  cols: [
    { h: 'SUBJECT', f: 'n' },
    { h: 'GRADE', f: 'g', align: 'c' },
    { h: 'REMARK', f: 'x.word' },
  ],
  years: [
    {
      label: 'SSCE 2024', level: 12, academicYear: '2023-2024',
      courses: [
        w('ENGLISH LANGUAGE', 'C4', 'ela.english', 'C'),
        w('GENERAL MATHEMATICS', 'B3', 'math.general', 'B'),
        w('CIVIC EDUCATION', 'A1', 'ss.civics', 'A'),
        w('BIOLOGY', 'B2', 'sci.biology', 'B'),
        w('CHEMISTRY', 'C6', 'sci.chemistry', 'C'),
        w('PHYSICS', 'E8', 'sci.physics', 'D'),
        w('GOVERNMENT', 'B3', 'ss.civics', 'B'),
        w('LITERATURE IN ENGLISH', 'C5', 'ela.literature', 'C'),
        w('HAUSA LANGUAGE', 'A1', 'wl.native', 'A'),
        w('DATA PROCESSING', 'F9', 'cs', 'F'),
      ],
    },
  ],
  notes: ['A1 Excellent, B2 Very Good, B3 Good, C4-C6 Credit, D7-E8 Pass, F9 Fail.'],
  signatures: ['Registrar/Chief Executive'],
  specimen: 'SPECIMEN — FICTITIOUS RECORD FOR SOFTWARE TESTING',
};

export const specsA: FakeSpec[] = [gmWassce, gmGabece, ngSss, ngJamb, ngNeco, ghShs, ibDp, ukGcse, inCbse, phSf10];
