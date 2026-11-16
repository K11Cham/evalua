import { afterEach, describe, expect, it, vi } from 'vitest';
import { OLLAMA_UNREACHABLE, ollamaModels, ollamaProvider } from '../src/ai/provider.ts';

const answer = (translations: unknown) =>
  vi.fn(async () => new Response(JSON.stringify({ message: { content: JSON.stringify({ translations }) } }), { headers: { 'Content-Type': 'application/json' } }));

describe('local model (Ollama) answers', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('matches answers by their number, even when the model corrects the name or reorders the list', async () => {
    vi.stubGlobal('fetch', answer([{ n: 2, original: 'Биология', english: 'Biology' }, { n: 1, original: 'Информатика', english: 'Computer Science' }]));
    const out = await ollamaProvider('http://localhost:11434/', 'm').translateCourses(['Пиформатика', 'Бнодогия'], 'ru', 'Russia');
    expect(out).toEqual([{ original: 'Пиформатика', english: 'Computer Science' }, { original: 'Бнодогия', english: 'Biology' }]);
  });
  it('leaves a name blank rather than guess from position when the list is short', async () => {
    vi.stubGlobal('fetch', answer([{ original: 'Физика', english: 'Physics' }]));
    const out = await ollamaProvider('http://localhost:11434', 'm').translateCourses(['Фиика', 'Бнодогия'], 'ru', 'Russia');
    expect(out.map((t) => t.english)).toEqual(['', '']);
  });
  it('rejects answers that are not a course name', async () => {
    vi.stubGlobal('fetch', answer([{ n: 1, english: 'Here is the translation:\nPhysics' }]));
    const out = await ollamaProvider('http://localhost:11434', 'm').translateCourses(['Физика'], 'ru', 'Russia');
    expect(out[0].english).toBe('');
  });
  it('names what to check, browser permission included, when Ollama cannot be reached at all', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(ollamaProvider('http://localhost:11434', 'm').translateCourses(['Физика'], 'ru', 'Russia')).rejects.toThrow(OLLAMA_UNREACHABLE);
    await expect(ollamaModels('http://localhost:11434')).rejects.toThrow(/OLLAMA_ORIGINS[\s\S]*Allow/);
  });
  it('lists the installed models', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ models: [{ name: 'qwen2.5-coder:7b' }] }))));
    expect(await ollamaModels('http://localhost:11434/')).toEqual(['qwen2.5-coder:7b']);
  });
  it('says which model to check when Ollama answers with an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    await expect(ollamaProvider('http://localhost:11434', 'qwen2.5:7b').translateCourses(['Физика'], 'ru', 'Russia')).rejects.toThrow(/qwen2\.5:7b/);
  });
});
