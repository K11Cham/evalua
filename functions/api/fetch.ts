// GET /api/fetch?url=https://… — fetches a PUBLIC district document (course catalog, graduation policy)
// that a counselor linked, because a browser cannot read other sites directly.
// It is deliberately narrow (see ../lib/fetchGuard.ts): only the evalua page may call it, https documents
// on public hosts only (every redirect is checked), size-capped, rate limited, no cookies, nothing stored.
// Transcripts never come here: the app has no code path that sends one.
import { checkCaller, checkTarget, checkType, fetchChecked, MAX_BYTES, RateLimit } from '../lib/fetchGuard';

const limit = new RateLimit();
const fail = (status: number, error: string) => Response.json({ error }, { status });

export const onRequestGet: PagesFunction = async ({ request }) => {
  const self = new URL(request.url).origin;
  const caller = checkCaller(request.headers, self);
  if (!caller.ok) return fail(caller.status, caller.error);
  if (!limit.allow(request.headers.get('CF-Connecting-IP') ?? 'unknown')) return fail(429, 'Too many links fetched in a minute. Wait a moment and try again.');

  const target = checkTarget(new URL(request.url).searchParams.get('url') ?? '');
  if (!target.ok) return fail(target.status, target.error);

  const got = await fetchChecked(target.url!, (u, init) => fetch(u, init));
  if ('error' in got) return fail(got.status, got.error);
  const { res, url } = got;
  if (!res.ok) return fail(502, `The site answered with an error (${res.status}).`);
  const type = checkType(res.headers.get('Content-Type'), url);
  if (!type.ok) return fail(type.status, type.error);
  if (Number(res.headers.get('Content-Length') ?? 0) > MAX_BYTES) return fail(413, 'That document is larger than 20 MB.');
  const body = await res.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return fail(413, 'That document is larger than 20 MB.');
  return new Response(body, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
};
