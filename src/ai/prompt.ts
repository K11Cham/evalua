// The one prompt evalua sends to a model, shared by the browser (Ollama) and the server (/api/ai/translate), so the
// server builds the prompt itself and a caller can only send course names, never a prompt of its own.

// Measured with qwen2.5-coder 7B and 14B on OCR-damaged Russian names ("Фиика", "Бнодогия"): without the note on
// OCR slips and the numbered answers, the model guessed other subjects and answers could not be matched safely.
export const PROMPT = (names: string[], language: string, system: string) =>
  `These are course names from a school transcript (${system}; language code ${language}). They may have been read by OCR, which can change or drop a letter, so read each as the closest real school subject in that language. ` +
  `Give the plain English course name a US school registrar would use, keeping a course number or level only when one is printed (I, II, HL); never add one. If you are not sure, give an empty string. ` +
  `Do not explain. Answer with JSON only, in this exact shape: {"translations":[{"n":1,"original":"…","english":"…"}]}\n\n` +
  names.map((n, i) => `${i + 1}. ${n}`).join('\n');
