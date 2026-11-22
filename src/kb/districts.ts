// District profiles. The seeded ones are STATE-MINIMUM TEMPLATES, not any district's actual rules:
// local boards add requirements, so a counselor should copy a template and edit it for their district.
import type { DistrictPolicy, DistrictProfile, Requirement, SourceInfo } from '../core/types.ts';
import { COMMON_CATALOG } from './commonCatalog.ts';
import { cityDistricts } from './cities.ts';
import { jcps } from './jcps.ts';

export { COMMON_CATALOG };

const YEAR = '2026-27';
const ADDED = '2026-11-15';

const req = (id: string, label: string, credits: number, areas: string[], note?: string): Requirement => ({ id, label, credits, areas, note });

const DEFAULT_NOTE: SourceInfo = { title: 'evalua default placement — not a state rule; set your district’s policy' };

const defaultPolicies = (hasWorldLanguage: boolean): DistrictPolicy[] => [
  {
    id: 'concept:wl.native',
    title: 'Home-language coursework',
    text: hasWorldLanguage
      ? 'Language and literature courses taught in the student’s home language are placed under World Language by default. Districts differ: some award English credit for home-language arts instead. Confirm against local policy.'
      : 'Language and literature courses taught in the student’s home language are placed as electives by default, because this template has no separate world-language requirement. Confirm against local policy.',
    source: DEFAULT_NOTE,
  },
  {
    id: 'concept:ela.efl',
    title: 'English studied as a foreign language',
    text: 'English taken abroad as a foreign-language subject is placed as an elective by default. Some districts count it toward the English requirement or as English language development credit. Confirm against local policy.',
    source: DEFAULT_NOTE,
  },
];

interface TemplateInput {
  id: string;
  name: string;
  state: string;
  source: SourceInfo;
  requirements: Requirement[];
  total: number;
  typicalPerYear?: number;
  policies?: DistrictPolicy[];
}

function template(t: TemplateInput): DistrictProfile {
  const hasWl = t.requirements.some((r) => r.areas.includes('world_language'));
  return {
    id: t.id,
    name: t.name,
    state: t.state,
    schoolYear: YEAR,
    kind: 'template',
    creditsPerYearCourse: 1,
    hoursPerUnit: 120,
    typicalCreditsPerYear: t.typicalPerYear ?? 6,
    // Most US high schools award half a credit per semester.
    creditStep: 0.5,
    totalCredits: t.total,
    requirements: t.requirements,
    catalog: COMMON_CATALOG,
    conceptOverrides: {},
    policies: [...defaultPolicies(hasWl), ...(t.policies ?? [])],
    provenance: { source: t.source, schoolYear: YEAR, addedOn: ADDED },
  };
}

export const districts: DistrictProfile[] = [
  jcps,
  ...cityDistricts,
  template({
    id: 'tx-foundation',
    name: 'Texas — Foundation High School Program (state minimum)',
    state: 'TX',
    source: { title: '19 Texas Administrative Code §74.12, Foundation High School Program (effective 8/1/2025)', url: 'https://www.law.cornell.edu/regulations/texas/19-Tex-Admin-Code-SS-74.12' },
    total: 22,
    requirements: [
      req('ela', 'English Language Arts', 4, ['ela'], 'English I and II, English III (or comparable), and a fourth credit from the listed options.'),
      req('math', 'Mathematics', 3, ['math'], 'Algebra I and Geometry required, plus a third credit.'),
      req('science', 'Science', 3, ['science'], 'One credit must be Biology; one laboratory-based credit; one additional credit.'),
      req('social', 'Social Studies', 3, ['social'], 'U.S. History (1), U.S. Government (0.5), Economics (0.5), and World History or World Geography (1). U.S. History and Government cannot come from foreign coursework.'),
      req('world_language', 'Languages Other Than English', 2, ['world_language'], 'Two credits in the same language (or two computer programming credits).'),
      req('pe', 'Physical Education', 1, ['pe', 'health']),
      req('arts', 'Fine Arts', 1, ['arts']),
      req('elective', 'Electives', 5, ['elective', 'cte']),
    ],
  }),
  template({
    id: 'ca-state-minimum',
    name: 'California — state minimum courses (Education Code 51225.3)',
    state: 'CA',
    source: { title: 'California Department of Education: State Minimum High School Graduation Requirements (reviewed January 2026)', url: 'https://www.cde.ca.gov/ci/gs/hs/hsgrmin.asp' },
    total: 13,
    typicalPerYear: 6,
    requirements: [
      req('ela', 'English', 3, ['ela'], 'Three year-long courses.'),
      req('math', 'Mathematics', 2, ['math'], 'Two courses, including one year of Algebra I.'),
      req('science', 'Science', 2, ['science'], 'Two courses, including biological and physical sciences.'),
      req('social', 'Social Studies', 3, ['social'], 'U.S. history and geography; world history, culture and geography; one semester of American government and civics; one semester of economics.'),
      req('arts_wl_cte', 'Visual or Performing Arts, World Language, or Career Technical Education', 1, ['arts', 'world_language', 'cte']),
      req('pe', 'Physical Education', 2, ['pe', 'health'], 'Two courses unless exempt.'),
      req('elective', 'Other courses (locally required)', 0, ['elective'], 'California counts courses, not credits, at state level. Districts add their own totals (commonly 10 credits per year-long course). Ethnic studies (one semester) applies from the class of 2029-30 and personal finance from 2030-31.'),
    ],
  }),
  template({
    id: 'ny-regents',
    name: 'New York — Regents / local diploma credit requirements',
    state: 'NY',
    source: { title: 'New York State Education Department: Graduation Requirements (diploma and credentials summary)', url: 'https://www.nysed.gov/standards-instruction/graduation-requirements' },
    total: 22,
    requirements: [
      req('ela', 'English Language Arts', 4, ['ela']),
      req('social', 'Social Studies', 4, ['social'], 'Includes U.S. History (1), Participation in Government (0.5) and Economics (0.5), which cannot come from foreign coursework.'),
      req('math', 'Mathematics', 3, ['math']),
      req('science', 'Science', 3, ['science'], 'At least one life science and one physical science.'),
      req('world_language', 'World Languages', 1, ['world_language']),
      req('arts', 'The Arts', 1, ['arts']),
      req('health', 'Health', 0.5, ['health']),
      req('pe', 'Physical Education', 2, ['pe']),
      req('elective', 'Electives', 3.5, ['elective', 'cte']),
    ],
    policies: [
      {
        id: 'transfer',
        title: 'Who awards transfer credit',
        text: 'The principal, in consultation with relevant faculty, evaluates a transfer student’s transcript or other records and awards the appropriate units of credit. Credit and Regents examination requirements are separate.',
        source: { title: 'NYSED: Transfer Student Question and Answer', url: 'https://www.nysed.gov/curriculum-instruction/transfer-student-question-and-answer' },
      },
    ],
  }),
  template({
    id: 'fl-standard',
    name: 'Florida — 24-credit standard diploma',
    state: 'FL',
    source: { title: 'Florida Department of Education: Graduation Requirements (section 1003.4282, Florida Statutes)', url: 'https://www.fldoe.org/schools/k-12-public-schools/sss/graduation-requirements' },
    total: 24,
    requirements: [
      req('ela', 'English Language Arts', 4, ['ela'], 'ELA 1–4.'),
      req('math', 'Mathematics', 4, ['math'], 'Must include Algebra 1 and Geometry.'),
      req('science', 'Science', 3, ['science'], 'One must be Biology 1; two must have a laboratory component.'),
      req('social', 'Social Studies', 3, ['social'], 'World History (1), U.S. History (1), U.S. Government (0.5), Economics (0.5).'),
      req('arts', 'Fine and Performing Arts, Speech and Debate, or Practical Arts', 1, ['arts', 'cte']),
      req('pe', 'Physical Education (with health)', 1, ['pe', 'health']),
      req('finance', 'Personal Financial Literacy', 0.5, [], 'Applies to students entering grade 9 in 2023-24 or later; not normally met by foreign coursework.'),
      req('elective', 'Electives', 7.5, ['elective', 'world_language']),
    ],
  }),
  template({
    id: 'wa-24',
    name: 'Washington — 24-credit graduation requirements',
    state: 'WA',
    source: { title: 'Washington State Board of Education: Graduation Requirements', url: 'https://sbe.wa.gov/our-work/graduation-requirements' },
    total: 24,
    requirements: [
      req('ela', 'English', 4, ['ela']),
      req('math', 'Mathematics', 3, ['math']),
      req('science', 'Science', 3, ['science'], 'Two credits must be laboratory science.'),
      req('social', 'Social Studies', 3, ['social'], 'For example U.S. history (1), contemporary world history (0.5), civics (0.5) and a social studies elective (1).'),
      req('arts', 'Arts', 2, ['arts'], 'One credit may be a Personalized Pathway Requirement.'),
      req('pe', 'Health and Fitness', 2, ['pe', 'health']),
      req('cte', 'Career and Technical Education', 1, ['cte']),
      req('world_language', 'World Language', 2, ['world_language'], 'Both credits may be Personalized Pathway Requirements.'),
      req('elective', 'Electives', 4, ['elective'], 'Districts may waive up to two flexible credits for individual circumstances.'),
    ],
  }),
  template({
    id: 'generic-22',
    name: 'Illustrative 22-credit template (not a state rule)',
    state: '—',
    source: { title: 'evalua illustrative template: a common US pattern, for districts not yet set up' },
    total: 22,
    requirements: [
      req('ela', 'English', 4, ['ela']),
      req('math', 'Mathematics', 3, ['math']),
      req('science', 'Science', 3, ['science']),
      req('social', 'Social Studies', 3, ['social']),
      req('world_language', 'World Language', 2, ['world_language']),
      req('arts', 'Fine Arts', 1, ['arts']),
      req('pe', 'Physical Education and Health', 1.5, ['pe', 'health']),
      req('elective', 'Electives', 4.5, ['elective', 'cte']),
    ],
  }),
];
