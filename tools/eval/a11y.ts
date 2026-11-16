// Accessibility and tablet check: runs axe (WCAG 2.1 A and AA rules) on every page of the app, at desktop width
// and at 820 px (a tablet held upright), and reports any page that scrolls sideways. Fictitious records only.
//   npm run build && npm run eval:a11y [-- --base <url>] [--shots <dir>]
import AxeBuilder from '@axe-core/playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const args = process.argv.slice(2);
const remote = args.includes('--base') ? args[args.indexOf('--base') + 1] : '';
const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : '';
const PORT = 4174;
const BASE = remote || `http://localhost:${PORT}`;
const server = remote ? null : spawn(`npx vite preview --port ${PORT} --strictPort`, { stdio: 'ignore', shell: true });
process.on('exit', () => server?.kill());
for (let i = 0; i < 80; i++) {
  try {
    if ((await fetch(`${BASE}/`)).ok) break;
  } catch {
    // not up yet
  }
  await new Promise((r) => setTimeout(r, 250));
}
if (shots) mkdirSync(shots, { recursive: true });

const browser = await chromium.launch();
let failures = 0;

async function check(page: Page, name: string, width: number) {
  await page.waitForTimeout(300);
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const problems = res.violations.map((v) => `${v.impact ?? ''} ${v.id} (${v.nodes.length}): ${v.help} — ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
  if (overflow > 1) {
    // Name the widest elements that reach past the window and are not inside a scrolling box of their own.
    // A string, so the bundler's helpers never end up inside the page.
    const wide = await page.evaluate<string[]>(`(() => {
      const w = document.documentElement.clientWidth;
      const scrolls = (el) => !!el && el !== document.body && ((getComputedStyle(el).overflowX !== 'visible' && el.scrollWidth > el.clientWidth) || scrolls(el.parentElement));
      return [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > w + 1 && !scrolls(el.parentElement))
        .map((el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).join('.') : '') + ' (' + Math.round(el.getBoundingClientRect().right) + ')')
        .slice(0, 4);
    })()`);
    problems.push(`scrolls sideways by ${overflow}px: ${wide.join(', ')}`);
  }
  failures += problems.length;
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${String(width).padEnd(5)} ${name}${problems.map((p) => `\n       ${p}`).join('')}`);
  if (shots) await page.screenshot({ path: path.join(shots, `${width}-${name.replace(/\W+/g, '-')}.png`), fullPage: true });
}

for (const width of [1440, 820]) {
  const page = await (await browser.newContext({ viewport: { width, height: width > 1000 ? 900 : 1180 } })).newPage();
  page.on('pageerror', (e) => {
    failures++;
    console.log(`FAIL page error: ${e.message}`);
  });
  await page.goto(`${BASE}/#/`);
  await page.waitForSelector('input[type=file]', { state: 'attached' });
  await check(page, 'cases (empty)', width);
  await page.setInputFiles('input[type=file]', path.resolve('fixtures/fake/gm-termreport.pdf'));
  await page.waitForURL(/#\/case\//);
  await page.waitForSelector('#courses-h', { timeout: 180_000 });
  const caseUrl = page.url();
  await check(page, 'case', width);
  await page.locator('table.courses button:has-text("Why")').first().click();
  await check(page, 'case with reasoning open', width);
  await page.locator('a:has-text("Report")').first().click();
  await page.waitForSelector('article.report');
  await check(page, 'report', width);
  // A record of several years and terms: year and term headings, folded years, filters.
  await page.goto(`${BASE}/#/`);
  await page.waitForSelector('input[type=file]', { state: 'attached' });
  await page.setInputFiles('input[type=file]', path.resolve('fixtures/fake/mx-sep.pdf'));
  await page.waitForURL(/#\/case\//);
  await page.waitForSelector('#courses-h', { timeout: 180_000 });
  await check(page, 'case with several years', width);
  await page.locator('button:has-text("Next to decide")').click();
  await page.locator('.filters button:has-text("To decide")').click();
  await check(page, 'case filtered to decide', width);
  for (const [route, name] of [['#/', 'cases (one case)'], ['#/districts', 'districts'], ['#/districts/ky-jcps', 'district: JCPS'], ['#/reference', 'reference'], ['#/reference/waec', 'reference: WAEC'], ['#/settings', 'settings'], ['#/privacy', 'privacy']]) {
    await page.goto(`${BASE}/${route}`);
    await page.waitForSelector('main h1, main h2');
    await check(page, name, width);
  }
  await page.goto(caseUrl);
  await page.close();
}
await browser.close();
console.log(failures ? `\n${failures} problem(s).` : '\nNo axe violations and no sideways scrolling.');
process.exit(failures ? 1 : 0);
