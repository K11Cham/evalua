// Browser check: drives the built app in headless Chromium, uploads fake transcripts through the real
// interface, and confirms the in-browser pipeline (pdf.js, Word reader, OCR worker) finds the courses.
//   npm run build && npm run eval:browser [-- filter] [--shots <dir>]
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import type { Truth } from '../fakegen/types.ts';

const args = process.argv.slice(2);
const shotsAt = args.indexOf('--shots');
const shots = shotsAt >= 0 ? args[shotsAt + 1] : '';
const filters = args.filter((a, i) => !a.startsWith('-') && i !== shotsAt + 1);
const DEFAULT = ['gm-wassce.pdf', 'gm-gabece.scan.jpg', 'ng-jamb.photo.jpg', 'gh-shs.docx', 'mx-sep.photo.jpg', 'cn-gaozhong.photo.jpg', 'fr-lycee.scan.pdf', 'kr-record.scan.jpg', 'eg-thanaweya.scan.png', 'ru-attestat.pdf', 'br-historico.docx', 'in-hindi-board.scan.jpg'];
const manifest = JSON.parse(readFileSync('fixtures/fake/manifest.json', 'utf8')) as Truth[];
const targets = manifest.filter((m) => (filters.length ? filters.some((f) => m.file.includes(f)) : DEFAULT.includes(m.file)));
const PORT = 4173;

const server = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', shell: process.platform === 'win32' });
const stop = () => server.kill();
process.on('exit', stop);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://localhost:${PORT}/`)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('preview server did not start');
}

await waitForServer();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await ctx.newPage();
const external: string[] = [];
page.on('request', (r) => {
  const u = new URL(r.url());
  if (!['localhost', '127.0.0.1'].includes(u.hostname) && !/^(blob|data):/.test(r.url())) external.push(r.url());
});
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
if (shots) mkdirSync(shots, { recursive: true });

let failed = 0;
for (const t of targets) {
  const t0 = Date.now();
  await page.goto(`http://localhost:${PORT}/#/`);
  await page.waitForSelector('input[type=file]', { state: 'attached' });
  await page.setInputFiles('input[type=file]', path.resolve('fixtures/fake', t.file));
  await page.waitForURL(/#\/case\//);
  try {
    await page.waitForSelector('#courses-h, [role=alert]', { timeout: 180_000 });
  } catch {
    // fall through to the count check
  }
  const rows = await page.locator('table.courses input.name-en').count();
  const student = (await page.locator('.case-head h1').textContent()) ?? '';
  const ok = rows >= Math.floor(t.courses.length * 0.85);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${t.file.padEnd(26)} courses ${String(rows).padStart(3)}/${t.courses.length}  student “${student.trim()}”  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (shots) await page.screenshot({ path: path.join(shots, `${t.file}.png`), fullPage: false });
}

if (shots) {
  // Other screens, for a visual check.
  await page.goto(`http://localhost:${PORT}/#/`);
  await page.waitForSelector('table.ledger');
  await page.screenshot({ path: path.join(shots, '_dashboard.png') });
  await page.locator('table.ledger a.rowlink').first().click();
  await page.waitForSelector('#courses-h');
  await page.locator('table.courses button:has-text("Why")').first().click();
  await page.locator('table.courses .locate').nth(1).click();
  await page.screenshot({ path: path.join(shots, '_case.png') });
  await page.locator('a:has-text("Report")').first().click();
  await page.waitForSelector('article.report');
  await page.screenshot({ path: path.join(shots, '_report.png'), fullPage: true });
  await page.pdf({ path: path.join(shots, '_report.pdf'), format: 'Letter' });
  await page.goto(`http://localhost:${PORT}/#/reference/waec`);
  await page.waitForSelector('article');
  await page.screenshot({ path: path.join(shots, '_reference.png') });
  await page.goto(`http://localhost:${PORT}/#/districts`);
  await page.waitForSelector('table.ledger');
  await page.screenshot({ path: path.join(shots, '_districts.png') });
}

await browser.close();
stop();
console.log(`\n${targets.length - failed}/${targets.length} files read correctly in the browser.`);
console.log(external.length ? `REQUESTS TO OTHER SITES (${external.length}):\n  ${[...new Set(external)].join('\n  ')}` : 'No requests left the local site.');
if (errors.length) console.log(`Page errors:\n  ${[...new Set(errors)].join('\n  ')}`);
process.exit(failed || external.length ? 1 : 0);
