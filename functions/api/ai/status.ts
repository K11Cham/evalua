// GET /api/ai/status — says whether the host has configured a server-side language model.
// By default none is configured and evalua runs on rules and dictionaries alone.
// To add one later: set AI_API_KEY (as a secret) and AI_MODEL on the Pages project, then add
// functions/api/ai/translate.ts that implements the provider interface in src/ai/provider.ts.
interface Env {
  AI_API_KEY?: string;
  AI_MODEL?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) =>
  Response.json({ available: Boolean(env.AI_API_KEY), model: env.AI_API_KEY ? (env.AI_MODEL ?? null) : null }, { headers: { 'Cache-Control': 'no-store' } });
