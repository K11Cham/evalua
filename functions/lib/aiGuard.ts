// Rules for /api/ai/translate, kept free of Cloudflare APIs so they can be unit-tested.
// The endpoint exists so a host can offer a model without the key ever reaching the browser: the key stays in the
// Pages project's secrets, the page sends only course names, and the server builds the prompt itself. It must not work
// as an open model proxy, so callers are limited to the evalua page, a small request, and a few calls a minute.
import { PROMPT } from '../../src/ai/prompt';

export const MAX_BODY_BYTES = 8 * 1024;
export const MAX_NAMES = 40;
export const MAX_NAME_CHARS = 120;
export const MAX_SYSTEM_CHARS = 80;
export const MAX_ANSWER_CHARS = 90;

export interface TranslateRequest {
  names: string[];
  language: string;
  system: string;
}

type Refusal = { ok: false; status: number; error: string };
const no = (status: number, error: string): Refusal => ({ ok: false, status, error });
// Control characters and line breaks would let a "name" start a new instruction line in the prompt.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
const LANGUAGE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$/;

/** The body as a translate request, or why it was refused. Checks size before parsing. */
export function checkTranslateBody(contentType: string | null, raw: string): ({ ok: true } & TranslateRequest) | Refusal {
  if (!/^application\/json\b/i.test(contentType ?? '')) return no(415, 'Send JSON.');
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return no(413, 'Too many course names in one request.');
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return no(400, 'That is not valid JSON.');
  }
  if (typeof data !== 'object' || data === null) return no(400, 'Expected names, language and system.');
  const { names, language, system } = data as Record<string, unknown>;
  if (!Array.isArray(names) || names.length === 0 || names.length > MAX_NAMES) return no(400, `Send between 1 and ${MAX_NAMES} course names.`);
  for (const n of names) {
    if (typeof n !== 'string' || !n.trim() || n.length > MAX_NAME_CHARS || CONTROL.test(n)) return no(400, `Each course name must be one line of at most ${MAX_NAME_CHARS} characters.`);
  }
  if (typeof language !== 'string' || !LANGUAGE.test(language)) return no(400, 'The language must be a language code such as "ru" or "es-MX".');
  if (typeof system !== 'string' || system.length > MAX_SYSTEM_CHARS || CONTROL.test(system)) return no(400, `The system must be one line of at most ${MAX_SYSTEM_CHARS} characters.`);
  return { ok: true, names: names as string[], language, system };
}

/** The prompt for a checked request: the caller never supplies any of its wording. */
export const translatePrompt = (r: TranslateRequest) => PROMPT(r.names, r.language, r.system);

/** Only the shape the page reads goes back, never the model's raw text. */
export function cleanAnswer(text: string, count: number): { translations: { n: number; original: string; english: string }[] } {
  const json = /\{[\s\S]*\}/.exec(text)?.[0];
  if (!json) return { translations: [] };
  let data: { translations?: unknown };
  try {
    data = JSON.parse(json) as { translations?: unknown };
  } catch {
    return { translations: [] };
  }
  const list = Array.isArray(data.translations) ? data.translations : [];
  const out: { n: number; original: string; english: string }[] = [];
  for (const t of list) {
    if (out.length === count) break;
    if (typeof t !== 'object' || t === null) continue;
    const { n, original, english } = t as Record<string, unknown>;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > count || out.some((o) => o.n === n)) continue;
    const e = typeof english === 'string' ? english.trim() : '';
    out.push({ n, original: typeof original === 'string' ? original.slice(0, MAX_NAME_CHARS) : '', english: e.length <= MAX_ANSWER_CHARS && !CONTROL.test(e) ? e : '' });
  }
  return { translations: out };
}
