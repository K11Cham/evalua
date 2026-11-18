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
  /** Row slope (dy/dx) measured from the page image, for scans and photos. */
  skew?: number;
}

export type DocKind = 'pdf-text' | 'docx' | 'ocr';

export interface DocTokens {
  kind: DocKind;
  pages: PageInfo[];
  tokens: Token[];
  /** Human-readable name of what produced the text ("PDF text layer", "PP-OCRv6 small"…). */
  engine: string;
  warnings: string[];
  /** When the record is made of several files: the first page of each, so one report's header never leaks into the next. */
  parts?: { name: string; firstPage: number }[];
  /** Text found under a black box (a redaction that did not remove it): where, never what. The text itself is not kept. */
  hiddenText?: { pages: number[]; count: number };
  /** Black redaction bars found on scanned pages and painted out before reading. */
  redactionBars?: number;
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
  /** What evalua had read, kept from the first time a person changed the value (for feedback on reading). */
  read?: { value: string; confidence: number };
  /** The document has the field but its value was blacked out or replaced ("XXXX", "[REDACTED]"). */
  redacted?: boolean;
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
  /** The counselor set the grade level by hand, so reading the file again keeps it. */
  levelByHand?: boolean;
  term?: string;
  academicYear?: string;
  /** Qualifier printed alongside (HL/SL, "GCSE", "Core"). */
  qualifier?: string;
  /** The grade printed is for the whole year (an annual or cumulative column), even on a term report. */
  wholeYear?: boolean;
  /** The grade as also written out in words ("8 OCHO", "5 (отлично)"), and whether the two agree. */
  gradeWords?: { text: string; value: number; agrees: boolean; source?: SourceRef };
  /** What the document calls the part of the year `term` counts in, when it says ("semester", "quarter"). */
  termUnit?: 'term' | 'semester' | 'trimester' | 'quarter';
}

export type FlagSeverity = 'info' | 'check' | 'important';

/** "Items to verify". Never an accusation: a prompt for a human to look. */
export interface VerifyFlag {
  id: string;
  severity: FlagSeverity;
  title: string;
  detail: string;
  courseId?: string;
  /** For one item that stands for several courses ("5 grades may be misread"). */
  courseIds?: string[];
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
  /** Evidence about the language of instruction printed on the record. */
  stated?: {
    instruction?: { languages: string[]; text: string; source?: SourceRef };
    translation?: { text: string; source?: SourceRef };
  };
  /** An aggregate printed on an examination certificate ("Aggregate 06"). */
  aggregate?: Field<number>;
  courses: ExtractedCourse[];
  flags: VerifyFlag[];
  /** How the structure was produced. */
  method: 'rules' | 'rules+model';
  /** Version of the reading rules that produced this (see READER_VERSION). Missing on cases read before versions were kept. */
  reader?: number;
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

/** The language of instruction of a system's secondary schools, as published. */
export interface InstructionLanguage {
  /** BCP-47 codes ("en", "es"). Empty when it is not known. */
  languages: string[];
  /** Whether a student's own school may teach in another language. */
  varies: 'no' | 'by-school' | 'by-subject' | 'by-region' | 'unknown';
  /** One or two plain sentences, for the counselor. */
  note: string;
  provenance: Provenance;
  /** Further sources for multi-country profiles. */
  more?: SourceInfo[];
}

/** What a case's evidence says about the language the student was taught in. */
export interface InstructionAssessment {
  languages: string[];
  /** true / false when known; null when the evidence does not say. */
  english: boolean | null;
  /** Strongest evidence found: a statement printed on the record, the system profile, or only the document's language. */
  strength: 'printed' | 'system' | 'system-varies' | 'document' | 'unknown';
  /** The record says it is a translation, so its language says nothing about instruction. */
  translated: boolean;
  /** One sentence for the counselor ("Taught in English: …"). */
  summary: string;
  /** Why, evidence by evidence. */
  evidence: { text: string; source?: SourceInfo; ref?: SourceRef }[];
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

export interface Calendar {
  /** What one part of the year is called on documents. */
  unit: 'term' | 'semester';
  /** How many parts make a school year (3 terms, 2 semesters). */
  perYear: number;
  note: string;
  provenance: Provenance;
}

/** A topic in the shared vocabulary that links foreign syllabuses to US courses. */
export interface Topic {
  id: string;
  label: string;
}

/** A US course with the topics it is defined by, on a ladder (Algebra I → Geometry → …). */
export interface UsCourse {
  id: string;
  title: string;
  /** The concept this course stands for in district catalogs. */
  concept: string;
  ladder: string;
  rung: number;
  /** US grade level at which an on-track student usually takes it. */
  usualLevel: number;
  topics: Topic[];
  source: SourceInfo;
}

/** What a foreign system teaches in each year of one subject. */
export interface Sequence {
  /** Concept of the foreign course (e.g. math.general for "Mathematics"). */
  concept: string;
  ladder: string;
  /** Topic ids completed before the first year this sequence lists (lower secondary). */
  before: string[];
  /** Topic ids taught in each US-equivalent grade level. */
  byLevel: Record<string, string[]>;
  source: SourceInfo;
  /** 0–1: how firmly the sources support the year-by-year split. */
  confidence: number;
  /**
   * 'spiral': every year revisits every strand (like the US integrated pathway), so year n of the sequence
   * stands for the n-th US course after what lower secondary completed.
   * 'targeted': the course is aimed at specific US courses; each year goes where its topics add most,
   * never below `minRung`.
   */
  kind: 'spiral' | 'targeted';
  minRung?: number;
  note?: string;
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
    /** A one-year certificate with more subjects than a US year: share its credit out to a normal year. */
    fitToYear?: boolean;
    /** How the certificate's aggregate is computed, so the printed one can be checked. */
    aggregate?: { core: string[]; best: number; bestPossible: number; label: string };
    /** No US credit should be suggested (entrance tests). */
    noCredit?: boolean;
    note: string;
    provenance: Provenance;
  };
  courses: SystemCourse[];
  /** The language(s) the system's secondary schools teach in, with its source. Required: "unknown" is an answer. */
  instruction: InstructionLanguage;
  /** How the school year is divided. A report for one part covers that fraction of the year. */
  calendar?: Calendar;
  /** What each year of a subject covers, in the shared topic vocabulary (src/kb/usCourses.ts). */
  sequences?: Sequence[];
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
  /** Named courses this requirement must include (JCPS: Algebra I, Geometry, Algebra II). */
  includes?: { label: string; concepts: string[]; note?: string }[];
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
  /** Words in a foreign course name that point to this catalog course among others of the same subject. */
  keywords?: string[];
}

export interface DistrictPolicy {
  id: string;
  title: string;
  text: string;
  source: SourceInfo;
  /** Further sources, when a rule comes from both the state and the district. */
  more?: SourceInfo[];
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
  /** Smallest part of a full-year course the district awards, as a fraction of it (0.5 = one semester). */
  creditStep?: number;
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
  /** The US course this row's work counts toward (after sequencing), when one is identified. */
  usCourse?: { id: string; title: string };
  /** Fraction of a school year this row documents (1 = full year, 1/3 = one of three terms). */
  share: number;
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
  /** Named courses within the requirement, and whether this record meets each. */
  includes?: { label: string; met: boolean; partial?: boolean; note?: string; expected?: string }[];
}

export interface Evaluation {
  districtId: string;
  schoolYear: string;
  suggestions: Suggestion[];
  progress: RequirementProgress[];
  totalEarned: number;
  totalRequired: number;
  flags: VerifyFlag[];
  /** Where the student stands on each US course sequence, and what to take next. */
  placements: Placement[];
  /** The language the student was taught in, and how strong the evidence is. */
  instruction: InstructionAssessment;
}

export interface LadderStep {
  id: string;
  title: string;
  /** Fraction of this course's topics expected to be covered by now, 0–1. */
  coverage: number;
  covered: string[];
  missing: string[];
}

export interface Placement {
  ladder: string;
  label: string;
  /** Point in time this placement describes ("Grade 11, second term"). */
  asOf: string;
  steps: LadderStep[];
  completed: string[];
  /** Course in progress (partly covered) or the next one to take. */
  continueIn: { title: string; catalogTitle: string | null; coverage: number } | null;
  confidence: number;
  reasons: Reason[];
}
