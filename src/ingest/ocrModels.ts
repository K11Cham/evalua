// OCR model table and automatic script routing (shared by the browser worker and the Node harness).
import { scriptCounts, type Script } from '../core/text.ts';

export type OcrModelId = 'main' | 'korean' | 'cyrillic' | 'arabic' | 'devanagari' | 'thai' | 'greek';

export interface OcrSegment {
  text: string;
  box: { x: number; y: number; width: number; height: number };
  confidence: number;
}

interface ModelDef {
  label: string;
  recognition: string;
  dictionary: string;
  /** Scripts this recogniser is the right choice for. */
  scripts: Script[];
}

/** One text detector is shared by every recogniser: PP-OCRv5 mobile detection found the most text on our test set. */
export const DETECTION = 'detection/PP-OCRv5_mobile_det_infer.onnx';

export const OCR_MODELS: Record<OcrModelId, ModelDef> = {
  main: {
    label: 'PP-OCRv6 small (Latin, Chinese, Japanese)',
    recognition: 'recognition/ort/PP-OCRv6_small_rec.ort',
    dictionary: 'recognition/ppocrv6_dict.txt',
    scripts: ['latin', 'han', 'kana'],
  },
  korean: {
    label: 'PP-OCRv5 Korean',
    recognition: 'recognition/multi/korean/v5/korean_PP-OCRv5_mobile_rec_infer.onnx',
    dictionary: 'recognition/multi/korean/v5/ppocrv5_korean_dict.txt',
    scripts: ['hangul'],
  },
  cyrillic: {
    label: 'PP-OCRv5 Cyrillic',
    recognition: 'recognition/multi/cyrillic/v5/cyrillic_PP-OCRv5_mobile_rec_infer.onnx',
    dictionary: 'recognition/multi/cyrillic/v5/ppocrv5_cyrillic_dict.txt',
    scripts: ['cyrillic'],
  },
  arabic: {
    label: 'PP-OCRv5 Arabic',
    recognition: 'recognition/multi/arabic/v5/arabic_PP-OCRv5_mobile_rec_infer.onnx',
    dictionary: 'recognition/multi/arabic/v5/ppocrv5_arabic_dict.txt',
    scripts: ['arabic'],
  },
  devanagari: {
    label: 'PP-OCRv5 Devanagari',
    recognition: 'recognition/multi/devanagari/v5/devanagari_PP-OCRv5_mobile_rec_infer.onnx',
    dictionary: 'recognition/multi/devanagari/v5/ppocrv5_devanagari_dict.txt',
    scripts: ['devanagari'],
  },
  thai: {
    label: 'PP-OCRv5 Thai',
    recognition: 'recognition/multi/th/v5/th_PP-OCRv5_mobile_rec_infer.onnx',
    dictionary: 'recognition/multi/th/v5/ppocrv5_th_dict.txt',
    scripts: ['thai'],
  },
  greek: {
    label: 'PP-OCRv5 Greek',
    recognition: 'recognition/multi/el/v5/el_PP-OCRv5_mobile_rec_infer.onnx',
    dictionary: 'recognition/multi/el/v5/ppocrv5_el_dict.txt',
    scripts: ['greek'],
  },
};

export const SCRIPT_MODELS: OcrModelId[] = ['korean', 'cyrillic', 'arabic', 'devanagari', 'thai', 'greek'];

export function modelUrls(base: string, id: OcrModelId) {
  const m = OCR_MODELS[id];
  const b = base.replace(/\/$/, '');
  return { detection: `${b}/${DETECTION}`, recognition: `${b}/${m.recognition}`, charactersDictionary: `${b}/${m.dictionary}` };
}

/** Every file the app needs to host for OCR. */
export function allModelFiles(): string[] {
  return [DETECTION, ...Object.values(OCR_MODELS).flatMap((m) => [m.recognition, m.dictionary])];
}

interface Stats {
  segments: number;
  emptyFrac: number;
  conf: number;
  letters: number;
  own: number;
}

function stats(lines: OcrSegment[][], id: OcrModelId): Stats {
  const segs = lines.flat();
  const filled = segs.filter((s) => s.text.trim());
  const counts = scriptCounts(filled.map((s) => s.text).join(''));
  const letters = Object.values(counts).reduce((a, b) => a + b, 0);
  const own = OCR_MODELS[id].scripts.reduce((a, s) => a + counts[s], 0);
  return {
    segments: segs.length,
    emptyFrac: segs.length ? 1 - filled.length / segs.length : 1,
    conf: filled.length ? filled.reduce((a, s) => a + s.confidence, 0) / filled.length : 0,
    letters,
    own,
  };
}

export interface RoutedOcr {
  model: OcrModelId;
  lines: OcrSegment[][];
  tried: OcrModelId[];
}

/**
 * Runs the main recogniser; if the page looks like a script it cannot read (many empty boxes or low confidence),
 * tries the per-script recognisers and keeps the one that produced the most text in its own script.
 */
export async function routeOcr(run: (id: OcrModelId) => Promise<OcrSegment[][]>, hint: OcrModelId | 'auto' = 'auto'): Promise<RoutedOcr> {
  if (hint !== 'auto') return { model: hint, lines: await run(hint), tried: [hint] };
  const main = await run('main');
  const ms = stats(main, 'main');
  const suspicious = ms.segments < 3 || ms.emptyFrac >= 0.1 || ms.conf < 0.9;
  if (!suspicious) return { model: 'main', lines: main, tried: ['main'] };
  const tried: OcrModelId[] = ['main'];
  let best: { model: OcrModelId; lines: OcrSegment[][] } = { model: 'main', lines: main };
  let bestOwn = 0;
  for (const id of SCRIPT_MODELS) {
    const lines = await run(id);
    tried.push(id);
    const s = stats(lines, id);
    if (s.own >= 25 && s.own >= 0.3 * s.letters && s.own > bestOwn) {
      bestOwn = s.own;
      best = { model: id, lines };
    }
  }
  return { ...best, tried };
}
