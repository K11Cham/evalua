// Types for the fake transcript generator.
// Every document produced here is FICTITIOUS: invented students, invented
// schools, and a visible SPECIMEN mark. Never add real records to this folder.

export type Format = 'pdf' | 'scan-jpg' | 'scan-png' | 'scan-pdf' | 'photo-jpg' | 'docx';

export interface FakeCourse {
  /** Course name exactly as printed. */
  n: string;
  /** English translation (truth). */
  en: string;
  /** Final grade as printed. */
  g: string;
  /** Credits / units as printed. */
  cr?: number;
  /** Hours as printed (total hours for the period unless noted in the spec). */
  h?: number;
  /** Expected canonical concept id. */
  k: string;
  /** Expected US letter grade (A/B/C/D/F/P) under the documented conversion table. */
  us: string;
  /** Extra printed cells (grade in words, level, comments, sub-marks…). */
  x?: Record<string, string>;
}

export interface FakeYear {
  /** Heading as printed, e.g. "PRIMER SEMESTRE" or "高一上". */
  label: string;
  /** Short label used in matrix column headers (defaults to label). */
  short?: string;
  /** US grade-level equivalent (9–12). */
  level: number;
  term?: string;
  academicYear?: string;
  /** Starts a new page before this section (multi-page documents). */
  pageBreak?: boolean;
  courses: FakeCourse[];
}

export interface Col {
  /** Header text as printed. */
  h: string;
  /** Field: n, g, cr, h, or x.<key>. */
  f: string;
  /** Alignment hint for rendering. */
  align?: 'l' | 'c' | 'r';
}

export interface FakeSpec {
  id: string;
  /** Expected knowledge-base system id ("generic" for unprofiled systems). */
  system: string;
  country: string;
  /** BCP-47 language of the document body. */
  lang: string;
  rtl?: boolean;
  formats: Format[];
  /** Visual family. */
  layout: 'stacked' | 'matrix' | 'slip';
  /** Two table columns side by side (stacked layout only). */
  twoUp?: boolean;
  style?: 'serif' | 'sans' | 'typewriter';
  /** Lines printed at the top (issuer, ministry, board…). */
  issuer: string[];
  title: string;
  subtitle?: string;
  /** Header info block. `role` marks truth fields. */
  info: { label: string; value: string; role?: 'name' | 'dob' | 'id' | 'school' | 'city' | 'issued' }[];
  student: { name: string; dob: string; id?: string };
  school: { name: string; city?: string };
  cols: Col[];
  /** Matrix layout: header of the first (subject) column. */
  rowHeader?: string;
  years: FakeYear[];
  /** Printed below the tables (grading key, remarks). */
  notes?: string[];
  /** Signature captions. */
  signatures?: string[];
  specimen: string;
  /** Colour for the title (report cards often print the term in red). */
  titleColor?: string;
}

export interface TruthCourse {
  name: string;
  en: string;
  grade: string;
  credits?: number;
  hours?: number;
  year: string;
  level: number;
  term?: string;
  concept: string;
  us: string;
}

export interface Truth {
  id: string;
  file: string;
  format: Format;
  system: string;
  country: string;
  lang: string;
  pages: number;
  student: { name: string; dob: string; id?: string };
  school: { name: string; city?: string };
  courses: TruthCourse[];
}
