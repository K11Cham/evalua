// Records combined from separate files, for every system: each multi-period fake transcript is split into one
// file per year or term, the files are combined into one record (as a multi-file upload or "Add documents" does),
// and every course's grade level, term and school year is checked against the known answer.
//   npm run eval:split          → writes docs/ACCURACY_COMBINED.md
//   npm run eval:split -- mx    → matching records only, with misses
// Two styles per record:
//   heading  each file prints its year or term as a heading over its table, in the system's own words
//   header   each file prints it only once, in the page header (as one-term report cards do)
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, rmSync } from 'node:fs';
import { chromium } from 'playwright';
import { evaluate, runExtraction } from '../../src/core/pipeline.ts';
import type { DocTokens } from '../../src/core/types.ts';
import { seedKb } from '../../src/kb/index.ts';
import { allSpecs } from '../fakegen/generate.ts';
import { specHtml } from '../fakegen/render.ts';
import type { FakeSpec } from '../fakegen/types.ts';
import { closeOcr, ingestFile } from './node-ingest.ts';
import { key, similarity } from '../../src/core/text.ts';

const filters = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const kb = seedKb();
const jcps = kb.districts.find((d) => d.id === 'ky-jcps')!;
const tmp = mkdtempSync(path.join(os.tmpdir(), 'evalua-split-'));

/** One file per year/term of a spec, in the given style. */
function splitSpecs(spec: FakeSpec, style: 'heading' | 'header'): FakeSpec[] {
  return spec.years.map((y) => {
    const s: FakeSpec = structuredClone(spec);
    s.years = [{ ...structuredClone(y), pageBreak: false }];
    if (style === 'heading') {
      // A single-period table keeps its heading in stacked layouts; matrix layouts keep the column group.
      if (s.layout === 'slip') s.layout = 'stacked';
    } else {
      // The period is printed once, in the header; the table has no heading. A matrix's subject column
      // (its row header) becomes an ordinary first column.
      if (s.layout === 'matrix') s.cols = [{ h: s.rowHeader ?? 'Subject', f: 'n' }, ...s.cols.map((c) => ({ ...c, h: c.h || 'Grade' }))];
      s.layout = 'slip';
      s.subtitle = y.label;
    }
    return s;
  });
}

interface Score {
  spec: string;
  style: string;
  files: number;
  courses: number;
  found: number;
  level: number;
  term: number;
  termTotal: number;
  year: number;
  yearTotal: number;
  misses: string[];
  credits: number;
}

const browser = await chromium.launch();
const page = await browser.newPage();
const scores: Score[] = [];
const multi = allSpecs.filter((s) => s.years.length > 1 && (!filters.length || filters.some((f) => s.id.includes(f))));
for (const spec of multi) {
  for (const style of ['heading', 'header'] as const) {
    const parts = splitSpecs(spec, style);
    const docs: DocTokens[] = [];
    for (let i = 0; i < parts.length; i++) {
      await page.setContent(specHtml(parts[i]), { waitUntil: 'load' });
      const file = path.join(tmp, `${spec.id}-${style}-${i}.pdf`);
      await page.pdf({ path: file, format: 'A4', printBackground: true });
      docs.push(await ingestFile(file, false));
    }
    const all: DocTokens = { kind: 'pdf-text', pages: [], tokens: [], engine: 'PDF text layer', warnings: [], parts: [] };
    for (const [i, d] of docs.entries()) {
      const off = all.pages.length;
      all.parts!.push({ name: `${spec.id}-${i}`, firstPage: off });
      all.pages.push(...d.pages);
      all.tokens.push(...d.tokens.map((t) => ({ ...t, page: t.page + off })));
    }
    const ex = runExtraction(all, kb);
    const ev = evaluate(ex, kb, jcps);
    const s: Score = { spec: spec.id, style, files: parts.length, courses: 0, found: 0, level: 0, term: 0, termTotal: 0, year: 0, yearTotal: 0, misses: [], credits: ev.totalEarned };
    const used = new Set<string>();
    spec.years.forEach((y, fi) => {
      for (const t of y.courses) {
        s.courses++;
        // The course in the file for this year, read with this name.
        const c = ex.courses.find((x) => !used.has(x.id) && x.name.source?.page === all.parts![fi].firstPage && similarity(x.name.original ?? '', t.n) >= 0.8);
        if (!c) {
          s.misses.push(`missing: ${t.n} [${y.label}]`);
          continue;
        }
        used.add(c.id);
        s.found++;
        if (c.level === y.level) s.level++;
        else s.misses.push(`level: ${t.n} [${y.label}] got ${c.level}, want ${y.level}`);
        if (y.term) {
          s.termTotal++;
          if (c.term === y.term) s.term++;
          else s.misses.push(`term: ${t.n} [${y.label}] got ${c.term ?? '—'}, want ${y.term}`);
        } else if (c.term) s.misses.push(`term: ${t.n} [${y.label}] got ${c.term}, want none (whole year)`);
        // Only when the document prints a year; "Summer 2023" for 2022-2023 counts as right.
        // A matrix prints its short column label ("SS 1"), not the full one with the year.
        const printed = style === 'heading' && spec.layout === 'matrix' ? (y.short ?? y.label) : y.label;
        if (y.academicYear && /\b(?:19|20)\d{2}\b/.test(printed)) {
          s.yearTotal++;
          if (c.academicYear === y.academicYear || (!!c.academicYear && y.academicYear.split('-').includes(c.academicYear))) s.year++;
          else s.misses.push(`year: ${t.n} [${y.label}] got ${c.academicYear ?? '—'}, want ${y.academicYear}`);
        }
      }
    });
    scores.push(s);
    const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '—');
    console.log(`${spec.id.padEnd(16)} ${style.padEnd(7)} files ${String(parts.length).padStart(2)}  courses ${s.found}/${s.courses}  level ${pct(s.level, s.found)}  term ${pct(s.term, s.termTotal)}  year ${pct(s.year, s.yearTotal)}`);
    if (filters.length) for (const m of s.misses.slice(0, 12)) console.log('     · ' + m);
  }
}
await browser.close();
await closeOcr();
rmSync(tmp, { recursive: true, force: true });

if (!filters.length) {
  const sum = (f: (s: Score) => number, set = scores) => set.reduce((a, x) => a + f(x), 0);
  const P = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)}%` : '—');
  let md = `# Records combined from separate files\n\nGenerated by \`npm run eval:split\` on ${new Date().toISOString().slice(0, 10)}.\n\n`;
  md += `Every fake transcript with more than one year or term (${multi.length} records, ${new Set(multi.map((s) => s.system)).size} systems) is split into one file per year or term, in two styles, and the files are combined into one record the way a multi-file upload or **Add documents** does. Each course's grade level, term and school year must come from its own file.\n\n`;
  md += `- **heading**: each file prints its year or term as a heading over its table, in the system's own words.\n- **header**: each file prints it only once, in the page header, as one-term report cards do.\n\n`;
  md += `| Style | Records | Courses found | Grade level right | Term right | School year right |\n|---|---|---|---|---|---|\n`;
  for (const style of ['heading', 'header']) {
    const set = scores.filter((s) => s.style === style);
    md += `| ${style} | ${set.length} | ${P(sum((s) => s.found, set), sum((s) => s.courses, set))} | ${P(sum((s) => s.level, set), sum((s) => s.found, set))} | ${P(sum((s) => s.term, set), sum((s) => s.termTotal, set))} | ${P(sum((s) => s.year, set), sum((s) => s.yearTotal, set))} |\n`;
  }
  md += `\n## Per record\n\n| Record | Style | Files | Courses | Level | Term | Year |\n|---|---|---|---|---|---|---|\n`;
  const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '—');
  for (const s of scores) md += `| ${s.spec} | ${s.style} | ${s.files} | ${s.found}/${s.courses} | ${pct(s.level, s.found)} | ${pct(s.term, s.termTotal)} | ${pct(s.year, s.yearTotal)} |\n`;
  const missed = scores.filter((s) => s.misses.length);
  if (missed.length) {
    md += `\n## What went wrong\n\n`;
    for (const s of missed) md += `**${s.spec} (${s.style})**\n\n${s.misses.slice(0, 12).map((m) => `- ${m}`).join('\n')}${s.misses.length > 12 ? `\n- …and ${s.misses.length - 12} more` : ''}\n\n`;
  }
  writeFileSync('docs/ACCURACY_COMBINED.md', md);
  console.log('\nwrote docs/ACCURACY_COMBINED.md');
  void key;
}
