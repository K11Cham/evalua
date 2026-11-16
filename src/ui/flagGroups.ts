// The list of items to verify, made readable: the most serious first, and flags of one kind ("Listed twice: X",
// "Listed twice: Y", …) gathered into one item, so nine near-identical warnings read as one thing to check.
import type { VerifyFlag } from '../core/types.ts';

export interface FlagGroup {
  key: string;
  severity: VerifyFlag['severity'];
  /** The shared title ("Listed twice"), or the flag's own title when it stands alone. */
  title: string;
  flags: VerifyFlag[];
}

const ORDER: Record<VerifyFlag['severity'], number> = { important: 0, check: 1, info: 2 };

/** "Listed twice: CHEMISTRY" → kind "Listed twice", item "CHEMISTRY". */
export function flagKind(f: VerifyFlag): { kind: string; item: string } {
  const at = f.title.indexOf(': ');
  return at > 0 ? { kind: f.title.slice(0, at), item: f.title.slice(at + 2) } : { kind: f.title, item: '' };
}

export function groupFlags(flags: VerifyFlag[]): FlagGroup[] {
  const groups: FlagGroup[] = [];
  const byKind = new Map<string, FlagGroup>();
  for (const f of flags) {
    const { kind } = flagKind(f);
    const k = `${f.severity}|${kind}`;
    const g = byKind.get(k);
    if (g) g.flags.push(f);
    else {
      const ng: FlagGroup = { key: k, severity: f.severity, title: kind, flags: [f] };
      byKind.set(k, ng);
      groups.push(ng);
    }
  }
  // A kind seen once keeps its full title and id.
  for (const g of groups) if (g.flags.length === 1) Object.assign(g, { key: g.flags[0].id, title: g.flags[0].title });
  return groups.map((g, i) => ({ g, i })).sort((a, b) => ORDER[a.g.severity] - ORDER[b.g.severity] || a.i - b.i).map((x) => x.g);
}
