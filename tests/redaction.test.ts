import { describe, expect, it } from 'vitest';
import { isRedactedValue } from '../src/core/extract.ts';
import { runExtraction } from '../src/core/pipeline.ts';
import { REDACTION_WARNING } from '../src/core/verify.ts';
import { docxHtmlToDoc } from '../src/ingest/docx.ts';
import { darkBoxes, hiddenItems, type PdfTextItem } from '../src/ingest/pdfText.ts';
import { maskBars } from '../src/ingest/prepare.ts';
import { combine, kb } from './helpers.ts';

describe('redacted values', () => {
  it('knows a value that was blacked out or replaced, and leaves real values alone', () => {
    for (const v of ['XXXXXXXX', 'xxxx xxxx', '********', '█████████', '[REDACTED]', '(removed)', 'Redacted', '[anonymized]', 'TACHADO', '<caviardé>']) expect(isRedactedValue(v), v).toBe(true);
    for (const v of ['KEBBEH Fatou', 'Xavier Ruiz', '2007-08-17', 'X', 'XX', 'B3', '5010230147']) expect(isRedactedValue(v), v).toBe(false);
  });
  it('reads redacted fields as redacted, never as a name, and says so once', () => {
    const ex = combine('<p>KOTU RIDGE SENIOR SECONDARY SCHOOL</p><p>STUDENT: XXXXXXXXXX</p><p>NUMBER: [REDACTED]</p><p>CLASS: GRADE 10</p><table><tr><th>Subject</th><th>Mark(%)</th></tr><tr><td>MATHEMATICS</td><td>80</td></tr></table>');
    expect(ex.student.name).toMatchObject({ value: '', redacted: true });
    expect(ex.student.id).toMatchObject({ value: '', redacted: true });
    expect(ex.flags.map((f) => f.id)).toContain('redacted');
    expect(ex.flags.map((f) => f.id)).not.toContain('no-name');
  });
});

// A white page with dark marks drawn in, as RGBA.
const page = (w: number, h: number, draw: (set: (x: number, y: number) => void) => void) => {
  const px = new Uint8Array(w * h * 4).fill(255);
  draw((x, y) => {
    const i = (y * w + x) * 4;
    px[i] = px[i + 1] = px[i + 2] = 10;
  });
  return px;
};
const lumAt = (px: Uint8Array, w: number, x: number, y: number) => px[(y * w + x) * 4];

describe('redaction bars on scans and photos', () => {
  it('paints out a solid black bar, even slightly tilted, so it cannot swallow the lines next to it', () => {
    const w = 400, h = 200;
    const px = page(w, h, (set) => {
      for (let x = 100; x < 300; x++) for (let y = 60; y < 76; y++) set(x, y + Math.round((x - 100) * 0.04));
    });
    expect(maskBars(px, w, h)).toBe(1);
    expect(lumAt(px, w, 200, 72)).toBe(255);
  });
  it('leaves text, table rules and large dark photographs alone', () => {
    const w = 400, h = 200;
    const px = page(w, h, (set) => {
      // A table rule: wide but thin.
      for (let x = 20; x < 380; x++) set(x, 30);
      // "Text": short strokes with gaps.
      for (let k = 0; k < 20; k++) for (let x = 40 + k * 12; x < 46 + k * 12; x++) for (let y = 100; y < 116; y++) set(x, y);
    });
    expect(maskBars(px, w, h)).toBe(0);
    expect(lumAt(px, w, 42, 108)).toBe(10);
  });
});

describe('failed redactions in PDFs', () => {
  // pdf.js operator codes for the operators used here.
  const OPS = { save: 10, restore: 11, transform: 12, constructPath: 91, fill: 22, eoFill: 23, fillStroke: 24, eoFillStroke: 25, setFillRGBColor: 59, setFillGray: 57, setFillColor: 55, setFillColorN: 56, setFillCMYKColor: 61 };
  // A black box at x 100–220, y 700–712 in PDF points (origin bottom-left) on an 842-point page.
  const ops = { fnArray: [OPS.setFillRGBColor, OPS.constructPath, OPS.setFillRGBColor, OPS.constructPath], argsArray: [['#000000'], [OPS.fill, [], [100, 700, 220, 712]], ['#ffffff'], [OPS.fill, [], [0, 0, 595, 842]]] };
  const item = (str: string, x: number, top: number): PdfTextItem => ({ str, transform: [10, 0, 0, 10, x, 842 - top - 10], width: str.length * 5, height: 10 });
  it('finds filled dark rectangles in the page’s drawing operators', () => {
    const boxes = darkBoxes(ops, OPS, 595, 842);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toMatchObject({ x: 100, w: 120 });
    expect(boxes[0].y).toBeCloseTo(842 - 712, 5);
  });
  it('hides text under a box only when it does not show on the rendered page', async () => {
    const boxes = darkBoxes(ops, OPS, 595, 842);
    const hidden = item('JALLOW Fatoumatta', 105, 131);
    const label = item('Candidate Name:', 20, 131);
    const render = (light: boolean) => async () => {
      const w = 595, h = 842;
      const rgba = page(w, h, (set) => {
        for (let x = 100; x < 220; x++) for (let y = 130; y < 142; y++) set(x, y);
      });
      if (light) for (let x = 110; x < 150; x++) for (let y = 134; y < 138; y++) { const i = (y * w + x) * 4; rgba[i] = rgba[i + 1] = rgba[i + 2] = 255; }
      return { rgba, width: w, height: h, scale: 1 };
    };
    expect([...(await hiddenItems([label, hidden], boxes, 842, render(false)))]).toEqual([hidden]);
    // White text on a dark heading bar is visible: kept.
    expect((await hiddenItems([label, hidden], boxes, 842, render(true))).size).toBe(0);
  });
  it('warns the counselor plainly, without the hidden text', () => {
    const doc = { ...docxHtmlToDoc('<p>Candidate Name:</p><table><tr><th>Subject</th><th>Grade</th></tr><tr><td>MATHEMATICS</td><td>B3</td></tr></table>'), hiddenText: { pages: [0], count: 3 } };
    const f = runExtraction(doc, kb).flags.find((x) => x.id === 'redaction-failed')!;
    expect(f.severity).toBe('important');
    expect(f.detail).toContain(REDACTION_WARNING);
    expect(f.detail).not.toMatch(/JALLOW|Fatoumatta/);
  });
});
