// Image-based skew estimate (classic projection-profile method on an edge map).
// Text lines and table rules are horizontal structures; the row slope that makes their projection sharpest
// is the page tilt. Pure function: the caller supplies greyscale pixels (canvas in the browser, sharp in Node).

/** Width to downscale to before calling estimateSkew. */
export const SKEW_WIDTH = 640;

/**
 * @param gray greyscale pixels, row-major, one byte per pixel
 * @returns row slope dy/dx (positive = lines run downhill to the right), in the range ±0.16 (about ±9°)
 */
export function estimateSkew(gray: Uint8Array | Uint8ClampedArray, width: number, height: number): number {
  // Vertical-gradient edge points (horizontal structures).
  const xs: number[] = [];
  const ys: number[] = [];
  const ws: number[] = [];
  let sum = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 0; x < width; x++) {
      const g = Math.abs(gray[(y + 1) * width + x] - gray[(y - 1) * width + x]);
      sum += g;
      n++;
    }
  }
  const mean = sum / Math.max(1, n);
  const thr = Math.max(24, mean * 3);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 0; x < width; x++) {
      const g = Math.abs(gray[(y + 1) * width + x] - gray[(y - 1) * width + x]);
      if (g >= thr) {
        xs.push(x - width / 2);
        ys.push(y);
        ws.push(Math.min(g, 120));
      }
    }
  }
  if (xs.length < 200) return 0;
  // Subsample very dense edge maps.
  const step = Math.max(1, Math.floor(xs.length / 60000));
  let best = 0;
  let bestScore = -1;
  const bins = new Float64Array(height + 2 * Math.ceil(width * 0.09) + 4);
  const off = Math.ceil(width * 0.09) + 2;
  for (let s = -0.16; s <= 0.16001; s += 0.004) {
    bins.fill(0);
    for (let i = 0; i < xs.length; i += step) bins[Math.round(ys[i] - s * xs[i]) + off] += ws[i];
    let score = 0;
    for (let i = 0; i < bins.length; i++) score += bins[i] * bins[i];
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return Math.round(best * 1000) / 1000;
}
