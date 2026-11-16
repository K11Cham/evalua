// A correction to the OCR library's text detector, shared by the browser worker and the test harness.
//
// The detector also marks shapes that are not text: the letters of a pale "SPECIMEN" or "COPY" watermark, a seal, a
// shaded panel. The library then groups boxes into lines by their vertical overlap, so such a box joins every row it
// touches into a single "line", which the recogniser (one line, 48 px high) cannot read, and those rows are lost. On
// the French fake, nine rows and a footnote disappeared this way, and one more was garbled by a watermark letter.
//
// Two things tell those boxes from text, whatever the layout:
//  - ink: text has dark strokes on lighter paper; a watermark letter, a paper texture or a pale stamp has almost no
//    contrast inside its box;
//  - nesting: a line of text never contains other lines, so a box whose core holds two or more other boxes is a panel.
// Boxes are compared by their core, without the padding the library adds around each one (otherwise a tall title
// "contains" the line under it). Pages without such boxes are not changed.

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The library's own padding: 0.4 × the core height above and below, 0.6 × it to each side.
const PAD_V = 0.4;
const PAD_H = 0.6;

/** The box without the library's padding. */
export function core(b: Box): Box {
  const h = b.height / (1 + 2 * PAD_V);
  const w = Math.max(1, b.width - 2 * PAD_H * h);
  return { x: b.x + PAD_H * h, y: b.y + PAD_V * h, width: w, height: h };
}

const centreIn = (outer: Box, inner: Box) => {
  const cx = inner.x + inner.width / 2;
  const cy = inner.y + inner.height / 2;
  return cx > outer.x && cx < outer.x + outer.width && cy > outer.y && cy < outer.y + outer.height && inner.width * inner.height * 4 < outer.width * outer.height;
};

/**
 * The boxes that are text. `contrast` gives the ink contrast inside a box (0–1: the spread between its darkest and
 * lightest pixels); without it only nesting is checked.
 */
export function dropNonTextBoxes<T extends Box>(boxes: T[], contrast?: (b: Box) => number): T[] {
  if (boxes.length < 3) return boxes;
  const cores = boxes.map(core);
  const c = contrast ? cores.map(contrast) : null;
  const typical = c ? [...c].sort((a, b) => a - b)[Math.floor(c.length / 2)] : 0;
  return boxes.filter((_, i) => {
    if (c && c[i] < Math.max(0.1, typical * 0.35)) return false;
    let inside = 0;
    for (let j = 0; j < boxes.length; j++) if (j !== i && centreIn(cores[i], cores[j]) && ++inside >= 2) return false;
    return true;
  });
}

/** What the library passes to its post-processing: the normalised RGB image the detector saw. */
interface DetectionInput {
  tensor?: Float32Array;
  width: number;
  height: number;
  resizeRatio: number;
}

// The library's default normalisation (ImageNet mean and spread), used to turn the tensor back into pixel values.
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

/** Ink contrast inside a box, read from the detector's input: 95th minus 5th percentile of brightness, 0–1. */
export function contrastFrom(input: DetectionInput): (b: Box) => number {
  const { tensor, width, height, resizeRatio } = input;
  if (!tensor) return () => 1;
  const plane = width * height;
  const hist = new Uint32Array(64);
  return (b) => {
    const x0 = Math.max(0, Math.floor(b.x * resizeRatio));
    const y0 = Math.max(0, Math.floor(b.y * resizeRatio));
    const x1 = Math.min(width, Math.ceil((b.x + b.width) * resizeRatio));
    const y1 = Math.min(height, Math.ceil((b.y + b.height) * resizeRatio));
    const area = (x1 - x0) * (y1 - y0);
    if (area <= 0) return 1;
    const step = Math.max(1, Math.round(Math.sqrt(area / 20_000)));
    hist.fill(0);
    let n = 0;
    for (let y = y0; y < y1; y += step)
      for (let x = x0; x < x1; x += step) {
        const i = y * width + x;
        const r = tensor[i] * STD[0] + MEAN[0];
        const g = tensor[plane + i] * STD[1] + MEAN[1];
        const bl = tensor[2 * plane + i] * STD[2] + MEAN[2];
        const v = Math.min(1, Math.max(0, 0.299 * r + 0.587 * g + 0.114 * bl));
        hist[Math.min(63, Math.floor(v * 64))]++;
        n++;
      }
    const at = (q: number) => {
      let acc = 0;
      for (let k = 0; k < 64; k++) if ((acc += hist[k]) >= n * q) return (k + 0.5) / 64;
      return 1;
    };
    return at(0.95) - at(0.05);
  };
}

type Postprocess = (this: unknown, detection: unknown, input: DetectionInput, ...rest: unknown[]) => Box[];
interface DetectorClass {
  prototype: object;
}

const PATCHED = Symbol.for('evalua.dropNonTextBoxes');

/**
 * Applies `dropNonTextBoxes` to the library's detector (`DetectionService`). The method may live on it or on its base
 * class; whichever defines it is patched, once.
 */
export function installBoxFilter(DetectionService: DetectorClass): void {
  for (let proto = DetectionService.prototype as Record<string | symbol, unknown> | null; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto) as Record<string | symbol, unknown> | null) {
    if (!Object.prototype.hasOwnProperty.call(proto, 'postprocessDetection') || proto[PATCHED]) continue;
    const original = proto.postprocessDetection as Postprocess;
    proto.postprocessDetection = function (this: unknown, detection: unknown, input: DetectionInput, ...rest: unknown[]) {
      return dropNonTextBoxes(original.call(this, detection, input, ...rest), contrastFrom(input));
    };
    proto[PATCHED] = true;
  }
}
