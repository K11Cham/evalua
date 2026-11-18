// Generates the fake transcript fixtures and their ground-truth files.
//   npm run fakes            → regenerate everything into fixtures/fake/
//   npm run fakes -- mx-sep  → only matching ids
// Output is deterministic (seeded) so re-running does not churn the repo.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser } from 'playwright';
import sharp from 'sharp';
import * as docx from 'docx';
import { specsA } from './specs-a.ts';
import { specsB } from './specs-b.ts';
import { specsC } from './specs-c.ts';
import { BAR, buildTables, LEAK, pagesOf, photoSceneHtml, scanPdfHtml, specHtml } from './render.ts';
import type { FakeSpec, Format, Redaction, Truth, TruthCourse } from './types.ts';

const OUT = path.resolve('fixtures/fake');
export const allSpecs: FakeSpec[] = [...specsA, ...specsB, ...specsC];

function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function truthCourses(spec: FakeSpec): TruthCourse[] {
  return spec.years.flatMap((y) =>
    y.courses.map((c) => ({
      name: c.n, en: c.en, grade: c.g, credits: c.cr, hours: c.h,
      year: y.label, level: y.level, term: y.term, concept: c.k, us: c.us,
    })),
  );
}

async function noise(width: number, height: number, sigma: number, rand: () => number): Promise<Buffer> {
  const buf = Buffer.alloc(width * height);
  for (let i = 0; i < buf.length; i++) {
    const g = (rand() + rand() + rand() - 1.5) * 2 * sigma;
    buf[i] = Math.max(0, Math.min(255, 128 + g));
  }
  return sharp(buf, { raw: { width, height, channels: 1 } }).png().toBuffer();
}

async function pagePngs(browser: Browser, spec: FakeSpec): Promise<Buffer[]> {
  const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  const out: Buffer[] = [];
  const n = pagesOf(spec).length;
  for (let i = 0; i < n; i++) {
    const page = await ctx.newPage();
    await page.setContent(specHtml(spec, { onlyPage: i }), { waitUntil: 'load' });
    out.push(await page.screenshot({ fullPage: true, type: 'png' }));
    await page.close();
  }
  await ctx.close();
  return out;
}

async function degradeScan(png: Buffer, rand: () => number): Promise<ReturnType<typeof sharp>> {
  const angle = (rand() - 0.5) * 2.4;
  const rotated = await sharp(png).grayscale().rotate(angle, { background: '#ffffff' }).blur(0.55).toBuffer();
  const meta = await sharp(rotated).metadata();
  const n = await noise(meta.width!, meta.height!, 26, rand);
  return sharp(rotated).composite([{ input: n, blend: 'soft-light' }]).linear(0.93, 8);
}

async function makePhoto(browser: Browser, png: Buffer, rand: () => number): Promise<Buffer> {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 1340 }, deviceScaleFactor: 1.6 });
  const page = await ctx.newPage();
  const v = {
    rx: 9 + rand() * 9, ry: (rand() - 0.5) * 16, rz: (rand() - 0.5) * 9,
    glareX: 25 + rand() * 50, glareY: 20 + rand() * 55, warm: 0.12 + rand() * 0.15,
  };
  await page.setContent(photoSceneHtml(`data:image/png;base64,${png.toString('base64')}`, v), { waitUntil: 'load' });
  const shot = await page.screenshot({ type: 'png' });
  await ctx.close();
  const meta = await sharp(shot).metadata();
  const n = await noise(meta.width!, meta.height!, 18, rand);
  return sharp(shot).blur(0.7).composite([{ input: n, blend: 'soft-light' }]).jpeg({ quality: 70 }).toBuffer();
}

function makeDocx(spec: FakeSpec): Promise<Buffer> {
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType } = docx;
  const para = (text: string, o: { bold?: boolean; size?: number; center?: boolean; after?: number } = {}) =>
    new Paragraph({
      alignment: o.center ? AlignmentType.CENTER : AlignmentType.START,
      bidirectional: spec.rtl,
      spacing: { after: o.after ?? 60 },
      children: [new TextRun({ text, bold: o.bold, size: o.size ?? 20 })],
    });
  const children: (docx.Paragraph | docx.Table)[] = [];
  spec.issuer.forEach((l, i) => children.push(para(l, { bold: true, center: true, size: i === 0 ? 26 : 20 })));
  children.push(para(spec.title, { bold: true, center: true, size: 30, after: 80 }));
  if (spec.subtitle) children.push(para(spec.subtitle, { center: true, after: 160 }));
  for (const i of spec.info) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: `${i.label}: `, size: 20 }), new TextRun({ text: i.value, bold: true, size: 20 })],
      }),
    );
  }
  for (const t of buildTables(spec)) {
    children.push(para(t.heading ?? '', { bold: true, after: 60 }));
    const mk = (cells: { t: string; span?: number }[], bold: boolean) =>
      new TableRow({
        children: cells.map(
          (c) =>
            new TableCell({
              columnSpan: c.span && c.span > 1 ? c.span : undefined,
              children: [new Paragraph({ children: [new TextRun({ text: c.t, bold, size: 18 })] })],
            }),
        ),
      });
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [...t.head.map((r) => mk(r, true)), ...t.body.map((r) => mk(r, false))],
      }),
    );
  }
  for (const n of spec.notes ?? []) children.push(para(n, { size: 18 }));
  for (const s of spec.signatures ?? []) children.push(para(`______________________  ${s}`, { size: 18, after: 120 }));
  children.push(para(spec.specimen, { center: true, size: 14 }));
  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}

// Expected language of instruction by system, as the knowledge base states it (null where it varies by school).
const ENGLISH_BY_SYSTEM: Record<string, boolean | null> = {
  waec: true, gabece: true, jamb: true, uk: true, 'in-cisce': true, ib: null, 'in-cbse': null, 'ph-k12': null, generic: null,
};

// null (not knowable) must stay null: not `?? false`.
const expectedEnglish = (system: string): boolean | null => (system in ENGLISH_BY_SYSTEM ? ENGLISH_BY_SYSTEM[system] : false);

/** The record with the student's name, date of birth and ID removed in the given style. */
function redacted(spec: FakeSpec, style: Redaction, format: Format): FakeSpec {
  const hide = (v: string) =>
    style === 'bar' ? (format === 'docx' ? '█'.repeat(Math.max(6, v.length)) : BAR(Math.max(6, v.length))) : style === 'leak' ? LEAK(v) : style === 'xxxx' ? 'X'.repeat(Math.max(6, v.length)) : style === 'tag' ? '[REDACTED]' : '';
  const roles = new Set(['name', 'dob', 'id']);
  return {
    ...spec,
    info: spec.info.map((i) => (i.role && roles.has(i.role) ? { ...i, value: hide(i.value) } : i)),
    student: { ...spec.student, name: hide(spec.student.name) },
  };
}

const EXT: Record<Format, string> = {
  pdf: 'pdf', 'scan-jpg': 'scan.jpg', 'scan-png': 'scan.png', 'scan-pdf': 'scan.pdf', 'photo-jpg': 'photo.jpg', docx: 'docx',
};

async function main() {
  // --variants-only: write only the redacted variants of the matching records, leaving their original files as they are.
  const variantsOnly = process.argv.includes('--variants-only');
  const filter = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const specs = allSpecs.filter((s) => !filter.length || filter.some((f) => s.id.includes(f)));
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const manifest: Truth[] = [];
  // Each record, then its redacted variants, each in its own formats.
  const jobs: { spec: FakeSpec; base: FakeSpec; formats: Format[]; suffix: string; redact?: Redaction }[] = [];
  for (const spec of specs) {
    if (!variantsOnly) jobs.push({ spec, base: spec, formats: spec.formats, suffix: '' });
    for (const v of spec.variants ?? []) jobs.push({ spec, base: spec, formats: v.formats, suffix: `.${v.suffix}`, redact: v.redact });
  }
  for (const job of jobs) {
    // A variant gets the original's seed, so its scan or photo has the same angle, glare and noise: the only
    // difference from the original is the redaction.
    const rand = rng(job.base.id);
    for (const format of job.formats) {
      const spec = job.redact ? redacted(job.base, job.redact, format) : job.base;
      const pngs = await pagePngs(browser, spec);
      const file = `${spec.id}${job.suffix}.${EXT[format]}`;
      let data: Buffer;
      let pages = pngs.length;
      if (format === 'pdf') {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await page.setContent(specHtml(spec), { waitUntil: 'load' });
        data = await page.pdf({ format: 'A4', printBackground: true });
        await ctx.close();
      } else if (format === 'scan-jpg') {
        data = await (await degradeScan(pngs[0], rand)).jpeg({ quality: 72 }).toBuffer();
        pages = 1;
      } else if (format === 'scan-png') {
        data = await (await degradeScan(pngs[0], rand)).png({ compressionLevel: 9, palette: true, colours: 64 }).toBuffer();
        pages = 1;
      } else if (format === 'scan-pdf') {
        const urls: string[] = [];
        for (const p of pngs) {
          const j = await (await degradeScan(p, rand)).jpeg({ quality: 70 }).toBuffer();
          urls.push(`data:image/jpeg;base64,${j.toString('base64')}`);
        }
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await page.setContent(scanPdfHtml(urls), { waitUntil: 'load' });
        data = await page.pdf({ format: 'A4', printBackground: true });
        await ctx.close();
      } else if (format === 'photo-jpg') {
        data = await makePhoto(browser, pngs[0], rand);
        pages = 1;
      } else {
        data = await makeDocx(spec);
        pages = 1;
      }
      await writeFile(path.join(OUT, file), data);
      // Raster formats that only capture page 1 carry only page-1 courses in their truth.
      const firstPageOnly = pages === 1 && pngs.length > 1 && format !== 'docx';
      const firstPageYears = new Set(
        firstPageOnly ? pagesOf(spec)[0].map((t) => t.heading) : [],
      );
      const courses = truthCourses(spec).filter((c) => !firstPageOnly || firstPageYears.has(c.year));
      manifest.push({
        id: spec.id, file, format, system: spec.system, country: spec.country, lang: spec.lang, pages,
        // A redacted file's student details must read as not found.
        student: job.redact ? { name: '', dob: '', id: '' } : job.base.student, school: spec.school, courses,
        instruction: job.base.instruction ?? { english: expectedEnglish(spec.system) },
        redacted: job.redact,
      });
      console.log(`  ${file}  (${(data.length / 1024).toFixed(0)} KB, ${courses.length} courses)`);
    }
  }
  await browser.close();
  // A filtered run updates only its own entries, so new records can be added without regenerating (and so slightly
  // re-rendering) every existing fixture.
  const file = path.join(OUT, 'manifest.json');
  const kept: Truth[] = filter.length ? (JSON.parse(await readFile(file, 'utf8')) as Truth[]).filter((t) => !manifest.some((m) => m.file === t.file)) : [];
  const all = [...kept, ...manifest].sort((a, b) => allSpecs.findIndex((s) => s.id === a.id) - allSpecs.findIndex((s) => s.id === b.id) || a.file.localeCompare(b.file));
  // Every truth entry says what language of instruction to expect.
  for (const t of all) t.instruction = allSpecs.find((x) => x.id === t.id)?.instruction ?? { english: expectedEnglish(t.system) };
  await writeFile(file, JSON.stringify(all, null, 1) + '\n');
  console.log(`\n${manifest.length} files written; manifest has ${all.length} → ${OUT}`);
}

if (process.argv[1]?.endsWith('generate.ts')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
