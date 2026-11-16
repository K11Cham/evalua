// Rules for /api/fetch, kept free of Cloudflare APIs so they can be unit-tested.
// The endpoint fetches a public district document a counselor linked from the Districts page.
// It must not work as a general proxy: only the evalua page itself may call it, only https
// documents on public hosts can be fetched (after every redirect too), and callers are rate limited.

export const MAX_BYTES = 20 * 1024 * 1024;
export const MAX_REDIRECTS = 5;

const DOCUMENT_TYPE = /^(application\/pdf|text\/html|text\/plain|text\/csv|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)\b/i;
const DOCUMENT_EXT = /\.(pdf|docx|csv|txt|html?)$/i;
const PRIVATE_SUFFIX = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|home\.arpa|localdomain)$/i;

export type Refusal = { ok: false; status: number; error: string };
export type Verdict = { ok: true } | Refusal;
const no = (status: number, error: string): Refusal => ({ ok: false, status, error });
const yes: Verdict = { ok: true };

/** Only the evalua page, in a browser, on this site. */
export function checkCaller(headers: Headers, selfOrigin: string): Verdict {
  if (headers.get('Sec-Fetch-Site') !== 'same-origin') return no(403, 'This endpoint is only for the evalua app.');
  const origin = headers.get('Origin');
  if (origin != null) return origin === selfOrigin ? yes : no(403, 'This endpoint is only for the evalua app.');
  // Browsers send no Origin on a same-origin GET; the app sends its Referer instead.
  const referer = headers.get('Referer');
  if (!referer) return no(403, 'This endpoint is only for the evalua app.');
  try {
    return new URL(referer).origin === selfOrigin ? yes : no(403, 'This endpoint is only for the evalua app.');
  } catch {
    return no(403, 'This endpoint is only for the evalua app.');
  }
}

/** An https address on a public host. Checked for the link and again for every redirect. */
export function checkTarget(raw: string): Verdict & { url?: URL } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return no(400, 'That is not a valid web address.');
  }
  if (url.protocol !== 'https:') return no(400, 'Only https links can be fetched.');
  if (url.username || url.password) return no(400, 'Links with a username or password cannot be fetched.');
  if (url.port && url.port !== '443') return no(400, 'That address cannot be fetched.');
  const host = url.hostname.replace(/\.$/, '').toLowerCase();
  // The URL parser turns every IPv4 spelling (decimal, hex, octal) into dotted form; IPv6 keeps its brackets.
  const ip = /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.startsWith('[');
  if (ip || !host.includes('.') || PRIVATE_SUFFIX.test(host)) return no(400, 'That address cannot be fetched.');
  return { ok: true, url };
}

/** A document type evalua can read. A generic binary type is accepted only for a link that names a document file. */
export function checkType(contentType: string | null, finalUrl: URL): Verdict {
  const type = (contentType ?? '').split(';')[0].trim();
  if (DOCUMENT_TYPE.test(type)) return yes;
  if ((type === 'application/octet-stream' || type === '') && DOCUMENT_EXT.test(finalUrl.pathname)) return yes;
  return no(415, `That link is not a document evalua can read (${type || 'unknown type'}).`);
}

/**
 * A small per-caller limit. It lives in the memory of one Cloudflare isolate, so it is a
 * speed bump rather than a guarantee, but it costs nothing and stores nothing.
 */
export class RateLimit {
  private hits = new Map<string, { n: number; until: number }>();
  constructor(
    private readonly max = 20,
    private readonly windowMs = 60_000,
  ) {}
  allow(key: string, now = Date.now()): boolean {
    const h = this.hits.get(key);
    if (!h || now >= h.until) {
      if (this.hits.size > 5000) for (const [k, v] of this.hits) if (now >= v.until) this.hits.delete(k);
      this.hits.set(key, { n: 1, until: now + this.windowMs });
      return true;
    }
    h.n++;
    return h.n <= this.max;
  }
}

/** Follows redirects by hand so every hop is checked. */
export async function fetchChecked(start: URL, doFetch: (url: string, init: RequestInit) => Promise<Response>): Promise<{ res: Response; url: URL } | Refusal> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: Response;
    try {
      res = await doFetch(url.toString(), {
        redirect: 'manual',
        headers: { 'User-Agent': 'evalua-catalog-fetch/1.0', Accept: 'application/pdf,text/html,text/plain,*/*;q=0.5' },
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      return no(502, 'The site did not respond.');
    }
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('Location');
      if (!next) return no(502, 'The site redirected without saying where.');
      const t = checkTarget(new URL(next, url).toString());
      if (!t.ok || !t.url) return t.ok ? no(400, 'That address cannot be fetched.') : (t as Refusal);
      url = t.url;
      continue;
    }
    return { res, url };
  }
  return no(502, 'The link redirects too many times.');
}
