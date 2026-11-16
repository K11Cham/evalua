import { describe, expect, it } from 'vitest';
import { checkCaller, checkTarget, checkType, fetchChecked, RateLimit } from '../functions/lib/fetchGuard.ts';

const SELF = 'https://evalua-5ly.pages.dev';
const h = (o: Record<string, string>) => new Headers(o);

describe('catalog fetch: who may call it', () => {
  it('accepts only the evalua page itself', () => {
    expect(checkCaller(h({ 'Sec-Fetch-Site': 'same-origin', Referer: `${SELF}/#/districts/x` }), SELF).ok).toBe(true);
    expect(checkCaller(h({ 'Sec-Fetch-Site': 'same-origin', Origin: SELF }), SELF).ok).toBe(true);
  });
  it('refuses a request with no browser headers (curl, scripts, other servers)', () => {
    expect(checkCaller(h({}), SELF)).toMatchObject({ ok: false, status: 403 });
    expect(checkCaller(h({ Referer: `${SELF}/` }), SELF)).toMatchObject({ ok: false, status: 403 });
  });
  it('refuses other sites, even when they claim same-origin', () => {
    expect(checkCaller(h({ 'Sec-Fetch-Site': 'cross-site', Origin: 'https://evil.example' }), SELF).ok).toBe(false);
    expect(checkCaller(h({ 'Sec-Fetch-Site': 'same-origin', Origin: 'https://evil.example' }), SELF).ok).toBe(false);
    expect(checkCaller(h({ 'Sec-Fetch-Site': 'same-origin', Referer: 'https://evalua-5ly.pages.dev.evil.example/' }), SELF).ok).toBe(false);
    expect(checkCaller(h({ 'Sec-Fetch-Site': 'same-origin' }), SELF).ok).toBe(false);
    expect(checkCaller(h({ 'Sec-Fetch-Site': 'same-origin', Referer: 'not a url' }), SELF).ok).toBe(false);
  });
});

describe('catalog fetch: what it may fetch', () => {
  it('allows https links on public hosts', () => {
    expect(checkTarget('https://www.jefferson.kyschools.us/academics/catalog.pdf').ok).toBe(true);
    expect(checkTarget('https://example.org:443/a').ok).toBe(true);
  });
  it('refuses everything else', () => {
    for (const bad of [
      'http://example.org/catalog.pdf',
      'ftp://example.org/x',
      'file:///etc/passwd',
      'https://localhost/x',
      'https://localhost./x',
      'https://printer.local/x',
      'https://wiki.corp/x',
      'https://router.home.arpa/x',
      'https://127.0.0.1/x',
      'https://169.254.169.254/latest/meta-data',
      'https://0x7f.1/x',
      'https://2130706433/x',
      'https://[::1]/x',
      'https://intranet/x',
      'https://user:pass@example.org/x',
      'https://example.org:8443/x',
      'not a link',
    ])
      expect([bad, checkTarget(bad).ok]).toEqual([bad, false]);
  });
  it('accepts documents, and a generic binary type only for a link that names a document', () => {
    const u = (s: string) => new URL(s);
    expect(checkType('application/pdf', u('https://a.org/x')).ok).toBe(true);
    expect(checkType('text/html; charset=utf-8', u('https://a.org/')).ok).toBe(true);
    expect(checkType('application/octet-stream', u('https://a.org/catalog.pdf')).ok).toBe(true);
    expect(checkType('application/octet-stream', u('https://a.org/download?id=3')).ok).toBe(false);
    expect(checkType('application/zip', u('https://a.org/catalog.pdf')).ok).toBe(false);
    expect(checkType('image/png', u('https://a.org/x.png')).ok).toBe(false);
    expect(checkType(null, u('https://a.org/x')).ok).toBe(false);
  });
});

describe('catalog fetch: redirects and rate limit', () => {
  const redirect = (to: string) => new Response(null, { status: 302, headers: { Location: to } });
  it('checks every redirect', async () => {
    const hops = ['https://a.org/start', 'https://b.org/catalog.pdf'];
    const seen: string[] = [];
    const got = await fetchChecked(new URL(hops[0]), async (u) => {
      seen.push(u);
      return u === hops[0] ? redirect('https://b.org/catalog.pdf') : new Response('pdf', { headers: { 'Content-Type': 'application/pdf' } });
    });
    expect(seen).toEqual(hops);
    expect('res' in got && got.url.toString()).toBe(hops[1]);
  });
  it('refuses a redirect to http or to a private host', async () => {
    for (const to of ['http://b.org/x', 'https://169.254.169.254/', 'https://localhost/', '/relative-is-fine']) {
      const got = await fetchChecked(new URL('https://a.org/'), async (u) => (u === 'https://a.org/' ? redirect(to) : new Response('ok', { headers: { 'Content-Type': 'text/plain' } })));
      expect([to, 'res' in got]).toEqual([to, to.startsWith('/')]);
    }
  });
  it('stops after too many redirects', async () => {
    let n = 0;
    const got = await fetchChecked(new URL('https://a.org/0'), async () => redirect(`https://a.org/${++n}`));
    expect(got).toMatchObject({ ok: false, status: 502 });
  });
  it('limits how often one caller can fetch', () => {
    const rl = new RateLimit(3, 1000);
    expect([1, 2, 3, 4].map(() => rl.allow('ip', 0))).toEqual([true, true, true, false]);
    expect(rl.allow('other', 0)).toBe(true);
    expect(rl.allow('ip', 1000)).toBe(true);
  });
});
