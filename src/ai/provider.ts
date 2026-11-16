// Every model call goes through this interface. evalua works with no provider at all (rules and dictionaries);
// a provider only fills gaps, and what it returns is always shown as a suggestion a person can change.
import type { Settings } from '../store/db.ts';

export interface CourseTranslation {
  /** The name exactly as given. */
  original: string;
  /** English name, or '' if the model could not say. */
  english: string;
}

export interface AiProvider {
  id: 'none' | 'ollama' | 'server';
  /** Shown to the counselor so they know where text is sent. */
  label: string;
  /** Translates course names. `language` is a BCP-47 hint; `system` describes the education system. */
  translateCourses(names: string[], language: string, system: string): Promise<CourseTranslation[]>;
}

// Measured with qwen2.5-coder 7B and 14B on OCR-damaged Russian names ("Фиика", "Бнодогия"): without the note on
// OCR slips and the numbered answers, the model guessed other subjects and answers could not be matched safely.
const PROMPT = (names: string[], language: string, system: string) =>
  `These are course names from a school transcript (${system}; language code ${language}). They may have been read by OCR, which can change or drop a letter, so read each as the closest real school subject in that language. ` +
  `Give the plain English course name a US school registrar would use, keeping a course number or level only when one is printed (I, II, HL); never add one. If you are not sure, give an empty string. ` +
  `Do not explain. Answer with JSON only, in this exact shape: {"translations":[{"n":1,"original":"…","english":"…"}]}\n\n` +
  names.map((n, i) => `${i + 1}. ${n}`).join('\n');

function parse(text: string, names: string[]): CourseTranslation[] {
  const json = /\{[\s\S]*\}/.exec(text)?.[0];
  if (!json) throw new Error('The model did not answer in the expected format.');
  const data = JSON.parse(json) as { translations?: { n?: number; original?: string; english?: string }[] };
  const list = data.translations ?? [];
  return names.map((n, i) => {
    // By the number asked for, then by the name as given; by position only when the list is complete.
    const hit = list.find((t) => t.n === i + 1) ?? list.find((t) => t.original === n) ?? (list.length === names.length ? list[i] : undefined);
    const english = (hit?.english ?? '').trim();
    // Reject answers that are not plausibly a course name.
    return { original: n, english: english.length > 0 && english.length <= 90 && !/\n/.test(english) ? english : '' };
  });
}

// A browser gives no reason when a request to this computer fails, so name the three things that block it. Checked on
// the live site: Ollama refuses a page whose address is not in OLLAMA_ORIGINS, and Chrome asks before a website may
// reach apps on this device (Local Network Access) and fails the request if the answer is Block.
export const OLLAMA_UNREACHABLE =
  'Could not reach Ollama. Check three things: that Ollama is running on this computer; that its OLLAMA_ORIGINS setting includes this page’s address (then quit and restart Ollama); and that this browser may reach apps on this device. If the browser asked, choose Allow; if it was blocked, allow it again in the site settings (the icon left of the address).';

/** fetch, with a network failure turned into a message that says what to check. */
async function reach(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(OLLAMA_UNREACHABLE);
  }
}

/** The models installed in Ollama at `url`. */
export async function ollamaModels(url: string): Promise<string[]> {
  const res = await reach(`${url.replace(/\/$/, '')}/api/tags`);
  if (!res.ok) throw new Error(`Ollama answered with an error (${res.status}).`);
  const j = (await res.json()) as { models?: { name: string }[] };
  return (j.models ?? []).map((m) => m.name);
}

/** A model running on the counselor's own computer through Ollama. Nothing leaves the machine. */
export function ollamaProvider(url: string, model: string): AiProvider {
  const base = url.replace(/\/$/, '');
  return {
    id: 'ollama',
    label: `${model} on this computer (Ollama)`,
    async translateCourses(names, language, system) {
      const res = await reach(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, stream: false, format: 'json', options: { temperature: 0 }, messages: [{ role: 'user', content: PROMPT(names, language, system) }] }),
      });
      if (!res.ok) throw new Error(`Ollama answered with an error (${res.status}). Check that the model “${model}” is installed.`);
      const data = (await res.json()) as { message?: { content?: string } };
      return parse(data.message?.content ?? '', names);
    },
  };
}

/**
 * A model configured by whoever hosts evalua, behind the server-side AI_API_KEY environment variable.
 * Off by default: /api/ai/status reports whether it exists. Course names (never whole transcripts) would be sent.
 */
export function serverProvider(model: string): AiProvider {
  return {
    id: 'server',
    label: `${model} (configured by this site's host)`,
    async translateCourses(names, language, system) {
      const res = await fetch('/api/ai/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names, language, system }) });
      if (!res.ok) throw new Error(`The server model answered with an error (${res.status}).`);
      return parse(JSON.stringify(await res.json()), names);
    },
  };
}

/** The provider to use, or null when evalua should run on rules alone. */
export function activeProvider(settings: Settings): AiProvider | null {
  if (settings.aiEnabled && settings.ollamaModel.trim()) return ollamaProvider(settings.ollamaUrl, settings.ollamaModel.trim());
  return null;
}
