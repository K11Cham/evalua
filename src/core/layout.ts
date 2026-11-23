// Layout analysis: positioned tokens → visual rows of cells.
// Works for text-layer PDFs, reconstructed DOCX grids and OCR output (including skewed phone photos).
import type { DocTokens, Token } from './types.ts';

export interface Cell {
  text: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  conf: number;
}

export interface Row {
  page: number;
  /** Deskewed vertical centre, used for ordering. */
  y: number;
  h: number;
  cells: Cell[];
}

const RTL_CHAR = /[֐-ࣿ]/;

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Finds the row slope (dy/dx) that makes text lines sharpest for a set of tokens. */
function bestSlope(tokens: Token[], pivotX: number, h: number, prior?: number): number {
  const sigma = Math.max(1.5, h * 0.22);
  const cx = tokens.map((t) => t.x + t.w / 2 - pivotX);
  const cy = tokens.map((t) => t.y + t.h / 2);
  const slopes: number[] = [];
  const scores: number[] = [];
  const lo = prior == null ? -0.16 : prior - 0.032;
  const hi = prior == null ? 0.16 : prior + 0.032;
  for (let slope = lo; slope <= hi + 1e-6; slope += 0.004) {
    const ys = cy.map((y, i) => y - slope * cx[i]);
    let score = 0;
    for (let i = 0; i < ys.length; i++) {
      for (let j = i + 1; j < ys.length; j++) {
        const d = (ys[i] - ys[j]) / sigma;
        if (d > -3 && d < 3) score += Math.exp(-d * d);
      }
    }
    slopes.push(slope);
    scores.push(score);
  }
  const top = Math.max(...scores);
  if (top <= 0) return 0;
  // Near-ties happen on sparse pages (rows can line up one row off). A tilted page makes long text boxes
  // taller in proportion to their width, which tells us how large the tilt is.
  const peaks = slopes
    .map((s, i) => ({ s, score: scores[i], peak: scores[i] >= (scores[i - 1] ?? -1) && scores[i] >= (scores[i + 1] ?? -1) }))
    .filter((p) => p.peak && p.score >= top * 0.7);
  // Robust (Theil–Sen) estimate of how fast box height grows with box width = |tan(tilt)|.
  const growth: number[] = [];
  for (const a of tokens) for (const b of tokens) if (b.w - a.w > 4 * h) growth.push((b.h - a.h) / (b.w - a.w));
  const tilt = growth.length >= 30 ? median(growth) : 0;
  if (prior != null) {
    peaks.sort((a, b) => b.score - a.score || Math.abs(a.s - prior) - Math.abs(b.s - prior));
    return peaks[0]?.s ?? prior;
  }
  if (peaks.length > 1 && tilt > 0.02) {
    peaks.sort((a, b) => Math.abs(Math.abs(a.s) - tilt) - Math.abs(Math.abs(b.s) - tilt));
    return peaks[0].s;
  }
  peaks.sort((a, b) => b.score - a.score || Math.abs(a.s) - Math.abs(b.s));
  return peaks[0]?.s ?? 0;
}

/**
 * Returns a function giving the local row slope at a vertical position.
 * Perspective makes lines converge, so the slope is estimated in three bands and interpolated.
 */
function slopeModel(tokens: Token[], pageWidth: number, prior?: number): (y: number) => number {
  if (tokens.length < 8) return () => prior ?? 0;
  const h = median(tokens.map((t) => t.h));
  const pivot = pageWidth / 2;
  if (tokens.length < 45) {
    const s = bestSlope(tokens, pivot, h, prior);
    return () => s;
  }
  const sorted = [...tokens].sort((a, b) => a.y - b.y);
  const third = Math.floor(sorted.length / 3);
  const bands = [sorted.slice(0, third), sorted.slice(third, 2 * third), sorted.slice(2 * third)];
  const pts = bands.map((b) => ({ y: median(b.map((t) => t.y + t.h / 2)), s: bestSlope(b, pivot, h, prior) }));
  return (y: number) => {
    if (y <= pts[0].y) return pts[0].s;
    if (y >= pts[2].y) return pts[2].s;
    const [a, b] = y <= pts[1].y ? [pts[0], pts[1]] : [pts[1], pts[2]];
    const f = (y - a.y) / Math.max(1, b.y - a.y);
    return a.s + (b.s - a.s) * f;
  };
}

/** Groups one page's tokens into rows and merges adjacent tokens into cells. */
function pageRows(tokens: Token[], page: number, pageWidth: number, deskew: boolean, gapFactor: number, prior?: number): Row[] {
  if (!tokens.length) return [];
  const slope = deskew ? slopeModel(tokens, pageWidth, prior) : () => 0;
  const pivot = pageWidth / 2;
  const items = tokens
    .map((t) => {
      const cy = t.y + t.h / 2;
      return { t, cy: cy - slope(cy) * (t.x + t.w / 2 - pivot) };
    })
    .sort((a, b) => a.cy - b.cy);

  // Oversized text (watermarks, banner titles) must not swallow the rows it overlaps.
  const typical = median(tokens.map((t) => t.h));
  const groups: { cy: number; h: number; items: typeof items; big?: boolean }[] = [];
  for (const it of items) {
    const g = groups[groups.length - 1];
    if (it.t.h > typical * 2.6) {
      groups.push({ cy: it.cy, h: it.t.h, items: [it], big: true });
      continue;
    }
    const prevNormal = g && !g.big ? g : groups.findLast((x) => !x.big);
    if (prevNormal && prevNormal !== g && Math.abs(it.cy - prevNormal.cy) < Math.min(prevNormal.h, it.t.h) * 0.55) {
      prevNormal.items.push(it);
      continue;
    }
    if (g && !g.big && Math.abs(it.cy - g.cy) < Math.min(g.h, it.t.h) * 0.55 + Math.abs(g.h - it.t.h) * 0.1) {
      g.items.push(it);
      g.cy = g.items.reduce((a, x) => a + x.cy, 0) / g.items.length;
      g.h = median(g.items.map((x) => x.t.h));
    } else {
      groups.push({ cy: it.cy, h: it.t.h, items: [it] });
    }
  }

  return groups.map((g) => {
    const toks = g.items.map((x) => x.t).sort((a, b) => a.x - b.x);
    const cells: Cell[] = [];
    let lastAlone = false;
    for (const t of toks) {
      const text = t.text.trim();
      if (!text) continue;
      const last = cells[cells.length - 1];
      const gap = last ? t.x - (last.x + last.w) : Infinity;
      // A cell split out of a piece OCR had read across several cells keeps to itself.
      const join = last && !t.alone && !lastAlone && gap < Math.max(last.h, t.h) * gapFactor;
      lastAlone = !!t.alone;
      if (join) {
        const needsSpace = gap > Math.max(last.h, t.h) * 0.12 && !/[぀-鿿가-힯]$/.test(last.text);
        // Right-to-left text reads from the right-most token.
        const rtl = RTL_CHAR.test(last.text) || RTL_CHAR.test(text);
        const sep = rtl ? gap > Math.max(last.h, t.h) * 0.04 : needsSpace;
        last.text = rtl ? text + (sep ? ' ' : '') + last.text : last.text + (sep ? ' ' : '') + text;
        const right = Math.max(last.x + last.w, t.x + t.w);
        const top = Math.min(last.y, t.y);
        const bottom = Math.max(last.y + last.h, t.y + t.h);
        last.w = right - last.x;
        last.y = top;
        last.h = bottom - top;
        last.conf = Math.min(last.conf, t.conf);
      } else {
        cells.push({ text, page, x: t.x, y: t.y, w: t.w, h: t.h, conf: t.conf });
      }
    }
    return { page, y: g.cy, h: g.h, cells };
  }).filter((r) => r.cells.length);
}

/** All rows of the document, in reading order (page, then top to bottom). */
export function buildRows(doc: DocTokens): Row[] {
  const out: Row[] = [];
  doc.pages.forEach((p, page) => {
    const toks = doc.tokens.filter((t) => t.page === page);
    const gapFactor = doc.kind === 'ocr' ? 0.3 : doc.kind === 'docx' ? 0.05 : 0.45;
    out.push(...pageRows(toks, page, p.width, doc.kind === 'ocr', gapFactor, p.skew));
  });
  return out;
}

export const rowText = (r: Row) => r.cells.map((c) => c.text).join('  ');
