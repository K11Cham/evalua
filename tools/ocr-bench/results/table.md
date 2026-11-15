| Engine | Course names found (exact) | Course names found (≥80% similar) | Name + grade on the same row | Median s/page | Failures |
|---|---|---|---|---|---|
| Docling 2.150 (Python, CPU, default OCR) | 69% | 79% | 77% | 17.6 | 0 |
| GLM-OCR 0.9B via Ollama (local GPU, RTX 5060) | 90% | 94% | 76% | 5.7 | 0 |
| PP-OCRv6 medium (ONNX) | 64% | 73% | 70% | 1.7 | 0 |
| PP-OCRv6 small (ONNX) | 64% | 75% | 71% | 0.5 | 0 |
| PP-OCRv6 tiny (ONNX) | 62% | 73% | 65% | 0.2 | 0 |
| PP-OCRv6 small + PP-OCRv5 per-script models (script supplied) | 78% | 91% | 83% | 0.6 | 0 |
| Tesseract.js 7, sparse mode (PSM 11) + row rebuild | 51% | 57% | 15% | 1.3 | 0 |
| Tesseract.js 7 (WASM, correct language supplied) | 7% | 9% | 0% | 1.4 | 0 |

Per-file “name + grade on the same row” recall:

| File | Docling 2.150 (Python, CPU, default OCR) | GLM-OCR 0.9B via Ollama (local GPU, RTX 5060) | PP-OCRv6 medium (ONNX) | PP-OCRv6 small (ONNX) | PP-OCRv6 tiny (ONNX) | PP-OCRv6 small + PP-OCRv5 per-script models (script supplied) | Tesseract.js 7, sparse mode (PSM 11) + row rebuild | Tesseract.js 7 (WASM, correct language supplied) |
|---|---|---|---|---|---|---|---|---|
| gm-wassce.photo.jpg | 100% | 100% | 100% | 78% | 78% | 78% | 0% | 11% |
| gm-gabece.scan.jpg | 100% | 100% | 78% | 78% | 100% | 78% | 0% | 0% |
| ng-sss.scan.jpg | 100% | 100% | 94% | 100% | 73% | 100% | 9% | 0% |
| ng-jamb.photo.jpg | 0% | 100% | 0% | 0% | 0% | 0% | 0% | 0% |
| ng-neco.scan.jpg | 90% | 100% | 90% | 70% | 100% | 70% | 30% | 0% |
| in-cbse.scan.png | 100% | 100% | 17% | 33% | 83% | 33% | 0% | 0% |
| ph-sf10.photo.jpg | 100% | 0% | 100% | 100% | 81% | 100% | 0% | 0% |
| cn-gaozhong.photo.jpg | 96% | 100% | 89% | 93% | 86% | 93% | 0% | 0% |
| mx-sep.photo.jpg | 94% | 100% | 92% | 97% | 81% | 97% | 3% | 0% |
| br-historico.scan.jpg | 100% | 0% | 100% | 100% | 91% | 100% | 97% | 0% |
| kr-record.scan.jpg | 0% | 81% | 0% | 0% | 0% | 96% | 0% | 0% |
| vn-hocba.scan.jpg | 74% | 91% | 48% | 48% | 48% | 74% | 4% | 0% |
| eg-thanaweya.scan.png | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| ru-attestat.photo.jpg | 0% | 100% | 0% | 0% | 0% | 7% | 0% | 0% |
| in-hindi-board.scan.jpg | 0% | 0% | 0% | 0% | 0% | 67% | 33% | 0% |
