// Bulk analysis of real records, kept on this machine.
//   npm run bulk -- <records folder> [case filter…] --out <report folder> [--district ky-jcps] [--fingerprint] [--rows]
//
// Both folders must be outside this repository, so a real record, or anything read from one, can never be committed.
// Each subfolder of the records folder is one case: its files are combined in name order, as a multi-file upload or
// "Add documents" does. Each loose file is a case of its own. Names starting with "_" or "." are skipped. Nothing is
// cached (the golden-set cache is never used).
//
// What is printed and written follows the feedback export's allow-list (src/export/feedback.ts): the education
// system, country and languages, how the file was read, and course-level facts (the subject as printed, grade, grade
// level, US subject, credit, letter). The student's name, ID and date of birth and the school's name are reported
// only as found, not found or redacted. With --fingerprint, the student name is also given as a hash salted afresh on
// each run, to tell which files belong to the same student. Unread lines and flag details are never printed: either
// can quote personal data.
import { randomBytes, createHash } from 'node:crypto';
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { evaluate, READER_VERSION, runExtraction } from '../../src/core/pipeline.ts';
import type { DocTokens, Field } from '../../src/core/types.ts';
import { seedKb } from '../../src/kb/index.ts';
import { rowDoubts } from '../../src/ui/doubts.ts';
import { closeOcr, ingestFile } from './node-ingest.ts';

const READABLE = /\.(pdf|png|jpe?g|webp|gif|bmp|tiff?|heic|heif|docx|txt|csv|tsv)$/i;
const REPO = path.resolve(import.meta.dirname, '../..');

const args = process.argv.slice(2);
const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const valued = new Set(['--out', '--district']);
const positional = args.filter((a, i) => !a.startsWith('--') && !valued.has(args[i - 1] ?? ''));
const recordsDir = positional[0];
const outDir = opt('--out');
const only = positional.slice(1);
if (!recordsDir || !outDir) throw new Error('usage: npm run bulk -- <records folder> --out <report folder> [--district ky-jcps] [--fingerprint] [--rows]');

/** True when p is this repository or inside it. */
function insideRepo(p: string): boolean {
  const rel = path.relative(REPO, path.resolve(p));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}
for (const [what, p] of [['records folder', recordsDir], ['report folder', outDir]] as const)
  if (insideRepo(p)) throw new Error(`The ${what} must be outside the repository (${REPO}), so real records cannot be committed.`);

const kb = seedKb();
const districtId = opt('--district') ?? 'ky-jcps';
const district = kb.districts.find((d) => d.id === districtId);
if (!district) throw new Error(`No district "${districtId}". Known: ${kb.districts.map((d) => d.id).join(', ')}`);
// A run split over several processes shares one salt through EVALUA_BULK_SALT; it is never written anywhere.
const salt = process.env.EVALUA_BULK_SALT ? Buffer.from(process.env.EVALUA_BULK_SALT) : randomBytes(16);
const fingerprint = (v: string) => (v ? createHash('sha256').update(salt).update(v.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 8) : '');
const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const skip = (n: string) => n.startsWith('_') || n.startsWith('.');

// Cases: a folder of files, or one file.
const cases: { name: string; files: string[] }[] = [];
for (const entry of readdirSync(recordsDir).sort(natural)) {
  if (skip(entry) || (only.length && !only.some((f) => entry.includes(f)))) continue;
  const full = path.join(recordsDir, entry);
  if (statSync(full).isDirectory()) {
    const files = readdirSync(full).filter((f) => !skip(f) && READABLE.test(f)).sort(natural).map((f) => path.join(full, f));
    if (files.length) cases.push({ name: entry, files });
  } else if (READABLE.test(entry)) cases.push({ name: entry.replace(/\.[^.]+$/, ''), files: [full] });
}
if (!cases.length) throw new Error(`No readable files in ${recordsDir}`);

const presence = (f: Field<string>) => (f.redacted ? 'redacted' : f.value ? 'found' : 'not found');
const pct = (x: number) => `${Math.round(x * 100)}%`;

interface CaseReport {
  case: string;
  files: number;
  fileTypes: string[];
  pages: number;
  /** Text pieces read (OCR lines or PDF text items): a page that reads almost none was not read, whatever else it says. */
  words: number;
  engine: string;
  seconds: number;
  educationSystem: string;
  systemConfidence: number;
  country: string;
  docType: string;
  documentLanguage: string;
  instruction: { summary: string; english: boolean | null; strength: string };
  student: { name: string; dob: string; id: string; nameFingerprint?: string };
  school: string;
  aggregate?: number;
  courses: {
    n: number;
    period: string;
    level: number | null;
    term?: string;
    academicYear?: string;
    printedSubject: string;
    englishName: string;
    translation: string;
    grade: string;
    gradeConfidence: number;
    hours?: number;
    usSubject: string;
    countsToward: string;
    credits: number;
    usLetter: string;
    confidence: number;
    needsReview: boolean;
    doubts: string[];
  }[];
  totals: { earned: number; required: number; toDecide: number; doubts: number; gradeUnreadable: number; subjectNotRecognised: number };
  flags: { severity: string; title: string }[];
  /** Credit earned toward each district requirement. */
  progress: { label: string; earned: number; required: number }[];
  /** Where the student would continue in each course sequence. */
  placements: { label: string; done: string[]; continueIn: string; confidence: string }[];
  error?: string;
}

const reports: CaseReport[] = [];
mkdirSync(outDir, { recursive: true });
for (const c of cases) {
  const started = Date.now();
  const base: Pick<CaseReport, 'case' | 'files' | 'fileTypes'> = { case: c.name, files: c.files.length, fileTypes: [...new Set(c.files.map((f) => path.extname(f).slice(1).toLowerCase()))] };
  try {
    const docs: DocTokens[] = [];
    for (const f of c.files) docs.push(await ingestFile(f, false));
    let doc: DocTokens = docs[0];
    if (docs.length > 1) {
      doc = { kind: docs.some((d) => d.kind === 'ocr') ? 'ocr' : docs[0].kind, pages: [], tokens: [], engine: [...new Set(docs.map((d) => d.engine))].join(' + '), warnings: [], parts: [] };
      for (const [i, d] of docs.entries()) {
        const off = doc.pages.length;
        doc.parts!.push({ name: `file ${i + 1}`, firstPage: off });
        doc.pages.push(...d.pages);
        doc.tokens.push(...d.tokens.map((t) => ({ ...t, page: t.page + off })));
        doc.warnings.push(...d.warnings);
        if (d.redactionBars) doc.redactionBars = (doc.redactionBars ?? 0) + d.redactionBars;
        if (d.hiddenText) doc.hiddenText = { pages: [...(doc.hiddenText?.pages ?? []), ...d.hiddenText.pages.map((p) => p + off)], count: (doc.hiddenText?.count ?? 0) + d.hiddenText.count };
      }
    }
    const ex = runExtraction(doc, kb);
    const ev = evaluate(ex, kb, district);
    const rows = ex.courses.map((course, i) => {
      const s = ev.suggestions.find((x) => x.courseId === course.id);
      return {
        n: i + 1,
        period: course.period.value,
        level: course.level,
        term: course.term,
        academicYear: course.academicYear,
        printedSubject: (course.name.original ?? course.name.value).slice(0, 120),
        englishName: course.name.value.slice(0, 120),
        translation: course.translation,
        grade: course.grade.value,
        gradeConfidence: course.grade.confidence,
        hours: course.hours?.value,
        usSubject: s?.conceptLabel ?? '',
        countsToward: s?.requirementLabel ?? '',
        credits: s?.credits ?? 0,
        usLetter: s?.grade.letter ?? '',
        confidence: s?.confidence ?? 0,
        needsReview: s?.needsReview ?? false,
        doubts: rowDoubts(course, s).map((d) => d.text),
      };
    });
    reports.push({
      ...base,
      pages: doc.pages.length,
      words: doc.tokens.length,
      engine: doc.engine,
      seconds: Math.round((Date.now() - started) / 1000),
      educationSystem: ex.systemId.value,
      systemConfidence: ex.systemId.confidence,
      country: ex.country.value,
      docType: ex.docType,
      documentLanguage: ex.language,
      instruction: { summary: ev.instruction.summary, english: ev.instruction.english, strength: ev.instruction.strength },
      student: { name: presence(ex.student.name), dob: presence(ex.student.dob), id: presence(ex.student.id), ...(args.includes('--fingerprint') ? { nameFingerprint: fingerprint(ex.student.name.value) } : {}) },
      school: presence(ex.school.name),
      aggregate: ex.aggregate?.value,
      courses: rows,
      totals: {
        earned: ev.totalEarned,
        required: ev.totalRequired,
        toDecide: rows.filter((r) => r.needsReview).length,
        doubts: rows.filter((r) => r.doubts.length).length,
        gradeUnreadable: rows.filter((r) => !r.grade).length,
        subjectNotRecognised: rows.filter((r) => r.doubts.includes('Subject not recognised')).length,
      },
      flags: ev.flags.map((f) => ({ severity: f.severity, title: f.title })),
      progress: ev.progress.map((p) => ({ label: p.label, earned: p.earned, required: p.required })),
      placements: ev.placements.map((p) => ({ label: p.label, done: p.completed, continueIn: p.continueIn?.title ?? '', confidence: String(p.confidence) })),
    });
  } catch (e) {
    reports.push({ ...base, pages: 0, words: 0, engine: '', seconds: Math.round((Date.now() - started) / 1000), educationSystem: '', systemConfidence: 0, country: '', docType: '', documentLanguage: '', instruction: { summary: '', english: null, strength: '' }, student: { name: '', dob: '', id: '' }, school: '', courses: [], totals: { earned: 0, required: 0, toDecide: 0, doubts: 0, gradeUnreadable: 0, subjectNotRecognised: 0 }, flags: [], progress: [], placements: [], error: (e as Error).message.slice(0, 200) });
  }
  const r = reports.at(-1)!;
  console.log(r.error ? `✗ ${r.case}: ${r.error}` : `✓ ${r.case}: ${r.files} file(s), ${r.pages} page(s), ${r.words} text pieces, ${r.educationSystem} (${pct(r.systemConfidence)}) · ${r.country} · ${r.courses.length} courses · ${r.seconds}s`);
}
await closeOcr();

// Reports: one per case (what a counselor would otherwise screenshot from the case view), a summary of all cases,
// and one JSON with everything.
const day = new Date().toISOString().slice(0, 10);
const all = reports.flatMap((r) => r.courses);
const meta = { format: 'evalua-bulk/1', run: day, readerVersion: READER_VERSION, district: district.id, cases: reports.length };
const stem = `bulk-${day}${only.length ? `-${only.join('-').replace(/[^\w-]+/g, '_')}` : ''}`;
writeFileSync(path.join(outDir, `${stem}.json`), JSON.stringify({ ...meta, reports }, null, 2) + '\n');

const cell = (s: string) => s.replace(/\|/g, '/').replace(/\n/g, ' ');
const fileOf = (r: CaseReport) => `${r.case.replace(/[^\w.-]+/g, '_')}.md`;

/** One transcript's report: everything evalua read and suggested, as it read it. */
function caseReport(r: CaseReport): string {
  let md = `# ${r.case}\n\nevalua bulk analysis, ${day} · district ${district.name} · reader version ${READER_VERSION}\n\n`;
  md += `This is evalua's own reading, unchanged. Student and school fields are shown only as found / not found / redacted.\n\n`;
  if (r.error) return md + `**Could not be read:** ${r.error}\n`;
  md += `## The record\n\n| | |\n|---|---|\n`;
  md += `| Files | ${r.files} (${r.fileTypes.join(', ')}), ${r.pages} page(s) |\n| Read with | ${r.engine} · ${r.words} text pieces read · ${r.seconds} s |\n`;
  md += `| Education system | ${r.educationSystem} (${pct(r.systemConfidence)}) · ${cell(r.docType)} |\n| Country | ${r.country || 'not found'} |\n`;
  md += `| Document language | ${r.documentLanguage || '—'} |\n| Language of instruction | ${cell(r.instruction.summary)} (${r.instruction.strength}) |\n`;
  if (r.aggregate != null) md += `| Aggregate printed | ${r.aggregate} |\n`;
  md += `| Student name / DOB / ID | ${r.student.name} / ${r.student.dob} / ${r.student.id} |\n| School | ${r.school} |\n`;
  md += `\n## Summary\n\n${r.courses.length} courses · ${r.totals.earned} of ${r.totals.required} credits · ${r.totals.toDecide} to decide · ${r.totals.doubts} with doubts · ${r.totals.gradeUnreadable} grades unreadable · ${r.totals.subjectNotRecognised} subjects not recognised\n`;
  if (r.courses.length) {
    md += `\n## Courses\n\n| # | Period | Level | Printed subject | English name | Grade | US subject | Counts toward | Credits | US letter | Conf. | Doubts |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
    for (const c of r.courses) md += `| ${c.n} | ${cell(c.period) || '—'}${c.term ? ` T${c.term}` : ''}${c.academicYear ? ` ${c.academicYear}` : ''} | ${c.level ?? '?'} | ${cell(c.printedSubject)} | ${cell(c.englishName)}${c.translation === 'none' ? '' : ` (${c.translation})`} | ${cell(c.grade) || '—'} (${pct(c.gradeConfidence)})${c.hours ? ` · ${c.hours} h` : ''} | ${cell(c.usSubject)} | ${cell(c.countsToward)}${c.needsReview ? ' (to decide)' : ''} | ${c.credits} | ${c.usLetter || '—'} | ${pct(c.confidence)} | ${c.doubts.join('; ')} |\n`;
  }
  if (r.progress.length) {
    md += `\n## Toward the diploma\n\n| Requirement | Earned | Required |\n|---|---|---|\n`;
    for (const p of r.progress) md += `| ${cell(p.label)} | ${p.earned} | ${p.required} |\n`;
  }
  if (r.placements.length) {
    md += `\n## Placement\n\n| Sequence | Completed | Continue in | Confidence |\n|---|---|---|---|\n`;
    for (const p of r.placements) md += `| ${cell(p.label)} | ${cell(p.done.join(', ')) || '—'} | ${cell(p.continueIn) || '—'} | ${p.confidence} |\n`;
  }
  if (r.flags.length) {
    md += `\n## Items to verify\n\n`;
    for (const f of r.flags) md += `- ${cell(f.title)} (${f.severity})\n`;
  }
  return md;
}
for (const r of reports) writeFileSync(path.join(outDir, fileOf(r)), caseReport(r));

let md = `# Bulk analysis, ${day}\n\nDistrict: ${district.name}. Reader version ${READER_VERSION}. ${reports.length} cases, ${all.length} courses. One report per case is linked below.\n\n`;
md += `Student and school fields are shown only as found / not found / redacted.\n\n`;
md += `| Case | Files | Pages | Text pieces | Read with | System | Country | Courses | Grade unreadable | Subject not recognised | Rows with doubts | To decide | Credits | Name | DOB | ID | School |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const r of reports) {
  const link = `[${r.case}](${fileOf(r)})`;
  if (r.error) md += `| ${link} | ${r.files} | — | — | error: ${cell(r.error)} |||||||||||||\n`;
  else md += `| ${link} | ${r.files} | ${r.pages} | ${r.words} | ${r.engine} | ${r.educationSystem} (${pct(r.systemConfidence)}) | ${r.country} | ${r.courses.length} | ${r.totals.gradeUnreadable} | ${r.totals.subjectNotRecognised} | ${r.totals.doubts} | ${r.totals.toDecide} | ${r.totals.earned}/${r.totals.required} | ${r.student.name}${r.student.nameFingerprint ? ` ${r.student.nameFingerprint}` : ''} | ${r.student.dob} | ${r.student.id} | ${r.school} |\n`;
}
writeFileSync(path.join(outDir, `${stem}.md`), md);
console.log(`\n${reports.length} cases · ${all.length} courses · grade unreadable ${all.filter((c) => !c.grade).length} · subject not recognised ${all.filter((c) => c.doubts.includes('Subject not recognised')).length} · to decide ${all.filter((c) => c.needsReview).length}`);
console.log(`wrote ${path.join(outDir, `${stem}.md`)} and .json`);
if (args.includes('--rows')) for (const r of reports) for (const c of r.courses) console.log(`  ${r.case} #${c.n} [${c.period || '—'} L${c.level ?? '?'}] ${c.printedSubject} => ${c.grade || '—'} → ${c.usSubject} / ${c.countsToward} / ${c.credits} cr / ${c.usLetter || '—'}${c.doubts.length ? ` · ${c.doubts.join('; ')}` : ''}`);
