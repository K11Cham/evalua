// Image preparation before OCR, shared by the browser and the test harness so both see the same pixels.
// Coloured text (red headings, blue stamps) can drop out of OCR in colour; a greyscale image with its
// contrast stretched keeps it, and does not hurt black-on-white text.

/** Longest side, in pixels, a page or photo is read at. A phone scan (often 3000×4000 or more) is scaled down to it. */
export const MAX_SIDE = 2600;

/**
 * True when the page has strongly coloured ink (a red heading, blue text). Those pages are read in greyscale.
 * Others are left alone: on noisy black-and-white scans the contrast stretch makes the noise worse.
 * Measured on the fake transcripts: greyscale everywhere lost courses on the Arabic and Hindi scans.
 */
export function hasColouredInk(rgba: Uint8ClampedArray | Uint8Array): boolean {
  const n = rgba.length / 4;
  const step = Math.max(1, Math.floor(n / 400_000));
  let hits = 0;
  let seen = 0;
  for (let i = 0; i < n; i += step) {
    seen++;
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 110) hits++;
  }
  return hits / seen > 0.0004;
}

/**
 * Redaction bars painted out before OCR, in place; returns how many. A bar is a solid, nearly black, wide rectangle:
 * text never fills its box that solidly, table rules are too thin, and a desk or a shadow in a photo is not black.
 * Left in, the text detector merges a bar with the lines next to it and those lines are lost (a redacted photo lost its
 * table header this way). Painted out, the field is simply empty, and reads as not found.
 */
export function maskBars(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): number {
  const CELL = 4;
  const cw = Math.floor(w / CELL);
  const ch = Math.floor(h / CELL);
  const dark = new Uint8Array(cw * ch);
  const cellLum = new Float32Array(cw * ch);
  for (let cy = 0; cy < ch; cy++)
    for (let cx = 0; cx < cw; cx++) {
      let n = 0;
      let sum = 0;
      for (let y = cy * CELL; y < (cy + 1) * CELL; y++)
        for (let x = cx * CELL; x < (cx + 1) * CELL; x++) {
          const i = (y * w + x) * 4;
          const l = rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114;
          sum += l;
          if (l < 60) n++;
        }
      cellLum[cy * cw + cx] = sum / (CELL * CELL);
      if (n >= CELL * CELL * 0.8) dark[cy * cw + cx] = 1;
    }
  // A bar sits on paper: most of the cells just around it are light. The shadow along a photographed sheet's edge
  // borders the desk instead, so it is never taken for a bar.
  const onPaper = (cells: number[]) => {
    const inside = new Set(cells);
    let light = 0, ring = 0;
    for (const c of cells) {
      const cx = c % cw;
      for (const n of [c - 2, c + 2, c - 2 * cw, c + 2 * cw]) {
        if (n < 0 || n >= dark.length || inside.has(n) || (Math.abs((n % cw) - cx) > 2)) continue;
        ring++;
        if (cellLum[n] > 150) light++;
      }
    }
    return ring > 0 && light / ring >= 0.75;
  };
  const seen = new Uint8Array(cw * ch);
  let bars = 0;
  for (let start = 0; start < dark.length; start++) {
    if (!dark[start] || seen[start]) continue;
    // One connected patch of dark cells.
    const stack = [start];
    const cells: number[] = [];
    seen[start] = 1;
    let x0 = cw, x1 = 0;
    while (stack.length) {
      const c = stack.pop()!;
      cells.push(c);
      const cx = c % cw;
      x0 = Math.min(x0, cx); x1 = Math.max(x1, cx);
      for (const n of [c - 1, c + 1, c - cw, c + cw]) {
        if (n < 0 || n >= dark.length || seen[n] || !dark[n]) continue;
        if ((n === c - 1 && cx === 0) || (n === c + 1 && cx === cw - 1)) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    // Solid and bar-shaped, measured column by column so a bar tilted in a phone photo still counts: every column
    // has a dark span of about the bar's thickness, and the bar is much wider than it is thick.
    const bw = x1 - x0 + 1;
    const perColumn = new Array<number>(bw).fill(0);
    for (const c of cells) perColumn[(c % cw) - x0]++;
    const thick = [...perColumn].sort((a, b) => a - b)[Math.floor(bw / 2)];
    const solid = cells.length / (bw * Math.max(1, thick)) >= 0.8 && perColumn.filter((n) => n > 0).length >= bw * 0.9;
    const shaped = thick >= 2 && bw >= thick * 4 && thick * CELL <= h * 0.06 && bw * CELL <= w * 0.6;
    if (!solid || !shaped || !onPaper(cells)) continue;
    bars++;
    // Paint the bar's own cells, and one around each (its soft edge), paper white. Never its bounding box: a tilted
    // bar's box would cover the text beside it.
    for (const c of cells) {
      const cx = c % cw, cy = (c - cx) / cw;
      for (let y = Math.max(0, (cy - 1) * CELL); y < Math.min(h, (cy + 2) * CELL); y++)
        for (let x = Math.max(0, (cx - 1) * CELL); x < Math.min(w, (cx + 2) * CELL); x++) {
          const i = (y * w + x) * 4;
          rgba[i] = rgba[i + 1] = rgba[i + 2] = 255;
        }
    }
  }
  return bars;
}

/** RGBA pixels → greyscale RGBA with the 1st–99th percentile stretched to full range. In place. */
export function greyStretch(rgba: Uint8ClampedArray | Uint8Array): void {
  const n = rgba.length / 4;
  const hist = new Uint32Array(256);
  const grey = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    grey[i] = (rgba[i * 4] * 299 + rgba[i * 4 + 1] * 587 + rgba[i * 4 + 2] * 114) / 1000;
    hist[grey[i]]++;
  }
  const pick = (q: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) if ((acc += hist[v]) >= n * q) return v;
    return 255;
  };
  const lo = pick(0.01);
  const hi = Math.max(lo + 1, pick(0.99));
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(255, ((grey[i] - lo) * 255) / (hi - lo)));
    rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = v;
    rgba[i * 4 + 3] = 255;
  }
}
