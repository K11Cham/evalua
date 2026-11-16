// Takes the README screenshots from fictitious records only.
//   npm run build && npx tsx tools/eval/hero.ts [--base <url>] [--out docs/screenshots]
// review.png: the Gambian term report (fake) evaluated at JCPS, with one suggestion's reasoning open,
// beside the original; placement.png: the placement panel for the same case.
import path from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const BASE = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:4173';
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'docs/screenshots';
const FILE = path.resolve('fixtures/fake/gm-termreport.pdf');

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 1 })).newPage();
await page.goto(`${BASE}/#/`);
await page.waitForSelector('input[type=file]', { state: 'attached' });
await page.setInputFiles('input[type=file]', FILE);
await page.waitForURL(/#\/case\//);
await page.waitForSelector('#courses-h', { timeout: 180_000 });
const district = await page.locator('.case-head select').first().evaluate((s) => (s as HTMLSelectElement).selectedOptions[0]?.textContent ?? '');
if (!/Jefferson/.test(district)) throw new Error(`case is not at JCPS: ${district}`);

// The counselor has confirmed the earlier terms of the year, so the second-term report counts as two thirds of it.
await page.locator('#placement input[type=checkbox]').first().check();
await page.waitForTimeout(300);
// Open the reasoning for Mathematics, the row whose credit depends on the term share and the course sequence.
const maths = page.locator('table.courses tbody tr', { has: page.locator('input.name-en[value="Mathematics"]') }).first();
await maths.locator('button:has-text("Why")').click();
await page.waitForTimeout(300);
await page.evaluate(() => {
  const h = document.querySelector('#courses-h')!;
  window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 70);
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, 'review.png') });

await page.locator('#placement').scrollIntoViewIfNeeded();
await page.locator('#placement').screenshot({ path: path.join(OUT, 'placement.png') });
console.log(`wrote ${OUT}/review.png and ${OUT}/placement.png (${district.trim()})`);
await browser.close();
