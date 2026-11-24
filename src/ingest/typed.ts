// Text a person typed or pasted (or a .txt / .csv file) → a document the ordinary reader can read. A typed table goes
// through exactly the same reading as a scan or a PDF: the grade level, school year and term come from its header
// lines, grades from its grade column, subjects from the same matching. Nothing about it is special-cased later.
//
// Accepted, one course per line, mixed freely:
//   Mathematics: 85          Mathematics<TAB>85<TAB>1        "Mathematics, Algebra",85
//   Mathematics - B+         Mathematics — 7/10              Mathematics   85
// and header lines such as "Class: Grade 10", "School year: 2024-2025", "Term: First term", "Student: …", "School: …".
import type { DocTokens } from '../core/types.ts';
import { docxHtmlToDoc } from './docx.ts';

export interface TypedTable {
  /** Header lines, as label and value ("Class", "SS 2"). */
  fields: { label: string; value: string }[];
  /** Lines with no grade: a heading such as "FIRST TERM". */
  headings: string[];
  /** Subject, grade, and an optional third value (credits or hours). */
  rows: [string, string, string][];
  /** The column names, when the text had a header row ("Subject,Mark,Credits"). */
  columns?: [string, string, string];
}

// Header labels, in the languages evalua reads, so "Mathematics: 85" is never taken for one.
const FIELD = /^(student|student name|name|nom|nombre|nome|élève|alumno|aluno|school|école|escuela|escola|établissement|colegio|class|classe|clase|grade level|level|form|year|school year|academic year|année|année scolaire|año|año escolar|ano|ano letivo|session|term|trimestre|semester|semestre|período|periodo|country|pays|país|student id|id|matricule|date of birth|dob|born)$/i;
// A grade: a number (85, 7,5, 15/20, 3.7), a letter grade (A, B+, A1, C6), or a short word grade (Pass, Distinction).
const GRADE = /^(?:\d{1,3}(?:[.,]\d{1,2})?(?:\s*\/\s*\d{1,3})?\s*%?|[A-F][+-]?|[A-F][1-9]|[1-9]|pass|fail|merit|distinction|credit|excellent|good|satisfactory|[\p{L}]{2,14})$/iu;
const NUMERIC_GRADE = /^\d{1,3}(?:[.,]\d{1,2})?(?:\s*\/\s*\d{1,3})?\s*%?$|^[A-F][+-]?$|^[A-F][1-9]$/i;
const HEADER_WORDS = /^(subject|subjects|course|courses|matière|matières|asignatura|materia|disciplina|mark|marks|grade|grades|note|notes|nota|notas|calificación|score|result|credits?|hours?|créditos|horas|coefficient|coef)$/i;

function splitCsv(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === sep && !quoted) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** One line split into cells, by the strongest separator it uses. */
function cells(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
  if (/;/.test(line) && !/,\d/.test(line.replace(/"[^"]*"/g, ''))) return splitCsv(line, ';');
  // A comma separates cells unless it is a decimal comma ("7,5").
  if (/,(?!\d)|"/.test(line)) {
    const c = splitCsv(line, ',');
    if (c.length > 1) return c;
  }
  const colon = /^(.+?)\s*:\s*(.+)$/.exec(line);
  // A subject can hold a colon itself ("Segunda Lengua: Inglés III: 7.2"): the grade follows the last one.
  const lastColon = /^(.+)\s*:\s*(\S+)$/.exec(line);
  if (colon && lastColon && lastColon[1].includes(':') && !GRADE.test(colon[2].split(/\s{2,}|\s+[|·]\s+/)[0]) && NUMERIC_GRADE.test(lastColon[2])) return [lastColon[1].trim(), lastColon[2]];
  if (colon) return [colon[1], ...colon[2].split(/\s{2,}|\s+[|·]\s+/)];
  const dash = /^(.+?)\s+[-–—=|]\s+(.+)$/.exec(line);
  if (dash) return [dash[1], ...dash[2].split(/\s{2,}/)];
  const wide = line.split(/\s{2,}/);
  if (wide.length > 1) return wide;
  // "Mathematics 85": the last word, when it looks like a number or a letter grade.
  const last = /^(.+?)\s+(\S+)$/.exec(line);
  if (last && NUMERIC_GRADE.test(last[2])) return [last[1], last[2]];
  return [line];
}

export function parseTypedTable(text: string): TypedTable {
  const out: TypedTable = { fields: [], headings: [], rows: [] };
  const lines = text.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const c = cells(line).filter((x, i) => i < 2 || x);
    if (c.length >= 2 && FIELD.test(c[0].replace(/\s+/g, ' '))) {
      out.fields.push({ label: c[0], value: c.slice(1).join(' ').trim() });
      continue;
    }
    if (c.length >= 2 && HEADER_WORDS.test(c[0]) && c.slice(1).every((x) => !x || HEADER_WORDS.test(x) || !NUMERIC_GRADE.test(x))) {
      if (!out.rows.length) out.columns = [c[0], c[1], c[2] ?? ''];
      continue;
    }
    if (c.length >= 2 && c[0] && GRADE.test(c[1])) {
      out.rows.push([c[0], c[1], c[2] ?? '']);
      continue;
    }
    out.headings.push(line);
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The table as the simple HTML the Word reader lays out. Headings and fields keep their place above the table. */
export function typedTableToHtml(t: TypedTable): string {
  const extra = t.rows.some((r) => r[2]);
  const cols = t.columns ?? ['Subject', 'Grade', extra ? 'Credits' : ''];
  let html = '';
  for (const f of t.fields) html += `<p>${esc(f.label)}: ${esc(f.value)}</p>`;
  for (const h of t.headings) html += `<p>${esc(h)}</p>`;
  html += `<table><tr><th>${esc(cols[0] || 'Subject')}</th><th>${esc(cols[1] || 'Grade')}</th>${extra ? `<th>${esc(cols[2] || 'Credits')}</th>` : ''}</tr>`;
  for (const r of t.rows) html += `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td>${extra ? `<td>${esc(r[2])}</td>` : ''}</tr>`;
  return `${html}</table>`;
}

/** Typed or pasted text, or a .txt / .csv file's contents, as a document. */
export function typedTextToDoc(text: string, engine = 'Typed by hand'): DocTokens {
  const t = parseTypedTable(text);
  if (!t.rows.length) throw new Error('No subject and grade pairs were found. Put one subject and its grade on each line, for example “Mathematics: 85”.');
  return { ...docxHtmlToDoc(typedTableToHtml(t)), engine };
}

/** The text a typed-table form produces: header lines, then one "subject<TAB>grade<TAB>credits" line per course. */
export function typedTableText(fields: { label: string; value: string }[], rows: [string, string, string][], heading = ''): string {
  const lines = fields.filter((f) => f.value.trim()).map((f) => `${f.label}: ${f.value.trim()}`);
  if (heading.trim()) lines.push(heading.trim());
  const used = rows.filter((r) => r[0].trim() && r[1].trim());
  const extra = used.some((r) => r[2].trim());
  lines.push(extra ? 'Subject\tGrade\tCredits' : 'Subject\tGrade');
  for (const r of used) lines.push([r[0].trim(), r[1].trim(), ...(extra ? [r[2].trim()] : [])].join('\t'));
  return lines.join('\n') + '\n';
}
