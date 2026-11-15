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

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Finds the row slope (dy/dx) that makes text lines sharpest for a set of tokens. */
function bestSlope(tokens: Token[], pivotX: number, h: number): number {
  let best = 0;
  let bestScore = -1;
  const bin = Math.max(2, h * 0.45);
  for (let slope = -0.16; slope <= 0.16001; slope += 0.004) {
    const hist = new Map<number, number>();
    for (const t of tokens) {
      const cy = t.y + t.h / 2 - slope * (t.x + t.w / 2 - pivotX);
      const b = Math.round(cy / bin);
      hist.set(b, (hist.get(b) ?? 0) + 1);
    }
    let score = 0;
    for (const v of hist.values()) score += v * v;
    // Prefer the smaller rotation on ties.
    if (score > bestScore + 1e-9 || (Math.abs(score - bestScore) < 1e-9 && Math.abs(slope) < Math.abs(best))) {
      bestScore = score;
      best = slope;
    }
  }
  return best;
}

/**
 * Returns a function giving the local row slope at a vertical position.
 * Perspective makes lines converge, so the slope is estimated in three bands and interpolated.
 */
function slopeModel(tokens: Token[], pageWidth: number): (y: number) => number {
  if (tokens.length < 8) return () => 0;
  const h = median(tokens.map((t) => t.h));
  const pivot = pageWidth / 2;
  if (tokens.length < 45) {
    const s = bestSlope(tokens, pivot, h);
    return () => s;
  }
  const sorted = [...tokens].sort((a, b) => a.y - b.y);
  const third = Math.floor(sorted.length / 3);
  const bands = [sorted.slice(0, third), sorted.slice(third, 2 * third), sorted.slice(2 * third)];
  const pts = bands.map((b) => ({ y: median(b.map((t) => t.y + t.h / 2)), s: bestSlope(b, pivot, h) }));
  return (y: number) => {
    if (y <= pts[0].y) return pts[0].s;
    if (y >= pts[2].y) return pts[2].s;
    const [a, b] = y <= pts[1].y ? [pts[0], pts[1]] : [pts[1], pts[2]];
    const f = (y - a.y) / Math.max(1, b.y - a.y);
    return a.s + (b.s - a.s) * f;
  };
}

/** Groups one page's tokens into rows and merges adjacent tokens into cells. */
function pageRows(tokens: Token[], page: number, pageWidth: number, deskew: boolean, gapFactor: number): Row[] {
  if (!tokens.length) return [];
  const slope = deskew ? slopeModel(tokens, pageWidth) : () => 0;
  const pivot = pageWidth / 2;
  const items = tokens
    .map((t) => {
      const cy = t.y + t.h / 2;
      return { t, cy: cy - slope(cy) * (t.x + t.w / 2 - pivot) };
    })
    .sort((a, b) => a.cy - b.cy);

  const groups: { cy: number; h: number; items: typeof items }[] = [];
  for (const it of items) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(it.cy - g.cy) < Math.min(g.h, it.t.h) * 0.55 + Math.abs(g.h - it.t.h) * 0.1) {
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
    for (const t of toks) {
      const text = t.text.trim();
      if (!text) continue;
      const last = cells[cells.length - 1];
      const gap = last ? t.x - (last.x + last.w) : Infinity;
      if (last && gap < Math.max(last.h, t.h) * gapFactor) {
        const needsSpace = gap > Math.max(last.h, t.h) * 0.12 && !/[぀-鿿가-힯]$/.test(last.text);
        last.text += (needsSpace ? ' ' : '') + text;
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
    const gapFactor = doc.kind === 'ocr' ? 0.6 : doc.kind === 'docx' ? 0.05 : 0.45;
    out.push(...pageRows(toks, page, p.width, doc.kind === 'ocr', gapFactor));
  });
  return out;
}

export const rowText = (r: Row) => r.cells.map((c) => c.text).join('  ');
