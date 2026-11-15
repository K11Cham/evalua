// "Items to verify": things a person should look at. These never say a document is fake —
// they only point at what could not be read or does not line up.
import type { TableResult } from './tables.ts';
import { rowText } from './layout.ts';
import { periodKey, periodLabel } from './periods.ts';
import { asciiDigits, parseNumber } from './text.ts';
import type { DocTokens, Extraction, VerifyFlag } from './types.ts';

// "Total: 335", "المجموع الكلي: 335 من 410", "कुल योग 499", "总分 612", "ИТОГО 58"
const TOTAL_RE = /(?:grand total|total marks|total general|total de puntos|total|المجموع الكلي|المجموع|कुल योग|कुल|योग|总分|合计|합계|tổng điểm|tổng cộng|итого|всего|toplam)\s*(?:marks|score|obtained|点|分)?\s*[:：=-]?\s*(\d{1,4}(?:[.,]\d{1,2})?)(?![\d.,]*\s*%)/iu;

const srcOf = (c?: { page: number; x: number; y: number; w: number; h: number }) => (c ? { page: c.page, x: c.x, y: c.y, w: c.w, h: c.h } : undefined);

export function verify(ex: Extraction, doc: DocTokens, tables: TableResult): VerifyFlag[] {
  const flags: VerifyFlag[] = [...ex.flags];
  const add = (f: VerifyFlag) => {
    if (!flags.some((x) => x.id === f.id)) flags.push(f);
  };

  if (!ex.courses.length) {
    add({ id: 'no-courses', severity: 'important', title: 'No courses could be read', detail: 'No table of subjects and grades was recognised. Try a clearer scan or photo, choose the document language, or enter the courses by hand.' });
  }
  if (ex.systemId.value === 'generic') {
    add({ id: 'system-unknown', severity: 'check', title: 'Education system not recognised', detail: 'This document did not match a profiled system, so generic rules were used. Choose the system if you know it; grade conversion is less reliable until then.' });
  } else if (ex.systemId.confidence < 0.75) {
    add({ id: 'system-unsure', severity: 'check', title: 'Education system is a best guess', detail: `The document looks like “${ex.docType}”, but only a few identifying terms were found. Confirm the system.` });
  }
  if (!ex.student.name.value) add({ id: 'no-name', severity: 'check', title: 'Student name not found', detail: 'No name label was recognised. Enter the name from the document.' });
  if (!ex.student.dob.value) {
    add({ id: 'no-dob', severity: 'info', title: 'Date of birth not found', detail: ex.student.dob.original ? `“${ex.student.dob.original}” could not be read as a date.` : 'No date of birth label was recognised.', source: ex.student.dob.source });
  }

  // "Page 2 of 3" with fewer pages supplied.
  const pageRef = /(?:page|página|pagina|seite|trang|стр\.?|صفحة)\s*(\d+)\s*(?:of|de|von|\/|из|من)\s*(\d+)/i.exec(asciiDigits(tables.rows.map(rowText).join(' ')));
  if (pageRef && +pageRef[2] > doc.pages.length) {
    add({ id: 'pages-missing', severity: 'important', title: 'Some pages may be missing', detail: `The document refers to ${pageRef[2]} pages but ${doc.pages.length} ${doc.pages.length === 1 ? 'was' : 'were'} provided.` });
  }
  // A printed total that the marks read do not add up to: a strong sign that a digit was misread.
  // Each total is checked against the courses printed above it on the same page, back to the
  // previous total, so a record made of several reports checks each report on its own.
  const totals = tables.rows
    .map((r) => ({ r, m: TOTAL_RE.exec(asciiDigits(rowText(r))) }))
    .filter((t): t is { r: (typeof tables.rows)[number]; m: RegExpExecArray } => !!t.m && !!t.r.cells.length)
    .sort((a, b) => a.r.cells[0].page - b.r.cells[0].page || a.r.cells[0].y - b.r.cells[0].y);
  totals.forEach(({ r, m }, i) => {
    const page = r.cells[0].page;
    const y = r.cells[0].y;
    const prev = totals[i - 1];
    const from = prev && prev.r.cells[0].page === page ? prev.r.cells[0].y : -Infinity;
    const above = ex.courses.filter((c) => c.name.source && c.name.source.page === page && c.name.source.y > from && c.name.source.y < y);
    // Only one period, so the total is not one column of a several-year table.
    if (above.length < 3 || new Set(above.map(periodKey)).size > 1) return;
    const marks = above.map((c) => parseNumber(c.grade.value)).filter((v): v is number => v != null);
    if (marks.length < above.length) return;
    const sum = Math.round(marks.reduce((a, v) => a + v, 0) * 100) / 100;
    const printed = Number(m[1].replace(',', '.'));
    if (!Number.isFinite(printed) || printed < sum * 0.4 || printed > sum * 2.5) return;
    if (Math.abs(printed - sum) > 0.011) {
      add({
        id: `total-mismatch-${page}-${Math.round(y)}`,
        severity: 'important',
        title: 'The marks read do not add up to the printed total',
        detail: `${periodLabel(above[0]) ? `The total printed for “${periodLabel(above[0])}”` : 'The printed total'} is ${printed}, but the marks read add up to ${sum}. One or more marks may have been misread, or a subject is missing. Compare each mark with the original.`,
        source: srcOf(r.cells[0]),
      });
    }
  });
  // Structural notes from table reading.
  tables.notes.forEach((n, i) => {
    add({
      id: `table-${n.kind}-${i}`,
      severity: n.kind === 'grade-without-name' ? 'important' : 'check',
      title: n.kind === 'grade-without-name' ? 'A grade without a readable course name' : n.kind === 'no-final-column' ? 'No final-grade column recognised' : 'Column headings not recognised',
      detail: n.detail,
      source: srcOf(n.cell),
    });
  });
  for (const w of doc.warnings) add({ id: `ingest-${flags.length}`, severity: 'check', title: 'Reading the file', detail: w });
  return flags;
}

// Ids of the checks below. They are worked out again on every view, so a case read by an
// earlier version, or a course the counselor has since edited, never shows a stale one.
export const LIVE_FLAG = /^(grade-missing-|grade-lowconf-|name-lowconf-|untranslated$|gap-|level-unknown$|year-order-|age-|dup-)/;

/** Checks on the courses and student as they stand now, edits included. Run with each evaluation. */
export function courseFlags(ex: Extraction): VerifyFlag[] {
  const flags: VerifyFlag[] = [];
  const add = (f: VerifyFlag) => {
    if (!flags.some((x) => x.id === f.id)) flags.push(f);
  };
  // Unreadable or low-confidence fields.
  for (const c of ex.courses) {
    if (!c.grade.value) {
      add({ id: `grade-missing-${c.id}`, severity: 'important', courseId: c.id, title: `Grade not readable: ${c.name.original}`, detail: 'A subject was read on this row but no grade. Check the original document.', source: c.name.source });
    } else if (c.grade.confidence < 0.72) {
      add({ id: `grade-lowconf-${c.id}`, severity: 'check', courseId: c.id, title: `Grade may be misread: ${c.name.original}`, detail: `The grade was read as “${c.grade.value}” with low confidence (${Math.round(c.grade.confidence * 100)}%). Compare with the original.`, source: c.grade.source });
    }
    if (c.name.confidence < 0.72) {
      add({ id: `name-lowconf-${c.id}`, severity: 'check', courseId: c.id, title: `Course name may be misread: ${c.name.original}`, detail: `Read with low confidence (${Math.round(c.name.confidence * 100)}%). Compare with the original.`, source: c.name.source });
    }
  }
  const untranslated = ex.courses.filter((c) => c.translation === 'none');
  if (untranslated.length) {
    add({ id: 'untranslated', severity: 'check', title: `${untranslated.length} course name${untranslated.length > 1 ? 's' : ''} without an English translation`, detail: `No dictionary entry was found for: ${untranslated.slice(0, 6).map((c) => c.name.original).join('; ')}${untranslated.length > 6 ? '…' : ''}. Add a translation, or connect a local model.` });
  }

  // Years: gaps and ordering.
  const levels = [...new Set(ex.courses.map((c) => c.level).filter((l): l is number => l != null))].sort((a, b) => a - b);
  for (let i = 0; i + 1 < levels.length; i++) {
    for (let missing = levels[i] + 1; missing < levels[i + 1]; missing++) {
      add({ id: `gap-${missing}`, severity: 'important', title: `No courses found for grade ${missing}`, detail: `Courses were read for grade ${levels[i]} and grade ${levels[i + 1]} but none in between. A page or a year of the record may be missing.` });
    }
  }
  if (ex.courses.length && ex.courses.some((c) => c.level == null)) {
    const n = ex.courses.filter((c) => c.level == null).length;
    add({ id: 'level-unknown', severity: 'check', title: 'Grade level not determined', detail: `${n} course${n > 1 ? 's have' : ' has'} no US grade-level equivalent because the year label was not recognised. Set the grade level so the courses count in the right year.` });
  }
  const byLevel = new Map<number, string[]>();
  for (const c of ex.courses) if (c.level != null && c.academicYear) byLevel.set(c.level, [...(byLevel.get(c.level) ?? []), c.academicYear]);
  const firstYear = (l: number) => Math.min(...byLevel.get(l)!.map((y) => +y.slice(0, 4)));
  const lv = [...byLevel.keys()].sort((a, b) => a - b);
  for (let i = 0; i + 1 < lv.length; i++) {
    if (firstYear(lv[i]) > firstYear(lv[i + 1])) {
      add({ id: `year-order-${lv[i]}`, severity: 'check', title: 'School years are out of order', detail: `Grade ${lv[i]} is dated ${firstYear(lv[i])} but grade ${lv[i + 1]} is dated ${firstYear(lv[i + 1])}. Check the years against the original.` });
    }
  }
  // Age vs. grade level.
  if (ex.student.dob.value && lv.length) {
    const born = +ex.student.dob.value.slice(0, 4);
    for (const l of lv) {
      const age = firstYear(l) + 1 - born;
      const expected = l + 6;
      if (Math.abs(age - expected) > 3) {
        add({ id: `age-${l}`, severity: 'check', title: 'Age and grade level do not line up', detail: `The student would have been about ${age} in grade ${l} (${firstYear(l)}). Check the date of birth and the school years.`, source: ex.student.dob.source });
        break;
      }
    }
  }
  // Duplicates within one period of one report ("First term" of grade 10 and of grade 11 are different periods).
  const seen = new Map<string, string>();
  for (const c of ex.courses) {
    const k = `${periodKey(c)}|${(c.name.original ?? '').toLowerCase()}`;
    const where = [periodLabel(c), c.level != null ? `grade ${c.level}` : ''].filter(Boolean).join(', ');
    if (seen.has(k)) add({ id: `dup-${c.id}`, severity: 'check', courseId: c.id, title: `Listed twice: ${c.name.original}`, detail: `The same course appears twice in “${where || 'the document'}”. One may be a retake, or a row may have been read twice.`, source: c.name.source });
    seen.set(k, c.id);
  }
  return flags;
}

/** Everything to show for a case: what was found when the file was read, and the live checks. */
export function caseFlags(ex: Extraction, evaluationFlags: VerifyFlag[] = []): VerifyFlag[] {
  return [...ex.flags.filter((f) => !LIVE_FLAG.test(f.id)), ...evaluationFlags];
}
