import { seedKb } from '../../src/kb/index.ts';
import { asciiDigits } from '../../src/core/text.ts';

const kb = seedKb();
const mx = kb.systems.find((s) => s.id === 'mx-sep')!;
for (const label of ['PRIMER SEMESTRE', 'TERCER SEMESTRE', 'QUINTO SEMESTRE']) {
  const s = asciiDigits(label);
  console.log(label, mx.levels.map((r) => (new RegExp(r.pattern, 'iu').test(s) ? r.level : '-')).join(' '));
}
