// OCR benchmark over the fake raster transcripts.
//   node bench.mjs <engine>     engines: paddle-tiny | paddle-small | paddle-medium | tesseract | ollama:<model> | docling
//   node bench.mjs report       → writes ../../docs/OCR_BENCHMARK.md from results/*.json
// Scores each engine on how many course names and (name, grade) rows it recovers.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const FIX = path.resolve('../../fixtures/fake');
const manifest = JSON.parse(readFileSync(path.join(FIX, 'manifest.json'), 'utf8'));
const rasters = manifest.filter((m) => /\.(jpg|png)$/.test(m.file));

const DIGITS = { '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9, '०': 0, '१': 1, '२': 2, '३': 3, '४': 4, '५': 5, '६': 6, '७': 7, '८': 8, '९': 9 };
const norm = (s) =>
  s.normalize('NFKC').toLowerCase().replace(/[٠-٩०-९]/g, (d) => DIGITS[d]).replace(/[^\p{L}\p{N}]/gu, '');
const tokens = (s) =>
  s.normalize('NFKC').replace(/[٠-٩०-९]/g, (d) => DIGITS[d]).replace(/,(\d)/g, '.$1').split(/[\s|()]+/).filter(Boolean);

/** Smallest edit distance between `needle` and any substring of `hay` (Sellers). */
function partialDistance(needle, hay) {
  let prev = new Array(hay.length + 1).fill(0);
  for (let i = 1; i <= needle.length; i++) {
    const cur = [i];
    for (let j = 1; j <= hay.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (needle[i - 1] === hay[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return Math.min(...prev);
}

function score(truth, lines) {
  const all = norm(lines.join('\n'));
  const nlines = lines.map(norm);
  let exact = 0, fuzzy = 0, row = 0;
  for (const c of truth.courses) {
    const n = norm(c.name);
    if (all.includes(n)) exact++;
    let best = 0, bestLine = -1;
    nlines.forEach((l, i) => {
      if (!l) return;
      const sim = 1 - partialDistance(n, l) / n.length;
      if (sim > best) { best = sim; bestLine = i; }
    });
    if (best >= 0.8) {
      fuzzy++;
      const want = c.grade.replace(',', '.').replace(/^0+(\d)/, '$1');
      const rowTokens = nlines
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => l && 1 - partialDistance(n, l) / n.length >= 0.8)
        .flatMap(({ i }) => tokens(lines[i]).map((t) => t.replace(/^0+(\d)/, '$1')));
      if (rowTokens.some((t) => t.toLowerCase() === want.toLowerCase())) row++;
    }
  }
  const student = all.includes(norm(truth.student.name.split(' ').slice(-1)[0]));
  return { n: truth.courses.length, exact, fuzzy, row, student };
}

const TESS_LANG = { en: 'eng', es: 'spa', 'zh-Hans': 'chi_sim', ko: 'kor', vi: 'vie', ar: 'ara', ru: 'rus', hi: 'hin+eng', 'pt-BR': 'por', fr: 'fra', de: 'deu' };

async function makeEngine(name) {
  if (name === 'pscript') {
    // PP-OCRv6 small for Latin + Chinese; PP-OCRv5 per-script recognisers elsewhere (script supplied).
    const p = await import('ppu-paddle-ocr');
    const pick = { ko: p.V5_KOREAN_MOBILE_MODEL, ru: p.V5_CYRILLIC_MOBILE_MODEL, ar: p.V5_ARABIC_MOBILE_MODEL, hi: p.V5_DEVANAGARI_MOBILE_MODEL, vi: p.V5_LATIN_MOBILE_MODEL };
    const svcs = new Map();
    return {
      run: async (buf, truth) => {
        const model = pick[truth.lang] ?? p.V6_SMALL_MODEL;
        if (!svcs.has(model)) { const s = new p.PaddleOcrService({ model }); await s.initialize(); svcs.set(model, s); }
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        const r = await svcs.get(model).recognize(ab);
        return r.lines.map((segs) => segs.map((s) => s.text).join(' '));
      },
      close: async () => { for (const s of svcs.values()) await s.destroy(); },
    };
  }
  if (name.startsWith('paddle-')) {
    const p = await import('ppu-paddle-ocr');
    const model = { 'paddle-tiny': p.V6_TINY_MODEL, 'paddle-small': p.V6_SMALL_MODEL, 'paddle-medium': p.V6_MEDIUM_MODEL }[name];
    const svc = new p.PaddleOcrService({ model });
    await svc.initialize();
    return {
      run: async (buf) => {
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        const r = await svc.recognize(ab);
        return r.lines.map((segs) => segs.map((s) => s.text).join(' '));
      },
      close: () => svc.destroy(),
    };
  }
  if (name === 'tesseract' || name === 'tesseract-psm6' || name === 'tesseract-sparse') {
    const { createWorker } = await import('tesseract.js');
    const workers = new Map();
    return {
      run: async (buf, truth) => {
        const lang = truth.id === 'in-cbse' ? 'eng+hin' : TESS_LANG[truth.lang];
        if (!workers.has(lang)) workers.set(lang, await createWorker(lang.split('+'), 1, { cachePath: path.resolve('.tess-cache') }));
        const w = workers.get(lang);
        if (name === 'tesseract') return (await w.recognize(buf)).data.text.split('\n');
        await w.setParameters({ tessedit_pageseg_mode: name === 'tesseract-psm6' ? '6' : '11' });
        const { data } = await w.recognize(buf, {}, { blocks: true });
        // Rebuild visual rows from word boxes (sparse mode emits one word per line).
        const words = [];
        for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const wd of l.words) words.push(wd);
        words.sort((a, b) => (a.bbox.y0 + a.bbox.y1) / 2 - (b.bbox.y0 + b.bbox.y1) / 2);
        const rows = [];
        for (const wd of words) {
          const cy = (wd.bbox.y0 + wd.bbox.y1) / 2, h = wd.bbox.y1 - wd.bbox.y0;
          const row = rows.find((r) => Math.abs(r.cy - cy) < Math.max(r.h, h) * 0.5);
          if (row) { row.words.push(wd); row.cy = (row.cy * (row.words.length - 1) + cy) / row.words.length; }
          else rows.push({ cy, h, words: [wd] });
        }
        return rows.map((r) => r.words.sort((a, b) => a.bbox.x0 - b.bbox.x0).map((x) => x.text).join(' '));
      },
      close: async () => { for (const w of workers.values()) await w.terminate(); },
    };
  }
  if (name.startsWith('ollama:')) {
    const model = name.slice(7);
    return {
      run: async (buf) => {
        const res = await fetch('http://127.0.0.1:11434/api/generate', {
          method: 'POST',
          body: JSON.stringify({
            model, stream: false, images: [buf.toString('base64')],
            prompt: model.startsWith('glm-ocr') ? 'Text Recognition:' : 'Transcribe all text in this document exactly as written. Output each table row on its own line with cells separated by " | ". Do not translate. Do not add commentary.',
            options: { temperature: 0, num_predict: 4096 },
          }),
        });
        const j = await res.json();
        if (j.error) throw new Error(j.error);
        return j.response.split('\n');
      },
      close: () => {},
    };
  }
  if (name === 'docling') {
    return {
      run: async (_buf, truth) => {
        const out = execFileSync(path.resolve('.venv/Scripts/python.exe'), ['docling_run.py', path.join(FIX, truth.file)], { encoding: 'utf8', maxBuffer: 1 << 26 });
        return out.split('\n');
      },
      close: () => {},
    };
  }
  throw new Error('unknown engine ' + name);
}

function report() {
  const dir = 'results';
  const engines = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')));
  const pct = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '—');
  let md = '';
  md += '| Engine | Course names found (exact) | Course names found (≥80% similar) | Name + grade on the same row | Median s/page | Failures |\n|---|---|---|---|---|---|\n';
  for (const e of engines) {
    const ok = e.files.filter((f) => !f.error);
    const sum = (k) => ok.reduce((a, f) => a + f[k], 0);
    const total = e.files.reduce((a, f) => a + f.n, 0);
    const times = ok.map((f) => f.ms).sort((a, b) => a - b);
    md += `| ${e.label} | ${pct(sum('exact'), total)} | ${pct(sum('fuzzy'), total)} | ${pct(sum('row'), total)} | ${times.length ? (times[Math.floor(times.length / 2)] / 1000).toFixed(1) : '—'} | ${e.files.length - ok.length} |\n`;
  }
  md += '\nPer-file “name + grade on the same row” recall:\n\n| File | ' + engines.map((e) => e.label).join(' | ') + ' |\n|---|' + engines.map(() => '---').join('|') + '|\n';
  for (const t of rasters) {
    md += `| ${t.file} | ` + engines.map((e) => { const f = e.files.find((x) => x.file === t.file); return !f ? '—' : f.error ? 'failed' : pct(f.row, f.n); }).join(' | ') + ' |\n';
  }
  writeFileSync('results/table.md', md);
  console.log(md);
}

const engineName = process.argv[2];
if (engineName === 'report') {
  report();
} else {
  const label = process.argv[3] ?? engineName;
  const eng = await makeEngine(engineName);
  const files = [];
  // Warm-up so model load is not charged to the first file.
  try { await eng.run(readFileSync(path.join(FIX, rasters[0].file)), rasters[0]); } catch {}
  for (const t of rasters) {
    const buf = readFileSync(path.join(FIX, t.file));
    const t0 = Date.now();
    try {
      const lines = await eng.run(buf, t);
      const ms = Date.now() - t0;
      const s = score(t, lines);
      files.push({ file: t.file, ms, ...s });
      console.log(t.file.padEnd(28), `${ms}ms`.padStart(8), `exact ${s.exact}/${s.n}  fuzzy ${s.fuzzy}/${s.n}  row ${s.row}/${s.n}`);
      mkdirSync('out/' + engineName.replace(/[:/]/g, '_'), { recursive: true });
      writeFileSync(`out/${engineName.replace(/[:/]/g, '_')}/${t.file}.txt`, lines.join('\n'));
    } catch (e) {
      files.push({ file: t.file, n: t.courses.length, error: String(e.message ?? e).slice(0, 200) });
      console.log(t.file.padEnd(28), 'FAILED', String(e.message ?? e).slice(0, 120));
    }
  }
  await eng.close();
  mkdirSync('results', { recursive: true });
  writeFileSync(`results/${engineName.replace(/[:/]/g, '_')}.json`, JSON.stringify({ engine: engineName, label, files }, null, 1));
}
