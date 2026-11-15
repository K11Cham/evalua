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

const PROMPT = (names: string[], language: string, system: string) =>
  `These are course names from a school transcript (${system}; language code ${language}). ` +
  `Translate each into the plain English course name a US school registrar would use. Keep course numbers and levels (I, II, HL). ` +
  `Do not explain. Answer with JSON only, in this exact shape: {"translations":[{"original":"…","english":"…"}]}\n\n` +
  names.map((n, i) => `${i + 1}. ${n}`).join('\n');

function parse(text: string, names: string[]): CourseTranslation[] {
  const json = /\{[\s\S]*\}/.exec(text)?.[0];
  if (!json) throw new Error('The model did not answer in the expected format.');
  const data = JSON.parse(json) as { translations?: { original?: string; english?: string }[] };
  const list = data.translations ?? [];
  return names.map((n, i) => {
    const hit = list.find((t) => t.original === n) ?? list[i];
    const english = (hit?.english ?? '').trim();
    // Reject answers that are not plausibly a course name.
    return { original: n, english: english.length > 0 && english.length <= 90 && !/\n/.test(english) ? english : '' };
  });
}

/** A model running on the counselor's own computer through Ollama. Nothing leaves the machine. */
export function ollamaProvider(url: string, model: string): AiProvider {
  const base = url.replace(/\/$/, '');
  return {
    id: 'ollama',
    label: `${model} on this computer (Ollama)`,
    async translateCourses(names, language, system) {
      const res = await fetch(`${base}/api/chat`, {
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
