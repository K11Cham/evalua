// GET /api/fetch?url=https://… — fetches a PUBLIC district document (course catalog, graduation policy)
// that a counselor linked, because a browser cannot read other sites directly.
// It is deliberately narrow: https only, documents only, size-capped, no cookies, nothing stored.
// Transcripts never come here: the app has no code path that sends one.
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = /^(application\/pdf|text\/html|text\/plain|text\/csv|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/octet-stream)/i;
const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|\d+\.\d+\.\d+\.\d+|\[.*\])$/i;

const fail = (status: number, error: string) => Response.json({ error }, { status });

export const onRequestGet: PagesFunction = async ({ request }) => {
  const raw = new URL(request.url).searchParams.get('url') ?? '';
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return fail(400, 'That is not a valid web address.');
  }
  if (target.protocol !== 'https:') return fail(400, 'Only https links can be fetched.');
  if (PRIVATE_HOST.test(target.hostname) || !target.hostname.includes('.')) return fail(400, 'That address cannot be fetched.');
  if (target.username || target.password) return fail(400, 'Links with a username or password cannot be fetched.');
  // Only same-site browser requests: this is not a general-purpose proxy.
  const site = request.headers.get('Sec-Fetch-Site');
  if (site && site !== 'same-origin') return fail(403, 'This endpoint is only for the evalua app.');

  let res: Response;
  try {
    res = await fetch(target.toString(), {
      redirect: 'follow',
      headers: { 'User-Agent': 'evalua-catalog-fetch/1.0', Accept: 'application/pdf,text/html,text/plain,*/*;q=0.5' },
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return fail(502, 'The site did not respond.');
  }
  if (!res.ok) return fail(502, `The site answered with an error (${res.status}).`);
  const type = res.headers.get('Content-Type') ?? 'application/octet-stream';
  if (!ALLOWED.test(type)) return fail(415, `That link is not a document evalua can read (${type.split(';')[0]}).`);
  const length = Number(res.headers.get('Content-Length') ?? 0);
  if (length > MAX_BYTES) return fail(413, 'That document is larger than 20 MB.');
  const body = await res.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return fail(413, 'That document is larger than 20 MB.');
  return new Response(body, {
    headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin' },
  });
};
