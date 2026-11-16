import { describe, expect, it } from 'vitest';
import { parseCatalog } from '../src/core/catalog.ts';
import { estimateSkew } from '../src/ingest/deskew.ts';
import { routeOcr, type OcrSegment } from '../src/ingest/ocrModels.ts';
import { fixRtl } from '../src/ingest/ocrTokens.ts';
import { repairArabic } from '../src/ingest/pdfText.ts';
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
