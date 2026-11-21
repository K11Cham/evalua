// GET /api/ai/status — says whether the host has configured a server-side language model.
// By default none is configured and evalua runs on rules and dictionaries alone.
// To add one: set AI_API_KEY (as a secret), AI_MODEL and AI_BASE_URL on the Pages project; translate.ts then answers.
// Never use a VITE_ variable for a key: Vite copies those into the browser bundle.
interface Env {
  AI_API_KEY?: string;
  AI_MODEL?: string;
  AI_BASE_URL?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const available = Boolean(env.AI_API_KEY && env.AI_MODEL && env.AI_BASE_URL);
  return Response.json({ available, model: available ? env.AI_MODEL : null }, { headers: { 'Cache-Control': 'no-store' } });
};
