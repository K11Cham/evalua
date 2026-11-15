// Image preparation before OCR, shared by the browser and the test harness so both see the same pixels.
// Coloured text (red headings, blue stamps) can drop out of OCR in colour; a greyscale image with its
// contrast stretched keeps it, and does not hurt black-on-white text.

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
