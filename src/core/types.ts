// Core data model. Pure types: no DOM, no I/O.

/** One piece of recognised text with its position on a page (page pixel units). */
export interface Token {
  text: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0–1. Text-layer tokens are 1. */
  conf: number;
}

export interface PageInfo {
  width: number;
  height: number;
}

export type DocKind = 'pdf-text' | 'docx' | 'ocr';

export interface DocTokens {
  kind: DocKind;
  pages: PageInfo[];
  tokens: Token[];
  /** Human-readable name of what produced the text ("PDF text layer", "PP-OCRv6 small"…). */
  engine: string;
  warnings: string[];
}

/** Where a value came from on the original document. */
export interface SourceRef {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** An extracted value with provenance. */
export interface Field<T> {
  value: T;
  /** Text exactly as read from the document. */
  original?: string;
  /** 0–1 */
  confidence: number;
  source?: SourceRef;
  /** Set when a person changed the value. */
  edited?: boolean;
}

export type TranslationSource = 'same' | 'system-profile' | 'dictionary' | 'model' | 'none';

export interface ExtractedCourse {
  id: string;
  /** value = English name; original = name as printed. */
  name: Field<string>;
  translation: TranslationSource;
  /** Grade as printed (digits normalised to ASCII). */
  grade: Field<string>;
  /** A second mark on the same row (e.g. a percentage next to a letter grade). */
  score?: Field<string>;
  /** Maximum mark printed for this row, when the document gives one. */
  maxMark?: Field<number>;
  credits?: Field<number>;
  hours?: Field<number>;
  /** Period label as printed ("PRIMER SEMESTRE", "SS 2", "高二上"). */
  period: Field<string>;
  /** US grade-level equivalent (9–12), when it can be determined. */
  level: number | null;
  term?: string;
  academicYear?: string;
  /** Qualifier printed alongside (HL/SL, "GCSE", "Core"). */
  qualifier?: string;
}

export type FlagSeverity = 'info' | 'check' | 'important';

/** "Items to verify". Never an accusation: a prompt for a human to look. */
export interface VerifyFlag {
  id: string;
  severity: FlagSeverity;
  title: string;
  detail: string;
  courseId?: string;
  source?: SourceRef;
  resolved?: boolean;
}

export interface Extraction {
  systemId: Field<string>;
  /** Short description of what the document appears to be. */
  docType: string;
  country: Field<string>;
  language: string;
  student: {
    name: Field<string>;
    dob: Field<string>;
    id: Field<string>;
  };
  school: { name: Field<string> };
  issued?: Field<string>;
  courses: ExtractedCourse[];
  flags: VerifyFlag[];
  /** How the structure was produced. */
  method: 'rules' | 'rules+model';
}

// ───────────── Knowledge base ─────────────

export interface SourceInfo {
  title: string;
  url?: string;
  /** Uploaded document name when there is no URL. */
  document?: string;
}

export interface Provenance {
  source: SourceInfo;
  /** e.g. "2026-27" */
  schoolYear: string;
  /** ISO date the fact was added. */
  addedOn: string;
}

export type USLetter = 'A' | 'B' | 'C' | 'D' | 'F' | 'P' | 'NC';

export interface ScaleEntry {
  /** Labels that map to this entry (letter grades, grade words in any language). */
  labels?: string[];
  /** Inclusive numeric range. */
  min?: number;
  max?: number;
  us: USLetter;
  /** Descriptor shown to the counselor ("Credit", "Very good"). */
  descriptor?: string;
}

export interface GradeScale {
  id: string;
  /** Name of the conversion table shown in reasoning. */
  label: string;
  kind: 'labels' | 'numeric';
  /** For numeric scales: the range of valid values. */
  domain?: [number, number];
  /** Regex (case-insensitive) on section/header text; when present the scale is only used if it matches or the values force it. */
  hint?: string;
  /** Use this scale only if some value exceeds this number (disambiguates e.g. 1–6 grades from 0–15 points). */
  requiresAbove?: number;
  /** Lowest passing value/description, for the counselor. */
  passing?: string;
  entries: ScaleEntry[];
  provenance: Provenance;
  note?: string;
}

export interface LevelRule {
  /** Regex (case-insensitive, unicode) tested against period labels. */
  pattern: string;
  level: number;
  term?: string;
}

export interface SystemCourse {
  /** Names as printed (any of). */
  names: string[];
  en: string;
  concept: string;
}

export interface SystemProfile {
  id: string;
  name: string;
  countries: string[];
  languages: string[];
  summary: string;
  /** Weighted detection keywords (matched on normalised text). */
  detect: { term: string; weight: number }[];
  /** 'dmy' | 'mdy' | 'ymd' */
  dateOrder: 'dmy' | 'mdy' | 'ymd';
  levels: LevelRule[];
  /** Grade level assumed when a document has no period labels (exam certificates). */
  defaultLevel?: number;
  scales: GradeScale[];
  credit: {
    /** Hours of instruction represented by one national credit/unit, if the system has credits. */
    hoursPerCredit?: number;
    /** Years of study an exam-certificate subject normally represents. */
    examCourseYears?: number;
    /** No US credit should be suggested (entrance tests). */
    noCredit?: boolean;
    note: string;
    provenance: Provenance;
  };
  courses: SystemCourse[];
  documentation: SourceInfo[];
  provenance: Provenance;
}

export interface Concept {
  id: string;
  label: string;
  /** Requirement family: ela, math, science, social, world_language, arts, pe, health, cte, elective */
  area: string;
  /** NCES SCED subject area code + name. */
  sced: string;
  /** Multilingual names and keywords. */
  aliases: string[];
}

export interface Requirement {
  id: string;
  label: string;
  credits: number;
  /** Areas that count toward this requirement. */
  areas: string[];
  /** Specific concepts that count (in addition to areas). */
  concepts?: string[];
  note?: string;
}

export interface CatalogCourse {
  code?: string;
  title: string;
  /** Requirement id it counts toward. */
  requirement: string;
  concepts: string[];
  credits: number;
  /** Typical grade levels. */
  levels?: number[];
}

export interface DistrictPolicy {
  id: string;
  title: string;
  text: string;
  source: SourceInfo;
}

export interface DistrictProfile {
  id: string;
  name: string;
  state: string;
  schoolYear: string;
  /** 'template' = state minimums, not a real district's rules. */
  kind: 'template' | 'district';
  /** Credits awarded for one full-year course (1 in Carnegie-unit states, 10 in California-style districts). */
  creditsPerYearCourse: number;
  /** Hours of instruction per Carnegie unit used for hour conversion. */
  hoursPerUnit: number;
  /** Credits a full-time student normally earns in one year (used to flag over-awards). */
  typicalCreditsPerYear: number;
  totalCredits: number;
  requirements: Requirement[];
  catalog: CatalogCourse[];
  /** Where a concept lands when local policy differs from its natural area: concept id → requirement id. */
  conceptOverrides: Record<string, string>;
  policies: DistrictPolicy[];
  provenance: Provenance;
}

export interface KnowledgeBase {
  schoolYear: string;
  concepts: Concept[];
  systems: SystemProfile[];
  districts: DistrictProfile[];
}

// ───────────── Evaluation (suggestions) ─────────────

export interface Reason {
  /** Short statement shown to the counselor. */
  text: string;
  source?: SourceInfo;
}

export interface GradeConversion {
  letter: USLetter | null;
  gpa: number | null;
  /** US percentage equivalent (midpoint of the letter band). */
  percent: number | null;
  /** Conversion table used. */
  table: string;
  descriptor?: string;
  confidence: number;
  reasons: Reason[];
}

export interface Suggestion {
  courseId: string;
  conceptId: string;
  conceptLabel: string;
  /** Requirement id in the district profile ("elective" when none). */
  requirementId: string;
  requirementLabel: string;
  /** Closest district catalog course, if any. */
  catalogTitle: string | null;
  credits: number;
  grade: GradeConversion;
  /** Overall 0–1. */
  confidence: number;
  reasons: Reason[];
  /** True when a human should look before accepting. */
  needsReview: boolean;
}

export interface RequirementProgress {
  requirementId: string;
  label: string;
  required: number;
  earned: number;
  remaining: number;
  courseIds: string[];
}

export interface Evaluation {
  districtId: string;
  schoolYear: string;
  suggestions: Suggestion[];
  progress: RequirementProgress[];
  totalEarned: number;
  totalRequired: number;
  flags: VerifyFlag[];
}
