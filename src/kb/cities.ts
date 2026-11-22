// Five large districts, each with its own published rules for coursework from other countries, read 2026-11-21.
// Same shape as jcps.ts: requirements from the district's own graduation page, and policies quoting who evaluates a
// foreign record, what evidence it accepts, how home-language and English coursework count, and what cannot be met
// abroad. Facts the sources did not state are left out or marked as assumptions; see each profile's notes.
// Looked for and NOT added (no readable official source on 2026-11-21): Los Angeles Unified (its International
// Transcripts bulletin BUL-1545.1 is no longer on lausd.org), Fayette County KY (fcps.net and its policy manual could not
// be read; Kentucky's 704 KAR 3:307 applies there as at JCPS).
import type { DistrictPolicy, DistrictProfile, Requirement, SourceInfo } from '../core/types.ts';
import { COMMON_CATALOG } from './commonCatalog.ts';

const ADDED = '2026-11-21';
const r = (id: string, label: string, credits: number, areas: string[], o: Partial<Requirement> = {}): Requirement => ({ id, label, credits, areas, ...o });
const named = (label: string, concepts: string[], note?: string) => ({ label, concepts, note });

// ───────────── Chicago Public Schools ─────────────
const CPS_NEWCOMER: SourceInfo = { title: 'CPS: International-Newcomer Student Services (credit equivalency and foreign credential evaluation)', url: 'https://www.cps.edu/services-and-supports/international-newcomer-student-services/' };
const CPS_GRAD: SourceInfo = { title: 'CPS: Graduation Requirements', url: 'https://www.cps.edu/academics/graduation-requirements/' };
const CPS_605_1: SourceInfo = { title: 'CPS Board Policy 605.1, High School Promotion (World Language accommodation for immigrant students, Board Report 18-0627-PO1)', url: 'https://www.cps.edu/sites/cps-policy-rules/policies/600/605/605-1/' };
const CPS_605_13: SourceInfo = { title: 'CPS Board Policy 605.13, Grade Point Average (Board Report 13-0828-PO6), Section VI', url: 'https://www.cps.edu/sites/cps-policy-rules/policies/600/605/605-13/' };

const cpsPolicies: DistrictPolicy[] = [
  {
    id: 'international-transcripts',
    title: 'Who evaluates a non-US transcript',
    text: 'For grades 9–12 an evaluation of foreign credentials is required. International-Newcomer Student Services schedules it; the family brings official report cards or transcripts listing subjects and final grades. High schools then record transfer credits, grades and course levels from that evaluation, made by the CEO’s designee for foreign transcript review. Use this evaluation as preparation for that review.',
    source: CPS_NEWCOMER,
    more: [CPS_605_13],
  },
  {
    id: 'credit-equivalency',
    title: 'How much credit a year abroad earns',
    text: 'CPS credits high school study completed elsewhere year by year: a year abroad should earn about what one academic year at a Chicago public high school earns. A unit of credit is 120 hours of instruction; half a unit (60 hours) is one semester.',
    source: CPS_NEWCOMER,
    more: [CPS_605_1],
  },
  {
    id: 'grades',
    title: 'Grades from abroad',
    text: 'Transfer credits and grades are used in the student’s GPA (A = 4 … F = 0), so the converted grades matter, not only the credit.',
    source: CPS_605_13,
  },
  {
    id: 'concept:wl.native',
    title: 'World Language credit for immigrant students',
    text: 'High school students who completed core subjects in a language other than English, or took foreign-language classes outside the United States, are granted the World Language credits required for graduation, once CPS has evaluated their transcripts.',
    source: CPS_605_1,
  },
  {
    id: 'concept:ela.efl',
    title: 'English studied abroad as a foreign language',
    text: 'English taken abroad as a foreign-language class is a foreign-language class taken outside the United States, which CPS counts toward World Language. In CPS, ESL I–III and Transition English I–IV count toward the four English credits (a double period counts once), so English-learner placement is decided by the ACCESS screener, not by this record.',
    source: CPS_605_1,
    more: [CPS_GRAD],
  },
  {
    id: 'completed-abroad',
    title: 'Students who already finished high school',
    text: 'CPS enrolls F-1 and J-1 visa students only if they have not already completed high school or its equivalent. The newcomer page states this for visa students; check with the district for other students.',
    source: CPS_NEWCOMER,
  },
];

export const chicago: DistrictProfile = {
  id: 'il-cps',
  name: 'Chicago Public Schools (Chicago, IL)',
  state: 'IL',
  schoolYear: '2026-27',
  kind: 'district',
  creditsPerYearCourse: 1,
  hoursPerUnit: 120,
  creditStep: 0.5,
  // Assumption: promotion needs 5, 11 and 17 units after grades 9, 10 and 11 (Policy 605.1), about six a year.
  typicalCreditsPerYear: 6,
  totalCredits: 24,
  requirements: [
    r('ela', 'English', 4, ['ela'], { note: 'English I–IV, or ESL I–III and Transition English equivalents; a double-period course counts once.' }),
    r('math', 'Mathematics', 3, ['math'], { includes: [named('Algebra', ['math.algebra1']), named('Geometry', ['math.geometry']), named('Advanced Algebra / Trigonometry', ['math.algebra2', 'math.precalc'])] }),
    r('science', 'Science', 3, ['science'], { includes: [named('Biology', ['sci.biology']), named('Chemistry', ['sci.chemistry']), named('Physics', ['sci.physics'])] }),
    r('social', 'Social Science', 3, ['social'], {
      includes: [
        named('World Studies', ['ss.history.world', 'ss.history.national', 'ss.geography']),
        named('U.S. History', ['ss.history.us'], 'Coursework abroad rarely covers this; plan it at the CPS school.'),
        named('Civics (with a service-learning project)', ['ss.civics']),
      ],
      note: 'World Studies 1, U.S. History 1, Civics 0.5, and 0.5 of another social science. The U.S. and Illinois constitution course is a separate non-credit requirement.',
    }),
    r('world_language', 'World Language', 2, ['world_language'], { note: 'Two credits in the same language. Coursework abroad in another language can meet this (Policy 605.1 §V).' }),
    r('arts', 'Fine Arts', 2, ['arts']),
    r('pe', 'Physical Education / JROTC', 2, ['pe', 'health'], { note: 'Health and Driver’s Education must also be passed.' }),
    r('cs', 'Computer Science', 1, [], { concepts: ['cs'] }),
    r('cte', 'Career Education / JROTC', 1, ['cte']),
    r('elective', 'Electives', 3, ['elective']),
  ],
  catalog: COMMON_CATALOG,
  conceptOverrides: { 'ela.efl': 'world_language' },
  policies: cpsPolicies,
  provenance: { source: CPS_GRAD, schoolYear: '2026-27', addedOn: ADDED },
};

// ───────────── New York City Public Schools ─────────────
const NYC_GUIDE: SourceInfo = { title: 'NYCPS High School Academic Policy Guide (August 2026 edition, updated 24 August 2026), Transfer Credit and Minimum Credit Requirements', url: 'https://infohub.nyced.org/docs/default-source/default-document-library/acpolicy-highschoolacademicpolicyguide.pdf' };
const NYSED_TRANSFER: SourceInfo = { title: 'NYSED: Transfer Student Question and Answer', url: 'https://www.nysed.gov/curriculum-instruction/transfer-student-question-and-answer' };

const nycPolicies: DistrictPolicy[] = [
  {
    id: 'international-transcripts',
    title: 'Who evaluates a non-US transcript',
    text: 'The principal, after consulting relevant faculty, decides transfer credit for schools outside the United States: credit is awarded when the records show work consistent with New York’s commencement-level learning standards and of comparable scope and rigor. Credit is recorded on the Transfer Credit Equivalency Form. Use this evaluation as preparation for that decision.',
    source: NYC_GUIDE,
    more: [NYSED_TRANSFER],
  },
  {
    id: 'translation',
    title: 'Translating the record',
    text: 'The school is responsible for translating transcripts written in another language. The Office of Language Access translates foreign transcripts for free; schools may also use community translators, the home country’s consulate or a vendor. Schools must not ask the student or family to translate, or charge them for it.',
    source: NYC_GUIDE,
  },
  {
    id: 'grades',
    title: 'Grades from abroad',
    text: 'Transfer credits appear on the NYCPS transcript with the mark “CR”, not a letter or number grade, so grades from abroad do not enter the NYCPS average. The converted grades here are for the principal’s review only.',
    source: NYC_GUIDE,
  },
  {
    id: 'concept:wl.native',
    title: 'World Languages credit for schooling in another language',
    text: 'Schools may award up to 10 World Languages credits (up to six a year) to students with documented residence and school attendance in an “other-than-English-speaking environment” from age 10 or older. Only two World Languages credits are required for the diploma; the school keeps the documentation.',
    source: NYC_GUIDE,
  },
  {
    id: 'concept:ela.efl',
    title: 'English studied abroad as a foreign language',
    text: 'Only courses that address commencement-level ELA standards count toward the eight English credits; English electives do not. English taken abroad as a foreign language is placed as an elective until the principal decides otherwise.',
    source: NYC_GUIDE,
  },
  {
    id: 'pe-waiver',
    title: 'Physical education terms abroad',
    text: 'A transfer student need not make up PE for terms spent in a high school outside New York State: the school can waive that many terms of PE, lowering the PE credits still needed.',
    source: NYC_GUIDE,
  },
  {
    id: 'regents',
    title: 'Regents exams are separate from credit',
    text: 'Credit does not meet the exam requirement. Students entering a New York State high school for the first time in grade 11 or 12 are exempt from some Regents exams, and grade 11 entrants from the four Global History credits (they still need eight Social Studies credits). U.S. History cannot be replaced by Global History.',
    source: NYC_GUIDE,
  },
];

export const nyc: DistrictProfile = {
  id: 'ny-nycps',
  name: 'New York City Public Schools (New York, NY)',
  state: 'NY',
  schoolYear: '2026-27',
  kind: 'district',
  // NYCPS counts one credit per semester course: New York's 22 units are 44 NYCPS credits.
  creditsPerYearCourse: 2,
  // A unit of study is 180 minutes a week for a semester, 54 hours per NYCPS credit, so a full-year course is 108 hours.
  hoursPerUnit: 108,
  creditStep: 0.5,
  // Assumption: 44 credits over four years.
  typicalCreditsPerYear: 11,
  totalCredits: 44,
  requirements: [
    r('ela', 'English Language Arts', 8, ['ela'], { note: 'Courses coded EE (commencement-level ELA standards); English electives do not count.' }),
    r('social', 'Social Studies', 8, ['social'], {
      includes: [
        named('Global History and Geography (4 credits)', ['ss.history.world', 'ss.history.national', 'ss.geography']),
        named('U.S. History (2 credits)', ['ss.history.us'], 'Coursework abroad rarely covers this; plan it at the NYCPS school.'),
        named('Participation in Government (1 credit)', ['ss.civics']),
        named('Economics (1 credit)', ['ss.economics']),
      ],
    }),
    r('math', 'Mathematics', 6, ['math'], { note: 'At least two credits above Algebra I, such as Geometry or Algebra II.' }),
    r('science', 'Science', 6, ['science'], { note: 'Two credits of life science, two of physical science, and two of either.' }),
    r('world_language', 'World Languages', 2, ['world_language']),
    r('arts', 'Visual Art, Music, Dance and/or Theater', 2, ['arts']),
    r('pe', 'Physical Education', 4, ['pe'], { note: 'Taken every year; terms in a high school outside New York State can be waived.' }),
    r('health', 'Health', 1, ['health']),
    r('elective', 'Electives', 7, ['elective', 'cte']),
  ],
  catalog: COMMON_CATALOG.map((c) => ({ ...c, credits: c.credits * 2 })),
  conceptOverrides: {},
  policies: nycPolicies,
  provenance: { source: NYC_GUIDE, schoolYear: '2026-27', addedOn: ADDED },
};

// ───────────── Miami-Dade County Public Schools ─────────────
const MDCPS_ELL: SourceInfo = { title: 'M-DCPS District English Language Learners (ELL) Plan 2025-2028 (Rule 6A-6.0905, Form ESOL 100), Department of Bilingual Education and World Languages', url: 'https://www.bilingualmdcps.com/wp-content/uploads/Miami-Dade-ELL-Plan-2025-2028.pdf' };
const FL_1003_4282: SourceInfo = { title: 'Section 1003.4282, Florida Statutes (2025), Requirements for a standard high school diploma', url: 'https://www.flsenate.gov/Laws/Statutes/2025/1003.4282' };
const FL_TRANSFER: SourceInfo = { title: 'Rule 6A-1.09941, F.A.C., State Uniform Transfer of Students in Middle Grades and High School (effective 27 August 2024)', url: 'https://www.flrules.org/gateway/ruleNo.asp?id=6A-1.09941' };
const FL_CREDIT: SourceInfo = { title: 'Section 1003.436, Florida Statutes, Definition of “credit”', url: 'https://m.flsenate.gov/Statutes/1003.436' };

const mdcpsPolicies: DistrictPolicy[] = [
  {
    id: 'international-transcripts',
    title: 'Who evaluates a non-US transcript',
    text: 'The school counselor or registrar evaluates the transcript; when school staff cannot interpret a foreign record, the Foreign Records Department of the Federal and State Compliance Office (FASCO) translates it and converts every grade level’s coursework and grades. The evaluation goes on a Transcript Review and Course Evaluation (TRACE) form and is entered to award credit. Enrollment is not delayed while records are evaluated.',
    source: MDCPS_ELL,
  },
  {
    id: 'placement',
    title: 'Placement from home-country records',
    text: 'Students with school records from their home country are placed by those records. Placing a student in a lower grade must be documented with home-language assessment data and reviewed by the district, and parents told first. Once the grade is set, credit requirements of the grades below it are waived, not made up.',
    source: MDCPS_ELL,
  },
  {
    id: 'validation',
    title: 'Validating transferred credit',
    text: 'Credits on an official transcript are accepted at face value, subject to validation. Without an official transcript, credit is validated by performance in the first grading period (a 2.0 GPA), or by a portfolio, a teacher’s recommendation, or assessments chosen by the teacher, principal and parent. A final grade and credit in Algebra I, Geometry, Biology I or U.S. History on an out-of-country transcript is honored without the end-of-course exam.',
    source: FL_TRANSFER,
    more: [FL_1003_4282],
  },
  {
    id: 'credit-hours',
    title: 'What one credit is',
    text: 'One full credit is at least 135 hours of bona fide instruction in a course with student performance standards. Where a record prints hours, evalua converts them at 135 hours per credit.',
    source: FL_CREDIT,
  },
  {
    id: 'concept:wl.native',
    title: 'Language arts taken in another country',
    text: 'A language arts course taken in a foreign country is awarded as an English credit. So language arts in the student’s home language counts toward English Language Arts here, unlike districts that count it as world-language credit.',
    source: MDCPS_ELL,
  },
  {
    id: 'concept:ela.efl',
    title: 'English studied abroad as a foreign language',
    text: 'English taken in a foreign country as a foreign language is awarded as a foreign-language credit. The standard diploma has no world-language requirement, so it counts among the electives.',
    source: MDCPS_ELL,
  },
  {
    id: 'completed-abroad',
    title: 'Secondary education already completed abroad',
    text: 'A student who has a diploma or certificate equivalent to a high school diploma may enroll in adult education courses. Check this before planning a diploma path for a student whose record shows a completed final year or school-leaving certificate.',
    source: MDCPS_ELL,
  },
];

export const miamiDade: DistrictProfile = {
  id: 'fl-mdcps',
  name: 'Miami-Dade County Public Schools (Miami, FL)',
  state: 'FL',
  schoolYear: '2025-26',
  kind: 'district',
  creditsPerYearCourse: 1,
  hoursPerUnit: 135,
  creditStep: 0.5,
  // Assumption: not stated in the sources read.
  typicalCreditsPerYear: 6,
  totalCredits: 24,
  requirements: [
    r('ela', 'English Language Arts', 4, ['ela'], { note: 'ELA 1–4. Language arts taken in another country counts here (M-DCPS ELL Plan).' }),
    r('math', 'Mathematics', 4, ['math'], { includes: [named('Algebra 1', ['math.algebra1']), named('Geometry', ['math.geometry'])] }),
    r('science', 'Science', 3, ['science'], { includes: [named('Biology 1', ['sci.biology'])], note: 'Two credits must have a laboratory component.' }),
    r('social', 'Social Studies', 3, ['social'], {
      includes: [
        named('World History', ['ss.history.world', 'ss.history.national']),
        named('U.S. History', ['ss.history.us'], 'Coursework abroad rarely covers this; plan it at the US school.'),
        named('U.S. Government (0.5)', ['ss.civics']),
        named('Economics (0.5)', ['ss.economics']),
      ],
    }),
    r('arts', 'Fine and Performing Arts, Speech and Debate, or Practical Arts', 1, ['arts']),
    r('pe', 'Physical Education (with health)', 1, ['pe', 'health']),
    r('finance', 'Personal Financial Literacy', 0.5, [], { concepts: ['cte.finance'], note: 'Students entering grade 9 in 2023-24 or later.' }),
    r('elective', 'Electives', 7.5, ['elective', 'world_language', 'cte']),
  ],
  catalog: COMMON_CATALOG,
  // Home-language arts is English credit at M-DCPS; English as a foreign language is foreign-language (elective) credit.
  conceptOverrides: { 'wl.native': 'ela', 'ela.efl': 'elective' },
  policies: mdcpsPolicies,
  provenance: { source: MDCPS_ELL, schoolYear: '2025-26', addedOn: ADDED },
};
export const miamiDadeSources = [MDCPS_ELL, FL_1003_4282, FL_TRANSFER, FL_CREDIT];

// ───────────── Houston Independent School District ─────────────
const HISD_GRAD: SourceInfo = { title: 'Houston ISD: Graduation Requirements (Foundation High School Program with Distinguished Level of Achievement)', url: 'https://www.houstonisd.org/families-students/student-requirements-expectations/graduation-requirements' };
const HISD_CBE: SourceInfo = { title: 'Houston ISD: Credit By Exam (CBE)', url: 'https://www.houstonisd.org/schools-academics/academics/student-assessment-2/cbe' };

const hisdPolicies: DistrictPolicy[] = [
  {
    id: 'international-transcripts',
    title: 'Who evaluates a non-US transcript',
    text: 'Houston ISD publishes no procedure for foreign transcripts that evalua could find (its board policy manual could not be read). The school counselor decides; Texas leaves foreign credit to each district. Use this evaluation as preparation for that decision.',
    source: HISD_GRAD,
  },
  {
    id: 'credit-by-exam',
    title: 'Credit by exam for students from foreign schools',
    text: 'HISD uses Credit by Exam for students enrolling from foreign schools, unaccredited private schools and home schools, and for students with no records. A student may attempt credit in the same course at most twice while enrolled in HISD, and at most three course credits per testing window, which is offered four times a year.',
    source: HISD_CBE,
  },
];

export const houston: DistrictProfile = {
  id: 'tx-hisd',
  name: 'Houston Independent School District (Houston, TX)',
  state: 'TX',
  schoolYear: '2026-27',
  kind: 'district',
  creditsPerYearCourse: 1,
  // Assumption: Texas sets no hours per credit in the sources read; evalua's default Carnegie unit.
  hoursPerUnit: 120,
  creditStep: 0.5,
  // Assumption: 26 credits over four years.
  typicalCreditsPerYear: 7,
  totalCredits: 26,
  requirements: [
    r('ela', 'English', 4, ['ela']),
    r('math', 'Mathematics', 4, ['math'], { includes: [named('Algebra II', ['math.algebra2'], 'Required for the Distinguished Level of Achievement.')], note: 'Three Foundation credits plus one advanced credit, including Algebra II.' }),
    r('science', 'Science', 4, ['science'], { note: 'Three Foundation credits plus one endorsement credit.' }),
    r('social', 'Social Studies', 3, ['social']),
    r('world_language', 'Languages Other Than English (LOTE)', 2, ['world_language'], { note: 'Both credits in the same language.' }),
    r('pe', 'Physical Education', 1, ['pe', 'health']),
    r('arts', 'Fine Arts', 1, ['arts']),
    r('elective', 'Electives', 7, ['elective', 'cte'], { note: 'Five Foundation electives plus two aligned to the endorsement.' }),
  ],
  catalog: COMMON_CATALOG,
  conceptOverrides: {},
  policies: hisdPolicies,
  provenance: { source: HISD_GRAD, schoolYear: '2026-27', addedOn: ADDED },
};

// ───────────── Montgomery County Public Schools (Maryland) ─────────────
const MCPS_IAE: SourceInfo = { title: 'MCPS International Admissions and Enrollment: Credit Evaluations', url: 'https://www.montgomeryschoolsmd.org/departments/studentservices/schooling/iae/credit-evaluations/' };
const MCPS_GRAD: SourceInfo = { title: 'MCPS Graduation Requirements at a Glance, Class of 2030 (first year of grade 9: 2026-27)', url: 'https://www.montgomeryschoolsmd.org/siteassets/district/curriculum/graduation-requirements/0609.26_graduationataglance_classof2030.pdf' };
const COMAR: SourceInfo = { title: 'COMAR 13A.03.02.03, Maryland High School Diploma credit requirements (via Cornell LII)', url: 'https://www.law.cornell.edu/regulations/maryland/COMAR-13A-03-02-03' };

const mcpsPolicies: DistrictPolicy[] = [
  {
    id: 'international-transcripts',
    title: 'Who evaluates a non-US transcript',
    text: 'International Admissions and Enrollment (IAE) intake specialists analyze official transcripts and certified translations, convert non-US records to the US system with the MAFSA charts, list every course by year, grade and credit, and place the student in a grade by the high school credits transferred. An evaluation from any MSDE-approved provider is also accepted. Students from US-accredited schools abroad enroll directly at their school. Use this evaluation as preparation for IAE’s.',
    source: MCPS_IAE,
  },
  {
    id: 'evidence',
    title: 'What counts as an official transcript',
    text: 'An official transcript names the school and the student (full legal name and date of birth), lists courses with levels, credits, final grades and cumulative GPA, states graduation status, and carries an official signature or seal. It must come directly from the school or in a sealed envelope; one without official verification may be treated as unofficial. Families also complete a source school history form.',
    source: MCPS_IAE,
  },
  {
    id: 'deadline',
    title: 'Sixty days to add records',
    text: 'Families and schools should send further school records to IAE within 60 days of enrollment; families in crisis may have records considered later, case by case. Students who cannot provide records because of a crisis may be placed in grade 9, depending on age.',
    source: MCPS_IAE,
  },
  {
    id: 'assessments',
    title: 'State assessments',
    text: 'Algebra 1, English 10, Government and Life Science each need course credit and the Maryland Comprehensive Assessment. Students transferring from outside Maryland public schools may meet some assessment requirements with transfer credit.',
    source: MCPS_GRAD,
  },
];

export const montgomery: DistrictProfile = {
  id: 'md-mcps',
  name: 'Montgomery County Public Schools (Rockville, MD)',
  state: 'MD',
  schoolYear: '2026-27',
  kind: 'district',
  creditsPerYearCourse: 1,
  // Assumption: evalua's default Carnegie unit; the sources read state no hours.
  hoursPerUnit: 120,
  creditStep: 0.5,
  // Assumption: 22 credits over four years with a mathematics course every year.
  typicalCreditsPerYear: 6,
  totalCredits: 22,
  requirements: [
    r('ela', 'English', 4, ['ela']),
    r('math', 'Mathematics', 4, ['math'], { includes: [named('Algebra 1', ['math.algebra1']), named('Geometry', ['math.geometry'])], note: 'A mathematics course every year of high school.' }),
    r('science', 'Science', 3, ['science'], { includes: [named('Life science', ['sci.biology']), named('Physical science', ['sci.chemistry', 'sci.physics', 'sci.physical']), named('Earth/space science', ['sci.earth'])] }),
    r('social', 'Social Studies', 3, ['social'], {
      includes: [
        named('U.S. History', ['ss.history.us'], 'Coursework abroad rarely covers this; plan it at the MCPS school.'),
        named('World History', ['ss.history.world', 'ss.history.national']),
        named('National, State, and Local Government', ['ss.civics']),
      ],
    }),
    r('arts', 'Fine Arts', 1, ['arts']),
    r('health', 'Health Education', 1, ['health']),
    r('pe', 'Physical Education', 1, ['pe']),
    r('tech', 'Computer Science, Engineering or Technology Education', 1, [], { concepts: ['cs', 'cte.technology'] }),
    r('world_language', 'World Language', 2, ['world_language'], { note: 'Two credits of the same language, or a state-approved CTE program of study instead.' }),
    r('elective', 'Electives', 2, ['elective', 'cte']),
  ],
  catalog: COMMON_CATALOG,
  conceptOverrides: {},
  policies: mcpsPolicies,
  provenance: { source: MCPS_GRAD, schoolYear: '2026-27', addedOn: ADDED },
};
export const montgomerySources = [MCPS_IAE, MCPS_GRAD, COMAR];

export const cityDistricts = [chicago, nyc, miamiDade, houston, montgomery];
