// GET /api/kb?year=2026-27 — the shared knowledge base (system profiles, subject concepts, district templates).
// Public reference data only: nothing here is about a student.
interface Env {
  KB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const year = url.searchParams.get('year');
  try {
    const latest = year ?? (await env.KB.prepare('SELECT MAX(school_year) AS y FROM kb_items').first<{ y: string }>())?.y;
    if (!latest) return Response.json({ error: 'The knowledge base is empty.' }, { status: 503 });
    const { results } = await env.KB.prepare('SELECT kind, id, data, added_on FROM kb_items WHERE school_year = ? ORDER BY kind, position')
      .bind(latest)
      .all<{ kind: string; id: string; data: string; added_on: string }>();
    const pick = (kind: string) => results.filter((r) => r.kind === kind).map((r) => JSON.parse(r.data));
    const version = results.reduce((v, r) => (r.added_on > v ? r.added_on : v), '');
    return Response.json(
      { schoolYear: latest, version: `${latest}/${version}/${results.length}`, concepts: pick('concept'), systems: pick('system'), districts: pick('district') },
      { headers: { 'Cache-Control': 'public, max-age=3600' } },
    );
  } catch (e) {
    return Response.json({ error: 'The knowledge base is unavailable.', detail: String(e) }, { status: 503 });
  }
};
