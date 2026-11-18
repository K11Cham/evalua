// Table understanding: finds header bands, builds columns (including two-level "matrix" headers and
// side-by-side tables), assigns body cells to columns and turns rows into raw course records.
import { buildRows, rowText, type Cell, type Row } from './layout.ts';
import { gradeFromWords, headerRole, isGradeLike, isPeriodLabel, isSummaryLabel, labelWithoutColon, splitGrade, STUDENT_CLASS, type Role } from './lexicon.ts';
import { key } from './text.ts';
import type { DocTokens } from './types.ts';

export type ColRole = Role | 'period' | null;

export interface HCol {
  x0: number;
  x1: number;
  text: string;
  role: ColRole;
  /** Period label of the parent header (matrix layouts). */
  group?: string;
  groupCell?: Cell;
}

export interface RawCourse {
  name: Cell;
  grade?: Cell;
  gradeHeader?: string;
  /** True when the grade column had to be guessed. */
  gradeGuessed?: boolean;
  score?: Cell;
  max?: Cell;
  credits?: Cell;
  hours?: Cell;
  qualifier?: Cell;
  /** A remark or interpretation cell ("Excellent", "Very Good"). */
  remark?: Cell;
  /** The grade written out in words, from its own column ("LETRA", "in words"). */
  words?: Cell;
  /** Period label text (heading above the table, or matrix column group). */
  period: string;
  periodCell?: Cell;
}

export interface TableResult {
  courses: RawCourse[];
  /** Rows not consumed by any table (letterhead, student info, notes). */
  freeRows: Row[];
  rows: Row[];
  /** Notes for the verify step. */
  notes: { kind: 'grade-without-name' | 'no-final-column' | 'no-header'; detail: string; cell?: Cell }[];
}

const GRADE_ROLES: ColRole[] = ['final', 'grade', 'score', 'component', 'period'];
const PRIORITY: Record<string, number> = { final: 4, grade: 3, period: 3, score: 2, component: 1 };

const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length;
const isBlank = (c?: Cell) => !c || /^[\s\-–—_.·*一ー―]*$/.test(c.text);
const short = (c: Cell) => c.text.length <= 64;

function isHeaderCandidate(row: Row): boolean {
  if (row.cells.length < 2) return false;
  let roles = 0;
  let periods = 0;
  let hasName = false;
  for (const c of row.cells) {
    // "Name: …", or the same with the colon lost to OCR ("اسم الطالب يوسف أحمد"), is a field, not a heading.
    if (!short(c) || /[:：]\s*\S/.test(c.text) || labelWithoutColon(c.text)) continue;
    const r = headerRole(c.text);
    if (r) {
      roles++;
      if (r === 'name') hasName = true;
    } else if (isPeriodLabel(c.text)) periods++;
  }
  // A subject heading beside period labels: "SUBJECT | SS 1 | SS 2", or a one-year sheet "SUBJECT | SS 1".
  if (hasName && (roles >= 2 || periods >= 1)) return true;
  // A matrix header whose subject heading was misread: several period labels in a row.
  if (periods >= 3 && periods >= row.cells.length - 2) return true;
  // Sub-header rows ("Score % | Grade | Score % | Grade") and headers whose subject column was not recognised.
  const dataLike = row.cells.some((c) => isGradeLike(c.text) && !headerRole(c.text));
  return roles >= 2 && !dataLike && roles >= row.cells.length - 1;
}

/** A row that reads like a subject line: some text plus a grade-shaped cell. */
function isDataRow(row: Row): boolean {
  return row.cells.some((c) => isGradeLike(c.text)) && row.cells.some((c) => letters(c.text) >= 2 && !isGradeLike(c.text));
}

const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

interface Band {
  start: number;
  end: number; // inclusive row indexes
  cols: HCol[];
}

function buildColumns(bandRows: Row[]): HCol[] {
  // Parent cells: period labels in a row that has role-bearing rows beneath it.
  const lastRoleRow = bandRows.map((r) => r.cells.filter((c) => headerRole(c.text)).length >= 2).lastIndexOf(true);
  const parents: Cell[] = [];
  const leaves: { cell: Cell; rowIdx: number }[] = [];
  bandRows.forEach((r, i) => {
    for (const c of r.cells) {
      if (i < lastRoleRow && isPeriodLabel(c.text) && !headerRole(c.text)) parents.push(c);
      else leaves.push({ cell: c, rowIdx: i });
    }
  });
  // Cluster leaf cells that sit above one another (wrapped header text) into columns.
  const cols: (HCol & { parts: { y: number; text: string }[] })[] = [];
  for (const { cell } of leaves.sort((a, b) => a.cell.x - b.cell.x)) {
    const hit = cols.find((col) => {
      const o = overlap(col.x0, col.x1, cell.x, cell.x + cell.w);
      return o > 0.4 * Math.min(col.x1 - col.x0, cell.w) && !col.parts.some((p) => Math.abs(p.y - cell.y) < cell.h * 0.5);
    });
    if (hit) {
      hit.parts.push({ y: cell.y, text: cell.text });
      hit.x0 = Math.min(hit.x0, cell.x);
      hit.x1 = Math.max(hit.x1, cell.x + cell.w);
    } else {
      cols.push({ x0: cell.x, x1: cell.x + cell.w, text: '', role: null, parts: [{ y: cell.y, text: cell.text }] });
    }
  }
  for (const col of cols) {
    col.text = col.parts.sort((a, b) => a.y - b.y).map((p) => p.text).join(' ');
    col.role = headerRole(col.text) ?? (isPeriodLabel(col.text) ? 'period' : null);
    if (col.role === 'period') col.group = col.text;
  }
  cols.sort((a, b) => a.x0 - b.x0);
  if (parents.length) {
    parents.sort((a, b) => a.x - b.x);
    const subs = cols.filter((c) => c.role && ['final', 'grade', 'score', 'component', 'credits', 'hours', 'max', 'rank'].includes(c.role));
    if (subs.length && subs.length % parents.length === 0) {
      // Same number of sub-columns under every period: assign in reading order.
      const per = subs.length / parents.length;
      subs.forEach((col, i) => {
        col.group = parents[Math.floor(i / per)].text;
        col.groupCell = parents[Math.floor(i / per)];
      });
    } else {
      for (const col of subs) {
        const cx = (col.x0 + col.x1) / 2;
        let best = parents[0];
        for (const p of parents) if (Math.abs(p.x + p.w / 2 - cx) < Math.abs(best.x + best.w / 2 - cx)) best = p;
        col.group = best.text;
        col.groupCell = best;
      }
    }
  }
  return cols;
}

function findBands(rows: Row[]): Band[] {
  const cand = rows.map(isHeaderCandidate);
  const bands: Band[] = [];
  let i = 0;
  while (i < rows.length) {
    if (!cand[i]) {
      i++;
      continue;
    }
    let end = i;
    while (end + 1 < rows.length && cand[end + 1] && rows[end + 1].page === rows[i].page && rows[end + 1].y - rows[end].y < rows[end].h * 3) end++;
    let start = i;
    // Absorb wrapped header fragments directly above / below (e.g. "SEM FINAL" over "GRADE").
    const anchor = rows.slice(i, end + 1).flatMap((r) => r.cells);
    const fits = (r: Row, ref: Row) =>
      r.page === ref.page &&
      Math.abs(r.y - ref.y) < ref.h * 1.7 &&
      !isDataRow(r) &&
      r.cells.every(
        (c) =>
          c.text.length <= 40 && !/[:：]/.test(c.text) && !labelWithoutColon(c.text) && !isPeriodLabel(c.text) && !/\d{3,}/.test(c.text) &&
          anchor.some((a) => overlap(a.x, a.x + a.w, c.x, c.x + c.w) > 0.3 * Math.min(a.w, c.w)),
      );
    // Lines closer together than one line height belong to the same multi-line header cell row.
    const tight = (r: Row, ref: Row) => r.page === ref.page && Math.abs(r.y - ref.y) < Math.min(r.h, ref.h) * 0.8 && r.cells.every((c) => c.text.length <= 60 && !/[:：]\s*\S/.test(c.text));
    for (let k = 0; k < 3 && start - 1 >= 0 && tight(rows[start - 1], rows[start]); k++) start--;
    for (let k = 0; k < 3 && end + 1 < rows.length && tight(rows[end + 1], rows[end]); k++) end++;
    for (let k = 0; k < 2 && start - 1 >= 0 && !cand[start - 1] && fits(rows[start - 1], rows[start]); k++) start--;
    for (let k = 0; k < 2 && end + 1 < rows.length && !cand[end + 1] && fits(rows[end + 1], rows[end]); k++) end++;
    bands.push({ start, end, cols: buildColumns(rows.slice(start, end + 1)) });
    i = end + 1;
  }
  return bands;
}

/** Assigns each body row's cells to columns. Column extents are learned from rows that have every column. */
function assign(cols: HCol[], body: Row[]): (Cell | undefined)[][] {
  const n = cols.length;
  const full = body.filter((r) => r.cells.length === n);
  const ext = cols.map((c) => ({ x0: c.x0, x1: c.x1 }));
  if (full.length >= Math.max(2, body.length * 0.3)) {
    for (let i = 0; i < n; i++) {
      const xs0 = full.map((r) => r.cells[i].x).sort((a, b) => a - b);
      const xs1 = full.map((r) => r.cells[i].x + r.cells[i].w).sort((a, b) => a - b);
      ext[i] = { x0: Math.min(cols[i].x0, xs0[Math.floor(xs0.length * 0.1)]), x1: Math.max(cols[i].x1, xs1[Math.floor(xs1.length * 0.9)]) };
    }
  }
  // Make extents non-overlapping by splitting shared zones at the midpoint.
  for (let i = 0; i + 1 < n; i++) {
    if (ext[i].x1 > ext[i + 1].x0) {
      const mid = (ext[i].x1 + ext[i + 1].x0) / 2;
      ext[i].x1 = mid;
      ext[i + 1].x0 = mid;
    }
  }
  return body.map((r) => {
    const out: (Cell | undefined)[] = new Array(n).fill(undefined);
    if (r.cells.length === n) {
      // Trust order only if it agrees with geometry for most cells.
      const agree = r.cells.filter((c, i) => overlap(ext[i].x0, ext[i].x1, c.x, c.x + c.w) > 0).length;
      if (agree >= n - 1) return r.cells.slice();
    }
    for (const c of r.cells) {
      let best = -1;
      let bestScore = -Infinity;
      for (let i = 0; i < n; i++) {
        const o = overlap(ext[i].x0, ext[i].x1, c.x, c.x + c.w);
        const dist = Math.abs((ext[i].x0 + ext[i].x1) / 2 - (c.x + c.w / 2));
        const score = o > 0 ? o / Math.max(1, c.w) + 1 : -dist / 1000;
        if (score > bestScore) ((bestScore = score), (best = i));
      }
      const prev = out[best];
      out[best] = prev ? { ...prev, text: `${prev.text} ${c.text}`, w: Math.max(prev.x + prev.w, c.x + c.w) - prev.x, conf: Math.min(prev.conf, c.conf) } : c;
    }
    return out;
  });
}

/**
 * Where the body's own columns are: maximal x-ranges that cells occupy, separated by gutters that
 * (almost) no row crosses. Headings are often centred over a wide column while the data is left-aligned,
 * so the heading's position alone does not say where its column's data sits.
 */
export function dataColumns(body: Row[]): { x0: number; x1: number }[] {
  const cells = body.flatMap((r) => r.cells);
  if (body.length < 3 || !cells.length) return [];
  const min = Math.floor(Math.min(...cells.map((c) => c.x)));
  const max = Math.ceil(Math.max(...cells.map((c) => c.x + c.w)));
  const cover = new Uint16Array(max - min + 2);
  for (const r of body) {
    const seen = new Uint8Array(cover.length);
    for (const c of r.cells) for (let x = Math.floor(c.x) - min; x <= Math.ceil(c.x + c.w) - min; x++) seen[x] = 1;
    for (let x = 0; x < seen.length; x++) cover[x] += seen[x];
  }
  const tol = Math.floor(body.length * 0.1);
  const hs = cells.map((c) => c.h).sort((a, b) => a - b);
  const minGap = hs[Math.floor(hs.length / 2)] * 0.25;
  const runs: { x0: number; x1: number }[] = [];
  let start = -1;
  for (let x = 0; x <= cover.length; x++) {
    const on = x < cover.length && cover[x] > tol;
    if (on && start < 0) start = x;
    if (!on && start >= 0) {
      const run = { x0: start + min, x1: x - 1 + min };
      const last = runs[runs.length - 1];
      if (last && run.x0 - last.x1 < minGap) last.x1 = run.x1;
      else runs.push(run);
      start = -1;
    }
  }
  return runs;
}

/** The roles a heading names, in order: "CALIF.LETRA CRÉDITOS" → grade, words, credits. */
function headingRoles(text: string): { role: ColRole; text: string }[] {
  const words = text.split(/[\s.·/|]+/).filter(Boolean);
  const out: { role: ColRole; text: string }[] = [];
  // Shortest match first: a longer span would also "contain" the role of its last word.
  for (let i = 0; i < words.length; ) {
    let hit: { role: ColRole; text: string; n: number } | null = null;
    for (let n = 1; n <= Math.min(3, words.length - i) && !hit; n++) {
      const t = words.slice(i, i + n).join(' ');
      const role = headerRole(t);
      if (role) hit = { role, text: t, n };
    }
    if (!hit) {
      i++;
      continue;
    }
    if (out.length && out[out.length - 1].role === hit.role) out[out.length - 1].text += ` ${hit.text}`;
    else out.push({ role: hit.role, text: hit.text });
    i += hit.n;
  }
  return out;
}

/**
 * One heading printed (or read by OCR) as a single cell over several body columns, such as
 * "CALIF.LETRA CRÉDITOS" over "7 | SIETE | 10", is split into one column per role it names,
 * when the body shows exactly that many columns beneath it.
 */
function splitMergedHeadings(cols: HCol[], body: Row[]): HCol[] {
  const out: HCol[] = [];
  cols.forEach((c, ci) => {
    const roles = headingRoles(c.text);
    if (roles.length < 2) return void out.push(c);
    // The cells under this heading, row by row, up to the neighbouring headings.
    const left = ci > 0 ? cols[ci - 1].x1 : -Infinity;
    const right = ci + 1 < cols.length ? cols[ci + 1].x0 : Infinity;
    const under = body.map((r) => r.cells.filter((x) => x.x + x.w / 2 > Math.max(left, c.x0 - x.h) && x.x + x.w / 2 < Math.min(right, c.x1 + x.h)).sort((a, b) => a.x - b.x)).filter((cs) => cs.length);
    const k = roles.length;
    const even = under.filter((cs) => cs.length === k);
    // Most rows must show one cell per named role, so the heading really is several columns.
    if (even.length < 2 || even.length < under.length * 0.5) return void out.push(c);
    roles.forEach((r, j) => {
      const x0 = Math.min(...even.map((cs) => cs[j].x));
      const x1 = Math.max(...even.map((cs) => cs[j].x + cs[j].w));
      out.push({ ...c, x0: j === 0 ? Math.min(c.x0, x0) : x0, x1: j === k - 1 ? Math.max(c.x1, x1) : x1, text: r.text, role: r.role });
    });
  });
  return out;
}

/**
 * Lines the header columns up with the body's columns. Two headings that sit over one body column are
 * merged (a row-number column glued to the subject column), and extents follow the data.
 */
function reconcile(cols: HCol[], body: Row[]): HCol[] {
  const data = dataColumns(body);
  if (data.length < 2 || data.length > cols.length) return cols;
  const centre = (c: { x0: number; x1: number }) => (c.x0 + c.x1) / 2;
  const home = cols.map((c) => data.findIndex((d) => centre(c) >= d.x0 - 2 && centre(c) <= d.x1 + 2));
  // A heading centred over a wide, left-aligned column can sit to the right of where most of that
  // column's text ends, in the gutter. It belongs to the neighbouring body column that has no real
  // heading of its own, or whose longest cell reaches under it.
  const real = (di: number) => cols.some((c, i) => home[i] === di && c.role && c.role !== 'code');
  const reach = data.map((d) => {
    const mine = body.flatMap((r) => r.cells).filter((c) => c.x + c.w / 2 >= d.x0 && c.x + c.w / 2 <= d.x1);
    return { x0: Math.min(d.x0, ...mine.map((c) => c.x)), x1: Math.max(d.x1, ...mine.map((c) => c.x + c.w)) };
  });
  cols.forEach((c, i) => {
    if (home[i] >= 0) return;
    const x = centre(c);
    const left = data.findLastIndex((d) => d.x1 < x);
    const right = data.findIndex((d) => d.x0 > x);
    if (left >= 0 && x <= reach[left].x1 && !real(left)) home[i] = left;
    else if (right >= 0 && x >= reach[right].x0 && !real(right)) home[i] = right;
    else if (left >= 0 && right >= 0 && real(right) && !real(left)) home[i] = left;
    else if (left >= 0 && right >= 0 && real(left) && !real(right)) home[i] = right;
  });
  // Every body column needs a heading; otherwise the headings do not describe this body.
  if (data.some((_, di) => !home.includes(di))) return cols;
  // Headings for different things (subject, grade, credits) over one body column mean a wide cell
  // bridged real columns, not that the headings belong together.
  const distinctRoles = (di: number) => new Set(cols.filter((c, i) => home[i] === di && c.role && c.role !== 'code').map((c) => c.role)).size;
  if (data.some((_, di) => distinctRoles(di) > 1)) return cols;
  const out: HCol[] = [];
  data.forEach((d, di) => {
    const mine = cols.filter((_, i) => home[i] === di);
    const lead = mine.find((c) => c.role === 'name') ?? mine.find((c) => c.role && c.role !== 'code') ?? mine[0];
    out.push({ ...lead, x0: Math.min(d.x0, lead.x0), x1: Math.max(d.x1, lead.x1), text: lead.text });
  });
  // Headings over no data (an empty column) keep their place.
  cols.forEach((c, i) => {
    if (home[i] < 0) out.push(c);
  });
  out.sort((a, b) => a.x0 - b.x0);
  for (let i = 0; i + 1 < out.length; i++) {
    if (out[i].x1 > out[i + 1].x0) {
      const mid = (Math.max(out[i].x0, out[i + 1].x0) + Math.min(out[i].x1, out[i + 1].x1)) / 2;
      out[i].x1 = mid;
      out[i + 1].x0 = mid;
    }
  }
  return out;
}

/** Guesses roles for columns the header vocabulary did not recognise, from the body content. */
function inferRoles(cols: HCol[], grid: (Cell | undefined)[][]): boolean {
  const stats = cols.map((_, i) => {
    const cells = grid.map((r) => r[i]).filter((c): c is Cell => !isBlank(c));
    const gradeLike = cells.filter((c) => isGradeLike(c.text)).length;
    return { n: cells.length, gradeFrac: cells.length ? gradeLike / cells.length : 0, avgLetters: cells.length ? cells.reduce((a, c) => a + letters(c.text), 0) / cells.length : 0 };
  });
  let guessed = false;
  if (!cols.some((c) => c.role === 'name')) {
    let best = -1;
    for (let i = 0; i < cols.length; i++) {
      if (cols[i].role && cols[i].role !== 'area') continue;
      if (stats[i].gradeFrac < 0.3 && stats[i].avgLetters >= 2 && (best < 0 || stats[i].avgLetters > stats[best].avgLetters)) best = i;
    }
    if (best >= 0) ((cols[best].role = 'name'), (guessed = true));
  }
  if (!cols.some((c) => GRADE_ROLES.includes(c.role))) {
    const nameIdx = cols.findIndex((c) => c.role === 'name');
    let best = -1;
    for (let i = 0; i < cols.length; i++) {
      if (cols[i].role || i === nameIdx) continue;
      if (stats[i].gradeFrac >= 0.6 && (best < 0 || i > best)) best = i;
    }
    if (best >= 0) ((cols[best].role = 'grade'), (guessed = true));
  }
  return guessed;
}

const CONNECTOR_END = /(?:\b(?:de|del|la|las|los|y|e|et|des|du|und|of|and|the|for|in|a|à|và|da|do|das|dos|en|al|to|with|sa|at|ng)|[,&/\-–])$/iu;

interface Entry {
  cells: (Cell | undefined)[];
  y: number;
  h: number;
}

function coursesFromGroup(cols: HCol[], idx: number[], grid: (Cell | undefined)[][], rowsMeta: Row[], headingFor: (group?: string) => { text: string; cell?: Cell }, notes: TableResult['notes']): RawCourse[] {
  const nameIdx = idx.find((i) => cols[i].role === 'name');
  if (nameIdx == null) return [];
  const others = idx.filter((i) => i !== nameIdx);
  let entries: Entry[] = grid.map((r, k) => ({ cells: r, y: rowsMeta[k].y, h: rowsMeta[k].h }));
  entries = entries.filter((e) => idx.some((i) => !isBlank(e.cells[i])));

  // Merge wrapped lines: a subject name that continues on the next visual line.
  const hasName = (e: Entry) => !isBlank(e.cells[nameIdx]) && letters(e.cells[nameIdx]!.text) >= 1;
  const hasValue = (e: Entry) => others.some((i) => !isBlank(e.cells[i]) && cols[i].role !== 'area' && cols[i].role !== 'code' && cols[i].role !== 'qualifier');
  const near = (a: Entry, b: Entry) => Math.abs(a.y - b.y) < Math.max(a.h, b.h) * 1.5;
  const joinName = (into: Entry, from: Entry, prepend: boolean) => {
    const a = into.cells[nameIdx];
    const b = from.cells[nameIdx]!;
    into.cells = into.cells.slice();
    into.cells[nameIdx] = a
      ? { ...a, text: prepend ? `${b.text} ${a.text}` : `${a.text} ${b.text}`, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y), conf: Math.min(a.conf, b.conf) }
      : b;
  };
  const merged: Entry[] = [];
  for (let k = 0; k < entries.length; k++) {
    const e = entries[k];
    const prev = merged[merged.length - 1];
    const next = entries[k + 1];
    if (hasName(e) && !hasValue(e)) {
      if (isPeriodLabel(e.cells[nameIdx]!.text) || isSummaryLabel(e.cells[nameIdx]!.text)) continue;
      const toNext = next && near(e, next) && (!hasName(next) || CONNECTOR_END.test(e.cells[nameIdx]!.text)) && hasValue(next);
      const toPrev = prev && near(prev, e) && hasName(prev);
      // When it could belong to either, it belongs to the row it is closer to: a name's last line sits right under it.
      const closerToPrev = toPrev && toNext && e.y - prev.y < (next.y - e.y) * 0.6;
      if (toNext && !closerToPrev && (!toPrev || !hasName(next) || CONNECTOR_END.test(e.cells[nameIdx]!.text))) {
        entries[k + 1] = { ...next, cells: next.cells.slice() };
        joinName(entries[k + 1], e, true);
        continue;
      }
      if (toPrev) {
        joinName(prev, e, false);
        continue;
      }
      continue; // an isolated label (category heading) — not a course
    }
    merged.push(e);
  }

  const out: RawCourse[] = [];
  const groups = [...new Set(others.filter((i) => cols[i].group).map((i) => cols[i].group!))];
  for (const e of merged) {
    const name = e.cells[nameIdx];
    if (isBlank(name) || letters(name!.text) < 1) {
      const g = others.map((i) => e.cells[i]).find((c) => c && isGradeLike(c.text));
      if (g) notes.push({ kind: 'grade-without-name', detail: `A grade (“${g.text}”) was read on a row where no subject name could be read.`, cell: g });
      continue;
    }
    if (isSummaryLabel(name!.text) || headerRole(name!.text) === 'name') continue;
    const pick = (cands: number[]): RawCourse | null => {
      const byRole = (roles: ColRole[]) => cands.filter((i) => roles.includes(cols[i].role) && !isBlank(e.cells[i]));
      const gradeCols = cands.filter((i) => GRADE_ROLES.includes(cols[i].role));
      let gi = -1;
      for (const i of gradeCols) {
        if (isBlank(e.cells[i])) continue;
        if (gi < 0 || PRIORITY[cols[i].role as string] >= PRIORITY[cols[gi].role as string]) gi = i;
      }
      // Highest priority column wins even if a lower one is filled; ties → right-most (already handled by >=).
      const top = Math.max(-1, ...gradeCols.map((i) => PRIORITY[cols[i].role as string]));
      const topFilled = gradeCols.filter((i) => PRIORITY[cols[i].role as string] === top && !isBlank(e.cells[i]));
      if (topFilled.length) gi = topFilled[topFilled.length - 1];
      const course: RawCourse = { name: name!, period: '' };
      // Long prose in the grade column is not a grade (signature captions, remarks that slid across).
      if (gi >= 0 && !isGradeLike(e.cells[gi]!.text) && letters(e.cells[gi]!.text) > 14) gi = -1;
      if (gi >= 0) {
        course.grade = e.cells[gi];
        course.gradeHeader = cols[gi].text;
        if (cols[gi].role === 'component') {
          notes.push({ kind: 'no-final-column', detail: `No final-grade column was recognised for “${name!.text}”; the “${cols[gi].text}” column was used.`, cell: e.cells[gi] });
        }
        const sc = byRole(['score']).find((i) => i !== gi);
        if (sc != null) course.score = e.cells[sc];
      }
      const first = (roles: ColRole[]) => {
        const i = byRole(roles)[0];
        return i == null ? undefined : e.cells[i];
      };
      course.max = first(['max']);
      course.credits = first(['credits']);
      course.hours = first(['hours']);
      course.qualifier = first(['qualifier']);
      course.words = first(['words']);
      course.remark = first(['remark']);
      // The number could not be read but the same grade is written out in words beside it.
      // The number may also have slid into the words column as one cell ("10 DIEZ").
      if (!course.grade && course.words) {
        const s = splitGrade(course.words.text);
        if (gradeFromWords(course.words.text) != null || (/^\d/.test(s.grade) && gradeFromWords(s.rest) != null)) course.grade = course.words;
      }
      return course.grade || course.credits || course.hours ? course : null;
    };
    if (groups.length) {
      const shared = others.filter((i) => !cols[i].group);
      for (const g of groups) {
        const c = pick([...others.filter((i) => cols[i].group === g), ...shared]);
        if (!c || !c.grade) continue;
        const gc = cols[others.find((i) => cols[i].group === g)!];
        c.period = g;
        c.periodCell = gc.groupCell;
        out.push(c);
      }
    } else {
      const c = pick(others);
      if (!c) continue;
      const h = headingFor();
      c.period = h.text;
      c.periodCell = h.cell;
      out.push(c);
    }
  }
  return out;
}

interface Heading {
  text: string;
  cell?: Cell;
}

interface Segment {
  heading?: Heading;
  rows: Row[];
}

/** A short row that only names a year/term ("SEGUNDO SEMESTRE", "Lớp 11 — Năm học 2024 - 2025"). */
function isHeadingRow(r: Row): boolean {
  return r.cells.length <= 2 && !isDataRow(r) && rowText(r).length < 120 && isPeriodLabel(rowText(r));
}

export function readTables(doc: DocTokens): TableResult {
  const rows = buildRows(doc);
  const bands = findBands(rows);
  const notes: TableResult['notes'] = [];
  const courses: RawCourse[] = [];
  const used = new Set<number>();
  let lastHeading: Heading[] = [];
  // A heading carries over to later tables of the same file only, never into the next file of a combined record.
  const partStarts = [0, ...(doc.parts ?? []).map((x) => x.firstPage)].sort((x, y) => x - y);
  const partOf = (page: number) => partStarts.filter((s0) => s0 <= page).pop() ?? 0;
  let lastPart = 0;
  let prevTableEnd = -1;

  bands.forEach((band, b) => {
    const part = partOf(rows[band.start].page);
    if (part !== lastPart) {
      lastHeading = [];
      lastPart = part;
    }
    for (let i = band.start; i <= band.end; i++) used.add(i);
    const nextStart = b + 1 < bands.length ? bands[b + 1].start : rows.length;
    const left = Math.min(...band.cols.map((c) => c.x0));
    const right = Math.max(...band.cols.map((c) => c.x1));
    const multi = band.cols.filter((c) => c.role === 'name').length > 1;

    // Body rows, split into segments at inline period headings.
    const segments: Segment[] = [{ rows: [] }];
    const bodyIdx: number[] = [];
    const pitches: number[] = [];
    let prev: Row = rows[band.end];
    let lastIdx = band.end;
    for (let i = band.end + 1; i < nextStart; i++) {
      const r = rows[i];
      const seg = segments[segments.length - 1];
      const count = segments.reduce((a, s) => a + s.rows.length, 0);
      const single = r.cells.length === 1;
      const prose = single && (r.cells[0].text.split(/\s+/).length > 7 || /[.。;]\s*$/.test(r.cells[0].text) || /[:：]\s*\S/.test(r.cells[0].text));
      const outside = r.cells.every((c) => c.x > right + 20 || c.x + c.w < left - 20);
      // A long subject name that wraps ("Spécialité Sciences de la vie et de la / Terre") is not prose: its first
      // line sits in the subject column right above (or beside) the row with its marks.
      const nameCol = band.cols.find((c) => c.role === 'name');
      const next = rows[i + 1];
      const wrappedName =
        single && !!nameCol && !!next && next.page === r.page && Math.abs(next.y - r.y) < Math.max(next.h, r.h) * 1.7 && isDataRow(next) &&
        // Subject names start at the column's left edge; the heading ("Matières") can be far narrower than they are.
        r.cells[0].x >= nameCol.x0 - r.h * 1.5 && r.cells[0].x <= nameCol.x1 && !/[.。;:：]\s*$/.test(r.cells[0].text);
      // …and its last line can also drop below the row with the marks ("Spécialité Sciences de la vie et de la" with its
      // marks, then "Terre"). That line sits much closer to the row above than rows sit to each other; a heading for
      // the next group sits at least a full row away, so it is never taken for the end of a name.
      const rowPitch = pitches.length ? [...pitches].sort((a, b2) => a - b2)[Math.floor(pitches.length / 2)] : 0;
      const wrappedTail =
        single && !!nameCol && count > 0 && prev.page === r.page && isDataRow(prev) && r.y - prev.y < Math.max(prev.h, r.h) * 1.7 && (!rowPitch || r.y - prev.y < rowPitch * 0.75) &&
        r.cells[0].x >= nameCol.x0 - r.h * 1.5 && r.cells[0].x <= nameCol.x1 && !/[.。;:：]\s*$/.test(r.cells[0].text) && !isPeriodLabel(r.cells[0].text) && letters(r.cells[0].text) >= 2;
      if (wrappedName || wrappedTail) {
        if (r.page === prev.page && seg.rows.length && !wrappedTail) pitches.push(r.y - prev.y);
        seg.rows.push(r);
        bodyIdx.push(i);
        prev = wrappedTail ? prev : r;
        lastIdx = i;
        continue;
      }
      // The second line of a wrapped cell in a comment column ("…ne pas se / décourager.") belongs to the table.
      if (single && count) {
        const c0 = r.cells[0];
        const inSideColumn = band.cols.some((c) => c.role !== 'name' && c.role !== 'code' && overlap(c.x0, c.x1, c0.x, c0.x + c0.w) > 0.6 * c0.w) && !band.cols.some((c) => c.role === 'name' && overlap(c.x0, c.x1, c0.x, c0.x + c0.w) > 0);
        if (inSideColumn && r.page === prev.page && r.y - prev.y < Math.max(prev.h, r.h) * 2.2) continue;
      }
      // A row made only of text far taller than the table's own (a letter of a watermark or a seal) is not a course.
      if (count >= 2) {
        const rowH = [...seg.rows.map((x) => x.h)].sort((a, b2) => a - b2)[Math.floor(seg.rows.length / 2)] ?? r.h;
        if (r.cells.every((c) => c.h > rowH * 2.6)) continue;
      }
      // Page furniture (a printed web address, "1/2", a print timestamp) is never part of a table.
      const furniture = r.cells.some((c) => /https?:\/\/|www\./i.test(c.text)) || r.cells.every((c) => /^\s*(page\s*)?\d{1,3}\s*(\/|of)\s*\d{1,3}\s*$/i.test(c.text));
      if (prose || outside || furniture) {
        if (count) break;
        continue;
      }
      if (r.page === prev.page && count >= 2) {
        const pitch = pitches.length ? [...pitches].sort((a, b2) => a - b2)[Math.floor(pitches.length / 2)] : r.h * 1.5;
        const gap = r.y - prev.y;
        if (gap > Math.max(pitch * 4, r.h * 5) || (gap > Math.max(pitch * 2.4, r.h * 3) && !isDataRow(r))) break;
      }
      // A table carries on to the next page only if subject rows resume near the top of that page.
      if (r.page !== prev.page && count) {
        let resumes = false;
        for (let k = i; k < Math.min(i + 4, nextStart); k++) {
          if (rows[k].page !== r.page) break;
          if (isDataRow(rows[k]) && rows[k].cells.length >= Math.min(3, band.cols.length)) {
            resumes = true;
            break;
          }
        }
        if (!resumes) break;
        if (!isDataRow(r)) continue;
      }
      const headingLike = multi ? !isDataRow(r) && r.cells.length <= 4 && r.cells.every((c) => isPeriodLabel(c.text) && c.text.length < 80) : isHeadingRow(r);
      if (headingLike) {
        // Belongs to the next table if no subject rows follow before the next header band.
        let dataAhead = false;
        for (let k = i + 1; k < nextStart; k++) if (isDataRow(rows[k])) ((dataAhead = true), (k = nextStart));
        if (!dataAhead) break;
        if (multi) continue;
        used.add(i);
        segments.push({ heading: { text: rowText(r), cell: r.cells[0] }, rows: [] });
        prev = r;
        lastIdx = i;
        continue;
      }
      if (r.page === prev.page && seg.rows.length) pitches.push(r.y - prev.y);
      seg.rows.push(r);
      bodyIdx.push(i);
      prev = r;
      lastIdx = i;
    }
    const body = segments.flatMap((s) => s.rows);
    if (!body.length) return;
    bodyIdx.forEach((i) => used.add(i));

    band.cols = reconcile(splitMergedHeadings(band.cols, body), body);
    const grid = assign(band.cols, body);
    const guessedRoles = inferRoles(band.cols, grid);
    const coursesBefore = courses.length;

    // Headings: the closest rows above the band that are not part of another table.
    const headingRows: Row[] = [];
    for (let i = band.start - 1; i > prevTableEnd && headingRows.length < 3; i--) {
      if (rows[i].page !== rows[band.start].page) break;
      headingRows.push(rows[i]);
    }
    const nameCols = band.cols.map((c, i) => (c.role === 'name' ? i : -1)).filter((i) => i >= 0);
    const groupsIdx: number[][] = nameCols.length
      ? nameCols.map((n, k) => {
          const stop = k + 1 < nameCols.length ? nameCols[k + 1] : band.cols.length;
          return band.cols.map((_, i) => i).filter((i) => i >= (k === 0 ? 0 : n) && i < stop);
        })
      : [band.cols.map((_, i) => i)];
    const headings: Heading[] = [];
    groupsIdx.forEach((idx, gi) => {
      const gx0 = Math.min(...idx.map((i) => band.cols[i].x0));
      const gx1 = Math.max(...idx.map((i) => band.cols[i].x1));
      let found: Heading | null = null;
      for (const hr of headingRows) {
        const cells = groupsIdx.length > 1 ? hr.cells.filter((c) => overlap(gx0, gx1, c.x, c.x + c.w) > 0.5 * Math.min(c.w, gx1 - gx0)) : hr.cells;
        const text = cells.map((c) => c.text).join(' ');
        // A line with several "label: value" pairs is student information unless it sits directly on top of the table.
        const adjacent = hr.page === rows[band.start].page && rows[band.start].y - hr.y < Math.max(hr.h, rows[band.start].h) * 2.6;
        // "Class on Leaving: SS 3" describes the student, not this table.
        const aboutStudent = /^[^:：]{1,40}[:：]/.test(text) && STUDENT_CLASS.test(text.split(/[:：]/)[0]);
        if (!aboutStudent && cells.length && cells.length <= 3 && text.length < 120 && isPeriodLabel(text) && (adjacent || !/[:：]\s*\S.*[:：]/.test(text))) {
          found = { text, cell: cells[0] };
          break;
        }
      }
      if (!found) found = lastHeading[gi] ?? lastHeading[0] ?? { text: '' };
      headings[gi] = found;
      let offset = 0;
      let current = found;
      for (const seg of segments) {
        if (seg.heading) current = seg.heading;
        const h = current;
        courses.push(...coursesFromGroup(band.cols, idx, grid.slice(offset, offset + seg.rows.length), seg.rows, () => h, notes));
        offset += seg.rows.length;
        headings[gi] = current;
      }
    });
    // Only worth telling the counselor when the guessed columns produced courses.
    if (guessedRoles && courses.length > coursesBefore) {
      notes.push({ kind: 'no-header', detail: 'Some column headings were not recognised; the subject and grade columns were inferred from their contents.' });
    }
    lastHeading = headings;
    for (const h of headings) {
      if (!h.cell) continue;
      const i = rows.findIndex((r) => r.cells.includes(h.cell!));
      if (i >= 0) used.add(i);
    }
    prevTableEnd = lastIdx;
  });

  return { courses, rows, freeRows: rows.filter((_, i) => !used.has(i)), notes };
}

export const cellKey = (c: Cell) => key(c.text);
