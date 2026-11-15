import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Cross-origin isolation lets the OCR WebAssembly use several threads. Everything is same-origin, so it is safe.
const isolation = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' };

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The WASM-only ONNX runtime: its binary is small enough to self-host (the WebGPU one is not).
    alias: { 'onnxruntime-web': 'onnxruntime-web/wasm' },
  },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['onnxruntime-web'] },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  server: { headers: isolation, proxy: { '/api': 'http://127.0.0.1:8788' } },
  preview: { headers: isolation },
});
