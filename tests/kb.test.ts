import { describe, expect, it } from 'vitest';
import { kb } from './helpers.ts';

describe('knowledge base integrity', () => {
  it('every stored fact carries a source, a school year and the date it was added', () => {
    for (const s of kb.systems) {
      expect(s.provenance.source.title, s.id).toBeTruthy();
      expect(s.provenance.schoolYear, s.id).toMatch(/^\d{4}-\d{2}$/);
      expect(s.provenance.addedOn, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const sc of s.scales) expect(sc.provenance.source.title, sc.id).toBeTruthy();
      for (const l of s.levels) expect(() => new RegExp(l.pattern, 'iu'), `${s.id}: ${l.pattern}`).not.toThrow();
      for (const c of s.courses) expect(kb.concepts.some((k) => k.id === c.concept), `${s.id}: ${c.concept}`).toBe(true);
    }
    for (const d of kb.districts) {
      expect(d.provenance.source.title, d.id).toBeTruthy();
      expect(d.requirements.some((r) => r.id === 'elective'), d.id).toBe(true);
      for (const c of d.catalog) for (const k of c.concepts) expect(kb.concepts.some((x) => x.id === k), `${d.id}: ${k}`).toBe(true);
    }
  });
  it('seeds the systems the brief names, plus a generic fallback', () => {
    const ids = kb.systems.map((s) => s.id);
    for (const id of ['waec', 'gabece', 'jamb', 'ib', 'uk', 'in-cbse', 'in-cisce', 'cn', 'mx-sep', 'fr', 'de', 'ph-k12', 'br', 'kr', 'vn', 'generic']) expect(ids).toContain(id);
  });
});
