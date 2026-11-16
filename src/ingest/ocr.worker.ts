/// <reference lib="webworker" />
// OCR runs here, off the main thread, entirely inside the browser. Models and the WebAssembly runtime are
// loaded from this site's own /models and /ort folders: the image never leaves the device.
import * as ort from 'onnxruntime-web';
import { DetectionService, PaddleOcrService } from 'ppu-paddle-ocr/web';
import { installBoxFilter } from './detectFix.ts';
import { modelUrls, routeOcr, type OcrModelId, type OcrSegment } from './ocrModels.ts';

installBoxFilter(DetectionService as unknown as Parameters<typeof installBoxFilter>[0]);

const origin = self.location.origin;
ort.env.wasm.wasmPaths = `${origin}/ort/`;

export interface OcrRequest {
  id: number;
  image: ArrayBuffer;
  hint: OcrModelId | 'auto';
}
export type OcrResponse =
  | { id: number; ok: true; model: OcrModelId; tried: OcrModelId[]; lines: OcrSegment[][] }
  | { id: number; ok: false; error: string }
  | { id: number; progress: string };

interface Service {
  recognize(image: ArrayBuffer): Promise<{ lines: OcrSegment[][] }>;
}
const services = new Map<OcrModelId, Promise<Service>>();

function service(id: OcrModelId, reqId: number): Promise<Service> {
  let s = services.get(id);
  if (!s) {
    post({ id: reqId, progress: `Loading the ${id === 'main' ? 'reading' : id} model…` });
    s = (async () => {
      const svc = new PaddleOcrService({
        model: modelUrls(`${origin}/models`, id),
        session: { executionProviders: ['wasm'], graphOptimizationLevel: 'all' },
      } as ConstructorParameters<typeof PaddleOcrService>[0]);
      await svc.initialize();
      return svc as unknown as Service;
    })();
    services.set(id, s);
  }
  return s;
}

const post = (m: OcrResponse) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

self.onmessage = async (e: MessageEvent<OcrRequest>) => {
  const { id, image, hint } = e.data;
  try {
    const routed = await routeOcr(async (model) => {
      const svc = await service(model, id);
      post({ id, progress: model === 'main' ? 'Reading the page…' : `Trying the ${model} model…` });
      return (await svc.recognize(image.slice(0))).lines;
    }, hint);
    post({ id, ok: true, model: routed.model, tried: routed.tried, lines: routed.lines });
  } catch (err) {
    post({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
