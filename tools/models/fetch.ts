// Puts the OCR models and the ONNX runtime WebAssembly files under public/, so the app serves them itself
// and never asks a third party for anything. Run once after `npm install`:  npm run models
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { allModelFiles } from '../../src/ingest/ocrModels.ts';

const HF_BASE = 'https://huggingface.co/snowfluke/ppu-paddle-ocr-models/resolve/main';
const OUT = path.resolve('public/models');
const CACHE = path.join(os.homedir(), '.cache', 'ppu-paddle-ocr');

function findInCache(name: string): string | null {
  if (!existsSync(CACHE)) return null;
  for (const dir of readdirSync(CACHE)) {
    const p = path.join(CACHE, dir, name);
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

for (const rel of allModelFiles()) {
  const dest = path.join(OUT, rel);
  if (existsSync(dest)) continue;
  mkdirSync(path.dirname(dest), { recursive: true });
  const cached = findInCache(path.basename(rel));
  if (cached) {
    copyFileSync(cached, dest);
    console.log('copied  ', rel);
    continue;
  }
  const res = await fetch(`${HF_BASE}/${rel}`);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${rel}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log('fetched ', rel, `${(statSync(dest).size / 1048576).toFixed(1)} MB`);
}

// ONNX runtime (WASM-only build: the WebGPU binary is over Cloudflare Pages' 25 MB per-file limit).
const ortDist = path.resolve('node_modules/onnxruntime-web/dist');
const ortOut = path.resolve('public/ort');
mkdirSync(ortOut, { recursive: true });
for (const f of ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs']) copyFileSync(path.join(ortDist, f), path.join(ortOut, f));

let total = 0;
const walk = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else {
      total += statSync(p).size;
      if (statSync(p).size > 25 * 1048576) throw new Error(`${p} is over 25 MB and cannot be hosted on Cloudflare Pages`);
    }
  }
};
walk(OUT);
walk(ortOut);
console.log(`OCR assets ready: ${(total / 1048576).toFixed(0)} MB under public/models and public/ort`);
