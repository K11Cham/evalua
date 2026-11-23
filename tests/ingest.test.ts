import { describe, expect, it } from 'vitest';
import { parseCatalog } from '../src/core/catalog.ts';
import { estimateSkew } from '../src/ingest/deskew.ts';
import { routeOcr, type OcrSegment } from '../src/ingest/ocrModels.ts';
import { fixRtl, splitCells, unglueMarks } from '../src/ingest/ocrTokens.ts';
import { dropNonTextBoxes, type Box } from '../src/ingest/detectFix.ts';
import { pdfItemsToTokens, repairArabic } from '../src/ingest/pdfText.ts';
import { kb } from './helpers.ts';

describe('ingest helpers', () => {
  it('restores Arabic that OCR returns in visual order', () => {
    expect(fixRtl('ةيبرعلا ةغللا')).toBe('اللغة العربية');
    expect(fixRtl('٢٥ ةجرد')).toBe('درجة ٢٥');
    expect(fixRtl('Mathematics')).toBe('Mathematics');
  });
  it('repairs presentation-form Arabic from PDF text layers', () => {
    expect(repairArabic('ﺔﯿﺑﺮﻌﻟا ﺔﻐﻠﻟا')).toBe('اللغة العربية');
    expect(repairArabic('plain')).toBe('plain');
  });
  it('estimates page tilt from pixels', () => {
    const w = 320, h = 240;
    const img = new Uint8Array(w * h).fill(255);
    const slope = 0.05;
    for (let line = 30; line < 220; line += 22) for (let x = 20; x < 300; x++) for (let t = 0; t < 3; t++) img[Math.round(line + slope * (x - w / 2)) * w + x + t * w] = 20;
    expect(estimateSkew(img, w, h)).toBeCloseTo(slope, 2);
  });
  it('routes to a script-specific reader only when the main one cannot read the page', async () => {
    const seg = (text: string, confidence = 0.97): OcrSegment => ({ text, box: { x: 0, y: 0, width: 10, height: 10 }, confidence });
    const calls: string[] = [];
    const latin = await routeOcr(async (id) => (calls.push(id), [[seg('Mathematics'), seg('88')], [seg('English Language'), seg('91')], [seg('Physics'), seg('75')]]));
    expect(latin.model).toBe('main');
    expect(calls).toEqual(['main']);
    const korean = await routeOcr(async (id) => (id === 'korean' ? [[seg('국어 수학 영어 한국사 통합사회 통합과학 체육 음악 미술 기술가정 정보 문학')]] : [[seg(''), seg(''), seg('4')]]));
    expect(korean.model).toBe('korean');
  });
  it('reads a course catalog list', () => {
    const { courses, skipped } = parseCatalog('Course  Title  Credits\nMTH101  Algebra I  1.0\nSCI210, Biology, 1\n0471 AP Statistics\nPage 3', kb, kb.districts[0].requirements);
    expect(courses.map((c) => [c.code, c.title, c.credits, c.concepts[0]])).toEqual([
      ['MTH101', 'Algebra I', 1, 'math.algebra1'],
      ['SCI210', 'Biology', 1, 'sci.biology'],
      ['0471', 'AP Statistics', 1, 'math.statistics'],
    ]);
    expect(skipped).toBeGreaterThanOrEqual(1);
  });
});

describe('text detection boxes', () => {
  // Boxes as the library returns them, padded by 0.4 × the text height above and below and 0.6 × it at each side.
  const box = (x: number, y: number, width: number, height: number): Box => ({ x, y, width, height });
  const ink = (pale: Box[]) => (b: Box) => (pale.some((p) => Math.abs(p.y + p.height / 2 - (b.y + b.height / 2)) < 2 && Math.abs(p.x + p.width / 2 - (b.x + b.width / 2)) < 2) ? 0.05 : 0.7);
  it('drops a box whose core holds several lines, such as a panel or watermark behind a table', () => {
    const rows = [box(90, 380, 120, 24), box(560, 365, 55, 36), box(90, 420, 250, 24), box(560, 404, 53, 34)];
    const panel = box(0, 200, 1190, 400);
    expect(dropNonTextBoxes([...rows.slice(0, 2), panel, ...rows.slice(2)])).toEqual(rows);
  });
  it('drops a pale watermark letter lying over a single row, so the row is read on its own', () => {
    const lines = [box(101, 806, 256, 30), box(103, 851, 254, 25), box(493, 810, 57, 34), box(494, 854, 54, 30), box(666, 856, 54, 30)];
    const letterS = box(80, 861, 333, 259);
    const letterP = box(377, 868, 146, 101);
    const pale = [letterS, letterP].map((b) => ({ ...b }));
    // The contrast function is given each box's core; compare by centre.
    const contrast = (c: Box) => (pale.some((p) => { const k = { x: p.x + 0.6 * (p.height / 1.8), y: p.y + 0.4 * (p.height / 1.8), width: p.width - 1.2 * (p.height / 1.8), height: p.height / 1.8 }; return Math.abs(k.x - c.x) < 1 && Math.abs(k.y - c.y) < 1; }) ? 0.05 : 0.7);
    expect(dropNonTextBoxes([...lines, letterS, letterP], contrast)).toEqual(lines);
  });
  it('keeps a tall title whose padding reaches over the line below it', () => {
    // A phone photo's title, 84 px with padding, over "RESULT SLIP": only the padding overlaps it.
    const page = [box(363, 440, 816, 84), box(713, 496, 121, 25), box(346, 477, 46, 13), box(334, 718, 149, 29), box(1068, 685, 44, 36), box(334, 756, 129, 25)];
    expect(dropNonTextBoxes(page, ink([]))).toEqual(page);
  });
  it('keeps a heading that holds a small fragment, such as an accent found on its own', () => {
    const page = [box(80, 120, 520, 44), box(300, 128, 12, 10), box(90, 200, 120, 24), box(90, 240, 140, 24), box(400, 240, 50, 24)];
    expect(dropNonTextBoxes(page, ink([]))).toEqual(page);
  });
  it('keeps pale but real text, such as a grey footer, when it is not far fainter than the rest', () => {
    const page = [box(90, 200, 120, 24), box(90, 240, 140, 24), box(400, 240, 50, 24), box(400, 1600, 390, 25)];
    expect(dropNonTextBoxes(page, (b) => (b.y > 1500 ? 0.32 : 0.75))).toEqual(page);
  });
});

describe('PDF text layer words', () => {
  const item = (str: string, x: number, width: number, y = 700) => ({ str, transform: [10, 0, 0, 10, x, y], width, height: 10 });
  it('joins Latin words separated by a narrow space, even in a typewriter font', () => {
    expect(pdfItemsToTokens([item('FURTHER', 50, 40), item(' ', 90, 6), item('MATHEMATICS', 96, 70)], 800, 0).map((t) => t.text)).toEqual(['FURTHER MATHEMATICS']);
  });
  it('never joins right-to-left words, which come in visual order and are put in reading order later', () => {
    expect(pdfItemsToTokens([item('العربية', 50, 40), item(' ', 90, 4), item('اللغة', 94, 30)], 800, 0).map((t) => t.text)).toEqual(['العربية', 'اللغة']);
  });
});

describe('right-to-left detection in the PDF text layer', () => {
  const item = (str: string, x: number, width: number) => ({ str, transform: [10, 0, 0, 10, x, 700], width, height: 10 });
  it('still joins Korean, Chinese and other left-to-right scripts', () => {
    expect(pdfItemsToTokens([item('1학년', 50, 30), item(' ', 80, 4), item('1학기', 84, 30)], 800, 0).map((t) => t.text)).toEqual(['1학년 1학기']);
    expect(pdfItemsToTokens([item('第二', 50, 20), item(' ', 70, 4), item('学期', 74, 20)], 800, 0).map((t) => t.text)).toEqual(['第二 学期']);
  });
});

describe('cells OCR read as one piece of text', () => {
  const tok = (text: string) => ({ text, page: 0, x: 100, y: 50, w: 400, h: 20, conf: 0.9 });
  const texts = (text: string) => splitCells(tok(text)).map((t) => t.text);

  it('splits marks run together, when every piece is a mark with the same decimals', () => {
    expect(unglueMarks('85.0081.0085.0083.00')).toEqual(['85.00', '81.00', '85.00', '83.00']);
    expect(unglueMarks('7.55.0')).toEqual(['7.5', '5.0']);
    expect(unglueMarks('8.08.0')).toEqual(['8.0', '8.0']);
    expect(unglueMarks('83,7086.00')).toEqual(['83,70', '86.00']);
    // Not marks: a value over 100, a section number, a plain number.
    expect(unglueMarks('10.0110.0')).toBeNull();
    expect(unglueMarks('1.2.3')).toBeNull();
    expect(unglueMarks('85.5')).toBeNull();
  });

  it('separates a subject from its marks and places each at its share of the box', () => {
    expect(texts('ESPAÑOL (5) 7.0 8.08.0')).toEqual(['ESPAÑOL (5)', '7.0', '8.0', '8.0']);
    expect(texts('TECNOLOGIA(3)10.0 10.0')).toEqual(['TECNOLOGIA(3)', '10.0', '10.0']);
    expect(texts('8.6 7.0')).toEqual(['8.6', '7.0']);
    expect(texts('Español 5 3.3')).toEqual(['Español', '5', '3.3']);
    const parts = splitCells(tok('ABCDE 1.0 2.0'));
    expect(parts.map((t) => Math.round(t.x))).toEqual([100, 100 + Math.round((400 * 6) / 13), 100 + Math.round((400 * 10) / 13)]);
    expect(parts.every((t) => t.x + t.w <= 500.01)).toBe(true);
  });

  it('leaves labels, years and single whole numbers alone', () => {
    for (const s of ['GRADE 7', 'Days Present: 195', 'School Year: 2013-2014', 'SC1ENCE & TECHNOLOGY', 'Cívica III', '85.00', '4.776A 84 F'])
      expect(texts(s)).toEqual([s]);
  });
});
