// Jefferson County Public Schools (Louisville, Kentucky): a full district profile.
// Sources read 2026-11-15:
//   704 KAR 3:305 (Kentucky minimum graduation requirements, amended effective 2026-07-06)
//   KDE Minimum High School Graduation Requirements FAQ (2026-27 edition) and New Graduation Requirements chart (July 2025)
//   JCPS High School Student Progression, Promotion and Grading Handbook (2025-26; no 2026-27 edition was found)
//   Kentucky course codes from the KDE course standards documents and the KDE course database (kecs.education.ky.gov)
// Not verified: a district-wide JCPS 2026-27 course catalog (none was found); codes for non-AP Pre-Calculus,
// Calculus, Statistics, English Learner and world-language levels I–IV, which appear here without a code.
import type { CatalogCourse, DistrictPolicy, DistrictProfile, SourceInfo } from '../core/types.ts';

const KAR: SourceInfo = { title: '704 KAR 3:305, Minimum requirements for high school graduation (Kentucky)', url: 'https://apps.legislature.ky.gov/law/kar/titles/704/003/305/' };
const KDE_FAQ: SourceInfo = { title: 'KDE: Minimum High School Graduation Requirements FAQ (2026-27)', url: 'https://education.ky.gov/curriculum/hsgradreq/Documents/Minimum_High_School_Graduation_Requirements_FAQ.pdf' };
const KDE_CHART: SourceInfo = { title: 'KDE: New Graduation Requirements (July 2025)', url: 'https://education.ky.gov/curriculum/hsgradreq/Documents/New_Graduation_Requirements.pdf' };
const SPPG: SourceInfo = {
  title: 'JCPS High School Student Progression, Promotion and Grading Handbook (2025-26)',
  url: 'https://core-docs.s3.us-east-1.amazonaws.com/documents/asset/uploaded_file/4298/JCPS/4108721/High_School_Student_Progression_Promotion_and_Grading_Handbook_SPPG.pdf',
};
const KECS: SourceInfo = { title: 'Kentucky course codes (KDE course database and course standards documents)', url: 'https://kecs.education.ky.gov/Public/CourseSearch' };
const KAR_307: SourceInfo = { title: '704 KAR 3:307, credit for students from non-accredited schools (as quoted in the JCPS handbook)', url: SPPG.url };

const k = (code: string | undefined, title: string, requirement: string, concepts: string[], o: { levels?: number[]; credits?: number; keywords?: string[] } = {}): CatalogCourse => ({
  code, title, requirement, concepts, credits: o.credits ?? 1, levels: o.levels, keywords: o.keywords,
});

const catalog: CatalogCourse[] = [
  // English (KDE Reading and Writing course standards)
  k('230107', 'English 1', 'ela', ['ela.english', 'ela.literature'], { levels: [9] }),
  k('230110', 'English 2', 'ela', ['ela.english', 'ela.literature'], { levels: [10] }),
  k('230113', 'English 3', 'ela', ['ela.english', 'ela.literature'], { levels: [11] }),
  k('230116', 'English 4', 'ela', ['ela.english', 'ela.literature'], { levels: [12] }),
  k(undefined, 'English Learner course (elective)', 'elective', ['ela.efl']),
  // Mathematics (KDE course database / Mathematics course standards)
  k('270304', 'Algebra 1', 'math', ['math.algebra1'], { levels: [9] }),
  k('270401', 'Geometry', 'math', ['math.geometry'], { levels: [10] }),
  k('270311', 'Algebra 2', 'math', ['math.algebra2'], { levels: [11] }),
  k('270320', 'Algebra 3', 'math', ['math.general', 'math.advanced']),
  k('270510', 'AP Precalculus', 'math', ['math.precalc'], { levels: [12] }),
  k(undefined, 'Pre-Calculus', 'math', ['math.precalc']),
  k('270513', 'AP Calculus AB', 'math', ['math.calculus']),
  k('270604', 'AP Statistics', 'math', ['math.statistics']),
  // Science (KDE Science course standards)
  k('302601', 'Biology I', 'science', ['sci.biology']),
  k('304521', 'Chemistry I', 'science', ['sci.chemistry']),
  k('304821', 'Physics I', 'science', ['sci.physics']),
  k('304611', 'Earth Space Science', 'science', ['sci.earth']),
  k('304620', 'Environmental Science', 'science', ['sci.environmental']),
  k('304058', 'Introduction to Chemistry and Physics', 'science', ['sci.physical']),
  k('303051', 'Conceptual Progression Science I', 'science', ['sci.integrated']),
  // Social studies (KDE Social Studies course standards)
  k('450835', 'World History', 'social', ['ss.history.world', 'ss.history.national']),
  k('450812', 'United States History 1877–Present', 'social', ['ss.history.us']),
  k('451001', 'Civics', 'social', ['ss.civics']),
  k('450601', 'Economics', 'social', ['ss.economics']),
  k('450709', 'Geography', 'social', ['ss.geography']),
  k('459801', 'Integrated Social Studies', 'social', ['ss.social', 'ss.sociology', 'ss.psychology', 'ss.philosophy']),
  // World languages (not required for the JCPS diploma; elective credit)
  k(undefined, 'World Language (home language)', 'elective', ['wl.native']),
  k(undefined, 'World Language', 'elective', ['wl.other']),
  k('161130', 'AP Spanish Language & Culture', 'elective', [], { keywords: ['spanish', 'español', 'espagnol'] }),
  k('160430', 'AP French Language & Culture', 'elective', [], { keywords: ['french', 'français', 'francés'] }),
  // Arts (KDE Visual and Performing Arts course codes)
  k('500711', 'Comprehensive Visual Arts', 'arts', ['arts.visual']),
  k('500712', 'Drawing and Painting', 'arts', ['arts.visual'], { keywords: ['drawing', 'painting'] }),
  k('500911', 'General Music', 'arts', ['arts.music']),
  k('500925', 'Chorus', 'arts', ['arts.music'], { keywords: ['choir', 'chorus', 'vocal'] }),
  k('500111', 'Survey Course of the Visual and Performing Arts', 'arts', ['arts.performing']),
  // Health and physical education
  k('340133', 'Health Education I', 'health', ['health'], { credits: 0.5 }),
  k('340216', 'Physical Education I', 'pe', ['pe'], { credits: 0.5 }),
  // Computer science and career and technical education (KDE CTE programs of study)
  k('110710', 'Introduction to Computer Science', 'elective', ['cs']),
  k('110201', 'Introduction to Programming', 'elective', ['cs'], { keywords: ['programming', 'coding'] }),
  k('460316', 'Circuits I', 'elective', ['cte.technology'], { keywords: ['electric', 'electrical', 'electronic', 'circuit'] }),
  k('470507', 'Automotive Maintenance and Light Repair, Section A', 'elective', ['cte.technology'], { keywords: ['auto', 'motor', 'mechanic', 'vehicle'] }),
  k('480110', 'Introduction to Computer-Aided Drafting', 'elective', ['cte.technology'], { keywords: ['drawing', 'drafting', 'graphics', 'cad'] }),
  k('210221', 'Engineering I', 'elective', ['cte.technology']),
  k('080719', 'Financial Literacy', 'elective', ['cte.finance']),
  k(undefined, 'Business / Accounting (CTE)', 'elective', ['cte.business']),
  k(undefined, 'Agriculture (CTE)', 'elective', ['cte.agriculture']),
  k(undefined, 'Family and Consumer Sciences (CTE)', 'elective', ['cte.home']),
  k(undefined, 'General elective', 'elective', ['elective.other', 'ss.religion']),
];

const policies: DistrictPolicy[] = [
  {
    id: 'international-transcripts',
    title: 'Who evaluates a non-US transcript',
    text: 'For multilingual learners, non-US transcripts are evaluated by the JCPS Office of Multilingual Learners; for other transfers, the school counselor converts transcripts from outside JCPS. Use this evaluation as preparation for that review.',
    source: SPPG,
  },
  {
    id: 'completed-abroad',
    title: 'Secondary education already completed abroad',
    text: '“A student who has completed the required education coursework in their country shall not be a candidate for a diploma from JCPS.” Check this before planning a diploma path for a student whose record shows a completed final year or school-leaving certificate.',
    source: SPPG,
  },
  {
    id: 'sequence-validation',
    title: 'Credit for work from a non-accredited school',
    text: 'Credit may be awarded by examination, or when the student earns at least a C in the next course of a sequence by the twelfth week. Placing the student in the next course is therefore also a way to validate earlier coursework.',
    source: KAR_307,
  },
  {
    id: 'credit-steps',
    title: 'How JCPS awards credit',
    text: 'A semester or trimester final grade earns 0.5 credit; a yearlong final grade earns 1 credit. A Carnegie unit is at least 120 hours of instruction in one subject. Class standing: 0–4.99 credits freshman, 5–10.99 sophomore, 11–15.99 junior, 16 or more senior.',
    source: SPPG,
  },
  {
    id: 'non-credit',
    title: 'Graduation requirements that are not credits',
    text: 'Civics test: 60% or higher, or 70% for students entering grade 9 on or after 1 July 2025 (JCPS-written). Technology competency (digital literacy course, the senior defense, a certification, or EverFi Ignition). Essential workplace skills instruction. Individual Learning Plan each year. Senior Journey to Success Presentation/Defense of Learning (schools may exempt students who enrol in the spring of senior year).',
    source: SPPG,
  },
  {
    id: 'financial-literacy',
    title: 'Financial literacy',
    text: 'Students entering grade 9 on or after 1 July 2025 need a one-credit Financial Literacy course (KRS 158.1411). It is part of the 22 credits and is normally taken at the US school.',
    source: KDE_CHART,
  },
  {
    id: 'concept:wl.native',
    title: 'Home-language coursework',
    text: 'JCPS does not require a world language for the diploma, so language and literature taught in the student’s home language count as world-language elective credit. Two world-language credits are part of Kentucky’s pre-college curriculum for university admission.',
    source: KDE_FAQ,
  },
  {
    id: 'concept:ela.efl',
    title: 'English studied as a foreign language',
    text: 'English taken abroad as a foreign-language subject is placed as an elective. Kentucky course-code guidance says English learner (ESL) courses count only as electives, not toward the four English credits. Coursework taught in English as the language of instruction (English Language in West African systems) is English language arts.',
    source: { title: 'KDE: Course Codes Frequently Asked Questions', url: 'https://education.ky.gov/curriculum/modcurrframe/Documents/Course_Codes_Frequently_Asked_Questions.pdf' },
  },
];

export const jcps: DistrictProfile = {
  id: 'ky-jcps',
  name: 'Jefferson County Public Schools (Louisville, KY)',
  state: 'KY',
  schoolYear: '2025-26',
  kind: 'district',
  creditsPerYearCourse: 1,
  hoursPerUnit: 120,
  creditStep: 0.5,
  // Not stated in the handbook: assumes a seven-period day.
  typicalCreditsPerYear: 7,
  totalCredits: 22,
  requirements: [
    {
      id: 'ela', label: 'English / Language Arts', credits: 4, areas: ['ela'],
      includes: [{ label: 'English I', concepts: ['ela.english', 'ela.literature'] }, { label: 'English II', concepts: ['ela.english', 'ela.literature'] }],
      note: 'English I and II plus two personalized credits (704 KAR 3:305).',
    },
    {
      id: 'math', label: 'Mathematics', credits: 4, areas: ['math'],
      includes: [
        { label: 'Algebra I', concepts: ['math.algebra1'] },
        { label: 'Geometry', concepts: ['math.geometry'] },
        { label: 'Algebra II', concepts: ['math.algebra2'], note: 'JCPS requires Algebra II, or a career pathway course that incorporates its standards; the state does not.' },
      ],
      note: 'Algebra I, Geometry and Algebra II (JCPS), plus one personalized credit.',
    },
    { id: 'science', label: 'Science', credits: 3, areas: ['science'], note: 'Two credits must include lab-based investigation. JCPS: content from Biology, Physics, Earth and Space Science, and Chemistry.' },
    {
      id: 'social', label: 'Social Studies', credits: 3, areas: ['social'],
      includes: [
        { label: 'U.S. History', concepts: ['ss.history.us'], note: 'Coursework abroad rarely covers this; plan it at the US school.' },
        { label: 'World History', concepts: ['ss.history.world'] },
        { label: 'A course covering economics, government and world geography (civics)', concepts: ['ss.civics', 'ss.economics', 'ss.geography'] },
      ],
      note: 'JCPS names U.S. History and World History; the third credit must cover economics, government and world geography.',
    },
    { id: 'health', label: 'Health', credits: 0.5, areas: ['health'] },
    { id: 'pe', label: 'Physical Education', credits: 0.5, areas: ['pe'], note: 'JROTC can count as PE.' },
    { id: 'arts', label: 'Visual and Performing Arts', credits: 1, areas: ['arts'], note: 'Arts credit cannot be earned through social studies or world-language courses.' },
    {
      id: 'elective', label: 'Electives', credits: 6, areas: ['elective', 'cte', 'world_language'],
      includes: [{ label: 'Financial Literacy (students entering grade 9 on or after 1 July 2025)', concepts: ['cte.finance'], note: 'Normally taken at the US school.' }],
      note: 'Six credits, including four standards-based learning experiences tied to the Individual Learning Plan.',
    },
  ],
  catalog,
  conceptOverrides: {},
  policies,
  provenance: { source: SPPG, schoolYear: '2025-26', addedOn: '2026-11-15' },
};

export const jcpsSources = [KAR, KDE_FAQ, KDE_CHART, SPPG, KECS];
