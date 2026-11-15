import path from 'node:path';
import { evaluate, runExtraction } from '../../src/core/pipeline.ts';
import { seedKb } from '../../src/kb/index.ts';
import { closeOcr, ingestFile } from './node-ingest.ts';
const kb = seedKb();
for (const f of process.argv.slice(2)) {
  const ex = runExtraction(await ingestFile(path.join('fixtures/fake', f)), kb);
  const ev = evaluate(ex, kb, kb.districts.find((d) => d.id === 'generic-22')!);
  console.log(f, [...ex.flags, ...ev.flags].map((x) => `[${x.severity}] ${x.title}`).join(' | '));
}
await closeOcr();
