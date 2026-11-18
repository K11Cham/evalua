// "Export corrections for feedback": what a counselor corrected, beside what evalua had read, so reading can be
// improved from real use without the record itself ever leaving the school.
//
// Built from an allow-list, never by removing things from the case: only course-level facts (subjects, grades,
// credits, grade levels) and facts about the document (file type, system, reader version) are written. The student's
// name, ID and date of birth, the school's name, addresses, signatures, file names, notes, the change log and the
// document's pages are never read here. A student field that was corrected is reported as "corrected", without either
// value.
import { evaluate } from '../core/evaluate.ts';
import { READER_VERSION } from '../core/pipeline.ts';
import type { DistrictProfile, ExtractedCourse, KnowledgeBase } from '../core/types.ts';
import type { CaseRecord } from '../store/db.ts';

export const FEEDBACK_FORMAT = 'evalua-feedback/1';

export interface FeedbackRow {
  /** "student name", "course name", "grade", "US subject", … */
  field: string;
  /** Which course, by its position on the record (never its id or the student). */
  course?: number;
  /** The subject as printed, so a reading problem can be found again ("Matemáticas I"). Course names are not personal. */
  printedSubject?: string;
  evaluaValue: string;
  correctedValue: string;
  /** evalua's confidence in what it read or suggested, 0–1, when known. */
  confidence?: number;
}

export interface FeedbackExport {
  format: typeof FEEDBACK_FORMAT;
  /** Day only. */
  exported: string;
  readerVersion: number;
  /** The reader version the case was read with (an older case may have been read before the current rules). */
  caseReaderVersion: number;
  educationSystem: string;
  country: string;
  documentLanguage: string;
  fileTypes: string[];
  engine: string;
  district: string;
  courses: number;
  corrections: FeedbackRow[];
  /** Suggestions accepted as they were: a sign they were right. */
  acceptedUnchanged: number;
}

const EXCLUDED = '(excluded: personal data)';
const fileType = (name: string, type: string) => (/\.([a-z0-9]{2,5})$/i.exec(name)?.[1] ?? type.split('/').pop() ?? 'unknown').toLowerCase();

export function buildFeedback(rec: CaseRecord, kb: KnowledgeBase, district: DistrictProfile, files: { name: string; type: string }[], today = new Date()): FeedbackExport {
  const ex = rec.extraction;
  const rows: FeedbackRow[] = [];
  const out: FeedbackExport = {
    format: FEEDBACK_FORMAT,
    exported: today.toISOString().slice(0, 10),
    readerVersion: READER_VERSION,
    caseReaderVersion: ex?.reader ?? 1,
    educationSystem: ex?.systemId.value ?? '',
    country: ex?.country.value ?? '',
    documentLanguage: ex?.language ?? '',
    // The type only: a file name can contain the student's name.
    fileTypes: [...new Set(files.map((f) => fileType(f.name, f.type)))],
    engine: rec.engine,
    district: district.id,
    courses: ex?.courses.length ?? 0,
    corrections: rows,
    acceptedUnchanged: 0,
  };
  if (!ex) return out;

  // Student fields: whether they were corrected, never their values.
  const personal: [string, { edited?: boolean; read?: { confidence: number }; confidence: number }][] = [
    ['student name', ex.student.name], ['date of birth', ex.student.dob], ['student ID', ex.student.id], ['school name', ex.school.name],
  ];
  for (const [field, f] of personal) if (f.edited) rows.push({ field, evaluaValue: EXCLUDED, correctedValue: EXCLUDED, confidence: f.read?.confidence });
  if (ex.country.edited) rows.push({ field: 'country', evaluaValue: ex.country.read?.value ?? '', correctedValue: ex.country.value, confidence: ex.country.read?.confidence });

  // Reading: course names and grades a person corrected, and courses added by hand.
  const pos = new Map(ex.courses.map((c, i) => [c.id, i + 1]));
  const printed = (c: ExtractedCourse) => (c.name.read?.value ?? c.name.original ?? '').slice(0, 120);
  for (const c of ex.courses) {
    if (c.id.startsWith('m-')) {
      rows.push({ field: 'course added by hand (missed by the reader)', course: pos.get(c.id), printedSubject: c.name.value.slice(0, 120), evaluaValue: '', correctedValue: `${c.name.value} = ${c.grade.value}` });
      continue;
    }
    if (c.name.edited && c.name.read) rows.push({ field: 'course name', course: pos.get(c.id), printedSubject: printed(c), evaluaValue: c.name.read.value, correctedValue: c.name.value, confidence: c.name.read.confidence });
    if (c.grade.edited && c.grade.read) rows.push({ field: 'grade', course: pos.get(c.id), printedSubject: printed(c), evaluaValue: c.grade.read.value, correctedValue: c.grade.value, confidence: c.grade.read.confidence });
    if (c.levelByHand) rows.push({ field: 'US grade level', course: pos.get(c.id), printedSubject: printed(c), evaluaValue: '', correctedValue: c.level == null ? 'not set' : String(c.level) });
  }

  // Suggestions: evalua's own, without the counselor's changes, against what the counselor chose.
  const mine = evaluate(ex, kb, district, {}, rec.assume);
  let accepted = 0;
  for (const c of ex.courses) {
    const ov = rec.overrides[c.id];
    if (!ov) continue;
    const s = mine.suggestions.find((x) => x.courseId === c.id);
    const base = { course: pos.get(c.id), printedSubject: printed(c), confidence: s?.confidence };
    if (ov.exclude) rows.push({ field: 'course left out', ...base, evaluaValue: 'included', correctedValue: 'left out' });
    if (ov.conceptId && ov.conceptId !== s?.conceptId) rows.push({ field: 'US subject', ...base, evaluaValue: s?.conceptId ?? '', correctedValue: ov.conceptId });
    if (ov.requirementId && ov.requirementId !== s?.requirementId) rows.push({ field: 'counts toward', ...base, evaluaValue: s?.requirementId ?? '', correctedValue: ov.requirementId });
    if (ov.credits != null && ov.credits !== s?.credits) rows.push({ field: 'credits', ...base, evaluaValue: String(s?.credits ?? ''), correctedValue: String(ov.credits) });
    if (ov.letter && ov.letter !== s?.grade.letter) rows.push({ field: 'US letter grade', ...base, evaluaValue: s?.grade.letter ?? '', correctedValue: ov.letter });
    if (ov.accepted && !ov.conceptId && !ov.requirementId && ov.credits == null && !ov.letter && !ov.exclude) accepted++;
  }
  out.acceptedUnchanged = accepted;
  return out;
}

/** The exact text that is saved. */
export const feedbackText = (f: FeedbackExport) => JSON.stringify(f, null, 2) + '\n';
