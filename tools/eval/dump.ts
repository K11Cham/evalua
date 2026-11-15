// Debug helper: prints the rows and the raw courses read from one or more fixtures.
//   npx tsx tools/eval/dump.ts mx-sep.photo.jpg [--rows]
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { rowText } from '../../src/core/layout.ts';
import { readTables } from '../../src/core/tables.ts';
import { closeOcr, ingestFile } from './node-ingest.ts';

const args = process.argv.slice(2);
const showRows = args.includes('--rows');
const manifest = JSON.parse(readFileSync('fixtures/fake/manifest.json', 'utf8')) as { file: string; courses: unknown[] }[];
const files = args.filter((a) => !a.startsWith('--'));
const targets = manifest.filter((m) => !files.length || files.some((f) => m.file.includes(f)));

for (const t of targets) {
  const doc = await ingestFile(path.join('fixtures/fake', t.file));
  const res = readTables(doc);
  console.log(`\n=== ${t.file} [${doc.engine}] tokens=${doc.tokens.length} rows=${res.rows.length} courses=${res.courses.length}/${t.courses.length}`);
  if (showRows) for (const r of res.rows) console.log(`  p${r.page} y${Math.round(r.y)} | ${r.cells.map((c) => c.text).join(' ¦ ')}`);
  if (files.length) {
    for (const c of res.courses) {
      console.log(`  [${c.period}] ${c.name.text} => ${c.grade?.text ?? '∅'}${c.score ? ` (score ${c.score.text})` : ''}${c.credits ? ` cr ${c.credits.text}` : ''}${c.hours ? ` h ${c.hours.text}` : ''}${c.qualifier ? ` q ${c.qualifier.text}` : ''}`);
    }
    console.log('  free:', res.freeRows.slice(0, 14).map(rowText).join(' ⏎ '));
    for (const n of res.notes) console.log('  note:', n.kind, n.detail);
  }
}
await closeOcr();
