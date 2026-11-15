// Debug helper: runs any local file through the pipeline and prints what was read.
//   npx tsx tools/eval/inspect.ts <path-to-file> [--rows] [--district <id>]
// Nothing is cached or written: safe to point at a file that must not be copied.
import { rowText } from '../../src/core/layout.ts';
import { extract } from '../../src/core/extract.ts';
import { caseFlags } from '../../src/core/verify.ts';
import { evaluate, runExtraction } from '../../src/core/pipeline.ts';
import { seedKb } from '../../src/kb/index.ts';
import { closeOcr, ingestFile } from './node-ingest.ts';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--district');
if (!file) throw new Error('usage: inspect.ts <file> [--rows] [--district <id>]');
const districtId = args.includes('--district') ? args[args.indexOf('--district') + 1] : 'generic-22';
const kb = seedKb();
const doc = await ingestFile(file, false);
const { tables } = extract(doc, kb);
const ex = runExtraction(doc, kb);
const district = kb.districts.find((d) => d.id === districtId)!;
const ev = evaluate(ex, kb, district);

console.log(`engine: ${doc.engine} · pages ${doc.pages.length} · tokens ${doc.tokens.length} · rows ${tables.rows.length}`);
if (args.includes('--rows')) for (const r of tables.rows) console.log(`  p${r.page} y${Math.round(r.y)} | ${r.cells.map((c) => c.text).join(' ¦ ')}`);
console.log(`system: ${ex.systemId.value} (${Math.round(ex.systemId.confidence * 100)}%) · ${ex.docType} · country ${ex.country.value}`);
console.log(`student: “${ex.student.name.value}” · dob “${ex.student.dob.value}” · id “${ex.student.id.value}” · school “${ex.school.name.value}”`);
for (const c of ex.courses) {
  const s = ev.suggestions.find((x) => x.courseId === c.id);
  console.log(`  [${c.period.value || '—'} | L${c.level ?? '?'}${c.term ? ` T${c.term}` : ''}] ${c.name.original} => ${c.grade.value}${c.score ? ` (score ${c.score.value})` : ''}  →  ${s?.conceptLabel}${s?.usCourse ? ` [${s.usCourse.title}]` : ""} / ${s?.requirementLabel} / ${s?.credits} cr / ${s?.grade.letter ?? '—'} (${s?.grade.table})`);
}
console.log('free rows:', tables.freeRows.slice(0, 16).map(rowText).join(' ⏎ '));
for (const f of caseFlags(ex, ev.flags)) console.log(`  flag [${f.severity}] ${f.title}`);
console.log(`total ${ev.totalEarned}/${ev.totalRequired} in ${district.name}`);
await closeOcr();
for (const p of ev.placements) console.log(`placement ${p.label} as of ${p.asOf}: done ${p.completed.join(', ') || '—'} · continue in ${p.continueIn?.title} (${Math.round((p.continueIn?.coverage ?? 0) * 100)}%) · conf ${p.confidence}`);
