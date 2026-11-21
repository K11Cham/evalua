// POST /api/ai/translate {names, language, system} — English names for course names, from a model the host configured.
// Off unless the Pages project has AI_API_KEY (a secret), AI_MODEL and AI_BASE_URL (any OpenAI-compatible
// chat-completions API, e.g. https://api.groq.com/openai/v1). The key is read here and never sent to the browser.
// Only course names arrive (see src/ai/provider.ts serverProvider); the prompt is built here (../../lib/aiGuard.ts).
import { checkTranslateBody, cleanAnswer, translatePrompt } from '../../lib/aiGuard';
import { checkCaller, RateLimit } from '../../lib/fetchGuard';

interface Env {
  AI_API_KEY?: string;
  AI_MODEL?: string;
  AI_BASE_URL?: string;
}

// Model calls cost the host money, so the limit is tighter than the catalog fetch's.
const limit = new RateLimit(10, 60_000);
const fail = (status: number, error: string) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.AI_API_KEY || !env.AI_MODEL || !env.AI_BASE_URL) return fail(503, 'No server model is configured on this site.');
  const caller = checkCaller(request.headers, new URL(request.url).origin);
  if (!caller.ok) return fail(caller.status, caller.error);
  if (!limit.allow(request.headers.get('CF-Connecting-IP') ?? 'unknown')) return fail(429, 'Too many requests in a minute. Wait a moment and try again.');
  if (Number(request.headers.get('Content-Length') ?? 0) > 8 * 1024) return fail(413, 'Too many course names in one request.');

  const body = checkTranslateBody(request.headers.get('Content-Type'), await request.text());
  if (!body.ok) return fail(body.status, body.error);

  let res: Response;
  try {
    res = await fetch(`${env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.AI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.AI_MODEL,
        temperature: 0,
        max_tokens: 60 * body.names.length + 100,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: translatePrompt(body) }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return fail(502, 'The model did not respond.');
  }
  // The provider's error body can echo request details, so only its status is passed on.
  if (!res.ok) return fail(502, `The model answered with an error (${res.status}).`);
  const data = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[] };
  return Response.json(cleanAnswer(data.choices?.[0]?.message?.content ?? '', body.names.length), { headers: { 'Cache-Control': 'no-store' } });
};
