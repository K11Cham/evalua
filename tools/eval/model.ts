// What the optional local model (Ollama) adds. Every fake transcript is read as usual; the course names the
// dictionaries leave untranslated are sent to the model, exactly as the "Translate … with the local model" button
// does, and the result is scored against the known answers. Fictitious records only.
//   npm run eval:model                              → qwen2.5-coder:7b and :14b, writes docs/ACCURACY_MODEL.md
//   npm run eval:model -- --model qwen2.5:7b --url http://localhost:11434   (does not rewrite the report)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ollamaModels, ollamaProvider } from '../../src/ai/provider.ts';
import { buildMatcher } from '../../src/core/match.ts';
import { evaluate, runExtraction } from '../../src/core/pipeline.ts';
import { similarity } from '../../src/core/text.ts';
import type { Extraction } from '../../src/core/types.ts';
import { seedKb } from '../../src/kb/index.ts';
import type { Truth } from '../fakegen/types.ts';
import { closeOcr, ingestFile } from './node-ingest.ts';
import { scoreFile } from './score.ts';

const args = process.argv.slice(2);
const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const url = opt('--url') ?? 'http://localhost:11434';
const models = opt('--model') ? [opt('--model')!] : ['qwen2.5-coder:7b', 'qwen2.5-coder:14b'];
const writeReport = !opt('--model');

const installed = await ollamaModels(url);
const missing = models.filter((m) => !installed.includes(m));
if (missing.length) {
  console.error(`Not installed in Ollama: ${missing.join(', ')}. Run: ollama pull ${missing[0]}`);
  process.exit(1);
}

const kb = seedKb();
const district = kb.districts.find((d) => d.id === 'generic-22')!;
const manifest = (JSON.parse(readFileSync('fixtures/fake/manifest.json', 'utf8')) as Truth[]).filter((t) => t.lang !== 'en');

// Read every file once; the model only changes names, so reading is shared by all models.
const read: { t: Truth; ex: Extraction; engine: string }[] = [];
for (const t of manifest) {
  const doc = await ingestFile(path.join('fixtures/fake', t.file), true);
  read.push({ t, ex: runExtraction(doc, kb), engine: doc.engine });
}
await closeOcr();

interface Answer {
  file: string;
  printed: string;
  reference: string;
  model: string;
  /** close to the reference wording */
  close: boolean;
  /** the model's name names the same subject as the reference, though worded differently */
  sameSubject: boolean;
  /** the rules could not place the subject, and the model's English name would have */
  subjectFixed: boolean;
  /** no reference course resembles the line (a misread heading or footer); nothing to score */
  notACourse: boolean;
  /** read so badly that ACCURACY.md does not match it to its course (it counts there as an extra row) */
  damaged: boolean;
}
interface HeadToHead {
  total: number;
  dictClose: number;
  dictSubject: number;
  modelAnswered: number;
  modelClose: number;
  modelSubject: number;
  modelWrong: number;
  seconds: number;
  examples: { file: string; printed: string; reference: string; dict: string; model: string }[];
}
interface Run {
  model: string;
  seconds: number;
  calls: number;
  before: { ok: number; total: number };
  after: { ok: number; total: number };
  answers: Answer[];
  all: HeadToHead;
}

const englishMatch = buildMatcher(kb, undefined, true);
const runs: Run[] = [];
for (const model of models) {
  const provider = ollamaProvider(url, model);
  const run: Run = { model, seconds: 0, calls: 0, before: { ok: 0, total: 0 }, after: { ok: 0, total: 0 }, answers: [], all: { total: 0, dictClose: 0, dictSubject: 0, modelAnswered: 0, modelClose: 0, modelSubject: 0, modelWrong: 0, seconds: 0, examples: [] } };
  for (const { t, ex, engine } of read) {
    const ev = evaluate(ex, kb, district);
    const before = scoreFile(t, ex, ev, engine, 0);
    run.before.ok += before.translationOk;
    run.before.total += before.translationTotal;
    const todo = ex.courses.filter((c) => c.translation === 'none' && c.name.original);
    const after: Extraction = structuredClone(ex);
    if (todo.length) {
      const names = [...new Set(todo.map((c) => c.name.original!))];
      const t0 = Date.now();
      const out = await provider.translateCourses(names, ex.language, ex.docType);
      run.seconds += (Date.now() - t0) / 1000;
      run.calls++;
      for (const tr of out.filter((x) => x.english)) {
        for (const c of after.courses) {
          if (c.translation === 'none' && c.name.original === tr.original) {
            c.name.value = tr.english;
            c.translation = 'model';
          }
        }
      }
      for (const tr of out) {
        // The reference course this printed name stands for. ACCURACY.md needs 80% similarity; a looser 55% here
        // only labels badly misread rows, so they are scored instead of being called "not a course".
        const ref = t.courses.map((tc) => ({ tc, sim: similarity(tr.original, tc.name) })).sort((a, b) => b.sim - a.sim)[0];
        const real = !!ref && ref.sim >= 0.55;
        const sug = ev.suggestions.find((s) => s.courseId === ex.courses.find((c) => c.name.original === tr.original)?.id);
        const modelConcept = tr.english ? englishMatch(tr.english).conceptId : '';
        run.answers.push({
          file: t.file,
          printed: tr.original,
          reference: real ? ref.tc.en : '',
          model: tr.english,
          close: real && !!tr.english && similarity(tr.english, ref.tc.en) >= 0.8,
          sameSubject: real && !!tr.english && modelConcept === ref.tc.concept,
          subjectFixed: real && !!tr.english && sug?.conceptId !== ref.tc.concept && modelConcept === ref.tc.concept,
          notACourse: !real,
          damaged: real && ref.sim < 0.8,
        });
      }
    }
    // Head to head: every course name in the file, as if the dictionaries did not exist.
    const pairs = new Map<string, { ref: (typeof t.courses)[number]; dict: string; dictConcept: string }>();
    for (const c of ex.courses) {
      if (!c.name.original || pairs.has(c.name.original)) continue;
      const ref = t.courses.map((tc) => ({ tc, sim: similarity(c.name.original!, tc.name) })).sort((a, b) => b.sim - a.sim)[0];
      if (!ref || ref.sim < 0.8) continue;
      pairs.set(c.name.original, { ref: ref.tc, dict: c.translation === 'none' ? '' : c.name.value, dictConcept: ev.suggestions.find((s) => s.courseId === c.id)?.conceptId ?? '' });
    }
    if (pairs.size) {
      const t0 = Date.now();
      const out = await provider.translateCourses([...pairs.keys()], ex.language, ex.docType);
      run.all.seconds += (Date.now() - t0) / 1000;
      for (const tr of out) {
        const p = pairs.get(tr.original)!;
        const close = !!tr.english && similarity(tr.english, p.ref.en) >= 0.8;
        const subject = !!tr.english && englishMatch(tr.english).conceptId === p.ref.concept;
        run.all.total++;
        if (p.dict && similarity(p.dict, p.ref.en) >= 0.8) run.all.dictClose++;
        if (p.dictConcept === p.ref.concept) run.all.dictSubject++;
        if (tr.english) run.all.modelAnswered++;
        if (close) run.all.modelClose++;
        if (close || subject) run.all.modelSubject++;
        else if (tr.english) {
          run.all.modelWrong++;
          run.all.examples.push({ file: t.file, printed: tr.original, reference: p.ref.en, dict: p.dict, model: tr.english });
        }
      }
    }
    const scored = scoreFile(t, after, evaluate(after, kb, district), engine, 0);
    run.after.ok += scored.translationOk;
    run.after.total += scored.translationTotal;
  }
  runs.push(run);
  const real = run.answers.filter((a) => !a.notACourse);
  console.log(
    `${model.padEnd(20)} names sent ${run.answers.length} (${real.length} real courses)  answered ${real.filter((a) => a.model).length}  close ${real.filter((a) => a.close).length}  same subject ${real.filter((a) => a.sameSubject).length}  ` +
      `English names overall ${pct(run.before)} → ${pct(run.after)}  ${run.seconds.toFixed(1)} s in ${run.calls} calls\n` +
      `${''.padEnd(20)} every name: ${run.all.total}  close ${run.all.modelClose} (dictionaries ${run.all.dictClose})  right subject ${run.all.modelSubject} (rules ${run.all.dictSubject})  wrong ${run.all.modelWrong}  ${run.all.seconds.toFixed(1)} s`,
  );
}

function pct(x: { ok: number; total: number }) {
  return x.total ? `${((100 * x.ok) / x.total).toFixed(1)}%` : '—';
}

if (writeReport) {
  const r0 = runs[0];
  const real = (r: Run) => r.answers.filter((a) => !a.notACourse);
  const frac = (a: number, b: number) => `${a}/${b} (${b ? Math.round((100 * a) / b) : 0}%)`;
  const cols = (f: (r: Run) => string) => runs.map(f).join(' | ');
  const time = (r: Run) => r.seconds + r.all.seconds;
  const fastest = [...runs].sort((a, b) => time(a) - time(b))[0];
  const slowest = [...runs].sort((a, b) => time(b) - time(a))[0];
  const best = [...runs].sort((a, b) => b.all.modelSubject - a.all.modelSubject)[0];
  const rightAsUsed = (r: Run) => real(r).filter((a) => a.close || a.sameSubject).length;
  const bestAsUsed = [...runs].sort((a, b) => rightAsUsed(b) - rightAsUsed(a))[0];
  let md = `# What the local model adds\n\n`;
  md += `Generated by \`npm run eval:model\` on ${new Date().toISOString().slice(0, 10)}, with Ollama on a Ryzen 7 9700X / RTX 5060. Fictitious records only; temperature 0, one run per model.\n\n`;
  md += `evalua reads and evaluates a transcript without any model. The optional local model (Settings → language model on this computer) does one thing: it suggests English names for courses the built-in dictionaries cannot translate. `;
  md += `It does not read the document, and it does not change grades, credits, grade levels or the US subject, because subject matching uses the name as printed. Every other number in [ACCURACY.md](ACCURACY.md) is the same with or without it.\n\n`;
  md += `## Short answer\n\n`;
  md += `- **On the golden set it barely matters.** The dictionaries already translate almost every course name, so only ${real(r0).length} real course names (all damaged by OCR) were left for the model. “English name close to the reference” goes from ${pct(r0.before)} to ${runs.map((r) => `${pct(r.after)} (${r.model})`).join(' and ')}.\n`;
  md += `- **Where the dictionaries have no entry, the model is the only source of an English name.** Asked to translate every non-English course name on its own (part 2), ${runs.map((r) => `${r.model} names the right subject for ${frac(r.all.modelSubject, r.all.total)}`).join(', and ')}, against ${frac(r0.all.dictSubject, r0.all.total)} for evalua's rules. It is a fallback, not a replacement.\n`;
  md += `- **Model choice:** on the damaged names the button actually sends (part 1), ${bestAsUsed.model} named the most subjects correctly; across every name (part 2), ${best.model} did${best === bestAsUsed ? ' too' : ''}. ${fastest.model} was ${runs.length > 1 ? `${Math.max(1, Math.round(time(slowest) / Math.max(0.1, time(fastest))))}× faster than ${slowest.model}` : 'the only model tested'}. Either way the answers appear as suggestions a counselor can change, and the change log records the model that gave them.\n`;
  md += `- **The model's mistakes are confident.** It turns “Matemáticas IV” into “Calculus I” rather than saying it is not sure. That is why evalua uses its answer only for the English name, never for the subject or credit.\n\n`;
  md += `## 1. As used: only the names the dictionaries leave blank\n\n`;
  md += `All ${read.length} non-English files are read as usual, and every course name left untranslated is sent in one request per file, as the “Translate … with the local model” button does. “Close” is the same 80% similarity rule as ACCURACY.md. It is strict for translations (“Computer Science” is not close to “Informatics”), so the table also shows whether the model's name names the right subject, using evalua's English subject dictionary.\n\n`;
  md += `| | ${runs.map((r) => r.model).join(' | ')} |\n|---|${runs.map(() => '---|').join('')}\n`;
  md += `| Untranslated names that are real courses | ${cols((r) => String(real(r).length))} |\n`;
  md += `| …of them read so badly that ACCURACY.md counts them as extra rows | ${cols((r) => String(real(r).filter((a) => a.damaged).length))} |\n`;
  md += `| Untranslated lines that are not courses (misread headings) | ${cols((r) => String(r.answers.length - real(r).length))} |\n`;
  md += `| Close to the reference name | ${cols((r) => frac(real(r).filter((a) => a.close).length, real(r).length))} |\n`;
  md += `| Right subject, worded differently or not | ${cols((r) => frac(real(r).filter((a) => a.close || a.sameSubject).length, real(r).length))} |\n`;
  md += `| Wrong subject | ${cols((r) => frac(real(r).filter((a) => a.model && !a.close && !a.sameSubject).length, real(r).length))} |\n`;
  md += `| Left blank | ${cols((r) => frac(real(r).filter((a) => !a.model).length, real(r).length))} |\n`;
  md += `| English name close to the reference, all non-English courses (ACCURACY.md: ${pct(r0.before)}) | ${cols((r) => pct(r.after))} |\n`;
  md += `| Time | ${cols((r) => `${r.seconds.toFixed(1)} s for ${r.calls} requests`)} |\n\n`;
  const esc = (x: string) => x.replace(/\|/g, '\\|');
  md += `| File | Printed (as read) | Reference | ${runs.map((r) => r.model).join(' | ')} |\n|---|---|---|${runs.map(() => '---|').join('')}\n`;
  for (const [i, a] of r0.answers.entries()) {
    const cells = runs.map((r) => {
      const x = r.answers[i];
      if (!x) return '';
      const mark = x.notACourse ? '' : x.close ? ' ✓' : x.sameSubject ? ' ≈' : x.model ? ' ✗' : '';
      return `${esc(x.model || '(blank)')}${mark}`;
    });
    md += `| ${a.file} | ${esc(a.printed)} | ${a.notACourse ? '(not a course)' : esc(a.reference)} | ${cells.join(' | ')} |\n`;
  }
  md += `\n✓ close to the reference · ≈ right subject, different wording · ✗ wrong subject · (blank) no answer\n\n`;
  md += `## 2. Head to head: every non-English course name\n\n`;
  md += `To see how the model would do on names the dictionaries do not know, every distinct non-English course name the reader found (matched to its reference at 80% or more) is sent to the model, as if there were no dictionaries. The rules column is evalua without a model.\n\n`;
  md += `| | evalua rules and dictionaries | ${runs.map((r) => r.model).join(' | ')} |\n|---|---|${runs.map(() => '---|').join('')}\n`;
  md += `| Course names | ${r0.all.total} | ${cols((r) => String(r.all.total))} |\n`;
  md += `| English name close to the reference | ${frac(r0.all.dictClose, r0.all.total)} | ${cols((r) => frac(r.all.modelClose, r.all.total))} |\n`;
  md += `| Right US subject | ${frac(r0.all.dictSubject, r0.all.total)} | ${cols((r) => frac(r.all.modelSubject, r.all.total))} |\n`;
  md += `| Wrong subject | — | ${cols((r) => frac(r.all.modelWrong, r.all.total))} |\n`;
  md += `| Left blank | — | ${cols((r) => frac(r.all.total - r.all.modelAnswered, r.all.total))} |\n`;
  md += `| Time | — | ${cols((r) => `${r.all.seconds.toFixed(1)} s`)} |\n\n`;
  md += `For the rules, “right US subject” is the subject evalua actually suggests. For the model, it is the subject evalua's English dictionary finds in the model's name.\n\n`;
  md += `### Where the model named the wrong subject\n\n| Model | File | Printed | Reference | Dictionaries | Model said |\n|---|---|---|---|---|---|\n`;
  for (const r of runs) for (const e of r.all.examples.slice(0, 30)) md += `| ${r.model} | ${e.file} | ${esc(e.printed)} | ${esc(e.reference)} | ${esc(e.dict || '(none)')} | ${esc(e.model)} |\n`;
  md += `\nSome of these are wording the subject dictionary does not know rather than wrong translations; they are listed so a reader can judge.\n\n`;
  md += `## Why the model does not choose the subject\n\n`;
  const fixable = runs.map((r) => real(r).filter((a) => a.subjectFixed).length);
  md += `If the model's English names were used for subject matching, ${fixable.join(' / ')} of the untranslated courses in part 1 (${runs.map((r) => r.model).join(' / ')}) would move to the right subject. evalua leaves that to the counselor, because a wrong translation would otherwise move credit without anyone seeing it.\n`;
  writeFileSync('docs/ACCURACY_MODEL.md', md);
  console.log('wrote docs/ACCURACY_MODEL.md');
}
