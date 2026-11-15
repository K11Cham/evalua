// District profiles: graduation requirements and course catalog per school year.
// Templates are state minimums; a counselor copies one and edits it into their own district's rules.
import { useEffect, useRef, useState } from 'react';
import { AREAS, areaLabel, parseCatalog } from '../core/catalog.ts';
import { buildRows, rowText } from '../core/layout.ts';
import type { DistrictProfile, Requirement } from '../core/types.ts';
import { ACCEPT, ingestFile } from '../ingest/browser.ts';
import { uid } from '../store/db.ts';
import { Freshness, Icon } from './bits.tsx';
import { go, schoolYearOf, useApp } from './state.tsx';

export function Districts() {
  const { kb, myDistricts, saveDistrict } = useApp();
  const templates = kb.districts.filter((d) => d.kind === 'template');

  const copy = async (d: DistrictProfile) => {
    const id = `my-${uid().slice(0, 8)}`;
    await saveDistrict({
      ...structuredClone(d), id, kind: 'district', name: d.name.replace(/ — .*$| \(.*\)$/, '') + ' — my district', schoolYear: schoolYearOf(),
      provenance: { ...d.provenance, schoolYear: schoolYearOf(), addedOn: new Date().toISOString().slice(0, 10) },
    });
    go(`/districts/${id}`);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">Receiving district</div>
          <h1>District profiles</h1>
        </div>
        <p className="lede" style={{ margin: 0 }}>
          Graduation requirements and the course catalog, per school year. Start from a state-minimum template, then add what your district requires. Profiles hold no student data and stay in this browser.
        </p>
      </div>

      <h2 style={{ marginBottom: 8 }}>My districts</h2>
      {myDistricts.length === 0 ? (
        <div className="empty" style={{ marginBottom: 24 }}>
          <h2>No district set up yet</h2>
          <br />
          <p>Copy a template below, then edit its requirements and add your course catalog. Until then, evaluations use a template.</p>
        </div>
      ) : (
        <div className="table-wrap" style={{ marginBottom: 24 }}>
          <table className="ledger">
            <thead>
              <tr>
                <th>District</th>
                <th>School year</th>
                <th className="num">Credits to graduate</th>
                <th className="num">Catalog courses</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {myDistricts.map((d) => (
                <tr key={d.id}>
                  <td><a className="rowlink" href={`#/districts/${encodeURIComponent(d.id)}`}>{d.name}</a></td>
                  <td className="mono">{d.schoolYear}</td>
                  <td className="num">{d.totalCredits}</td>
                  <td className="num">{d.catalog.length}</td>
                  <td><a className="btn small" href={`#/districts/${encodeURIComponent(d.id)}`}>Edit</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginBottom: 8 }}>State-minimum templates</h2>
      <div className="table-wrap">
        <table className="ledger">
          <thead>
            <tr>
              <th>Template</th>
              <th>Source and freshness</th>
              <th className="num">Total</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {templates.map((d) => (
              <tr key={d.id}>
                <td><a className="rowlink" href={`#/districts/${encodeURIComponent(d.id)}`}>{d.name}</a></td>
                <td><Freshness p={d.provenance} /></td>
                <td className="num">{d.totalCredits}</td>
                <td>
                  <button className="btn small" onClick={() => void copy(d)}>
                    <Icon name="plus" /> Copy to my districts
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function DistrictEditor({ id }: { id: string }) {
  const { kb, saveDistrict, removeDistrict, settings, saveSettings } = useApp();
  const original = kb.districts.find((d) => d.id === id);
  const [d, setD] = useState<DistrictProfile | null>(original ? structuredClone(original) : null);
  const [dirty, setDirty] = useState(false);
  const [paste, setPaste] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setD(original ? structuredClone(original) : null);
    setDirty(false);
  }, [id]); // eslint-disable-line

  if (!d) {
    return (
      <div className="notice error" role="alert">
        <h3>District profile not found</h3>
        <p>It may have been deleted from this browser.</p>
        <a className="btn" href="#/districts">All district profiles</a>
      </div>
    );
  }
  const readOnly = d.kind === 'template';
  const set = (change: (x: DistrictProfile) => void) => {
    const next = structuredClone(d);
    change(next);
    setD(next);
    setDirty(true);
  };
  const setReq = (i: number, change: (r: Requirement) => void) => set((x) => change(x.requirements[i]));

  const addCatalog = (text: string, from: string) => {
    const { courses, skipped } = parseCatalog(text, kb, d.requirements);
    if (!courses.length) return setMsg(`No course titles were recognised in ${from}.`);
    set((x) => {
      const have = new Set(x.catalog.map((c) => `${c.code ?? ''}|${c.title.toLowerCase()}`));
      const fresh = courses.filter((c) => !have.has(`${c.code ?? ''}|${c.title.toLowerCase()}`));
      // Replace the generic starter catalog the first time a real one is imported.
      x.catalog = x.catalog.every((c) => !c.code) && x.catalog.length <= 40 && from !== 'the pasted list' ? fresh : [...fresh, ...x.catalog];
    });
    setMsg(`${courses.length} courses read from ${from}${skipped ? `; ${skipped} lines skipped` : ''}. Check the subject column, then save.`);
  };

  const readFile = async (file: File, from: string) => {
    setBusy(`Reading ${file.name}…`);
    setMsg('');
    try {
      if (/\.(txt|csv|tsv)$/i.test(file.name) || file.type.startsWith('text/')) addCatalog(await file.text(), from);
      else {
        const { doc } = await ingestFile(file, 'main', setBusy);
        addCatalog(buildRows(doc).map(rowText).join('\n'), from);
        set((x) => void (x.provenance = { source: { title: `District catalog: ${file.name}`, document: file.name, url: link || undefined }, schoolYear: x.schoolYear, addedOn: new Date().toISOString().slice(0, 10) }));
      }
    } catch (e) {
      setMsg(`Could not read ${file.name}: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy('');
    }
  };

  const fetchLink = async () => {
    setBusy('Fetching the linked document…');
    setMsg('');
    try {
      const res = await fetch(`/api/fetch?url=${encodeURIComponent(link)}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: `HTTP ${res.status}` }))).error);
      const blob = await res.blob();
      const name = decodeURIComponent(link.split('/').pop()?.split('?')[0] || 'catalog') + (blob.type.includes('pdf') && !/\.pdf$/i.test(link) ? '.pdf' : blob.type.includes('html') ? '.txt' : '');
      const body = blob.type.includes('html') ? new Blob([(await blob.text()).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<\/(tr|p|li|h\d|div)>/gi, '\n').replace(/<[^>]+>/g, '  ')], { type: 'text/plain' }) : blob;
      await readFile(new File([body], name, { type: body.type }), 'the linked document');
    } catch (e) {
      setMsg(`The link could not be fetched: ${e instanceof Error ? e.message : e}. Download the file and upload it instead.`);
      setBusy('');
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">
            <a href="#/districts">District profiles</a> · {readOnly ? 'state-minimum template (read only)' : 'my district'}
          </div>
          <h1>{d.name}</h1>
        </div>
        <div className="row">
          {readOnly ? (
            <a className="btn" href="#/districts">Copy it from the list to edit</a>
          ) : (
            <>
              <button className="btn primary" disabled={!dirty} onClick={async () => { await saveDistrict(d); setDirty(false); setMsg('Saved in this browser.'); }}>
                Save changes
              </button>
              <button className="btn" disabled={settings.districtId === d.id} onClick={() => void saveSettings({ ...settings, districtId: d.id })}>
                {settings.districtId === d.id ? 'Default for new cases' : 'Use for new cases'}
              </button>
              <button className="btn danger" onClick={async () => { if (confirm('Delete this district profile from this browser?')) { await removeDistrict(d.id); go('/districts'); } }}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      <p><Freshness p={d.provenance} /></p>
      {msg && <div className="notice ok" role="status" style={{ marginBottom: 14 }}>{msg}</div>}

      <section className="panel">
        <h2>Basics</h2>
        <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
          <div className="grid2">
            <label className="field">District name<input type="text" value={d.name} onChange={(e) => set((x) => void (x.name = e.target.value))} /></label>
            <label className="field">State<input type="text" value={d.state} onChange={(e) => set((x) => void (x.state = e.target.value))} /></label>
            <label className="field">School year<input type="text" value={d.schoolYear} onChange={(e) => set((x) => void ((x.schoolYear = e.target.value), (x.provenance.schoolYear = e.target.value)))} /></label>
            <label className="field">Credits to graduate<input type="number" step="0.5" min="0" value={d.totalCredits} onChange={(e) => set((x) => void (x.totalCredits = +e.target.value))} /></label>
            <label className="field">Credits for one full-year course<input type="number" step="0.5" min="0.5" value={d.creditsPerYearCourse} onChange={(e) => set((x) => void (x.creditsPerYearCourse = +e.target.value || 1))} /></label>
            <label className="field">Hours of instruction per credit unit<input type="number" min="60" value={d.hoursPerUnit} onChange={(e) => set((x) => void (x.hoursPerUnit = +e.target.value || 120))} /></label>
            <label className="field">Credits a student normally earns in a year<input type="number" step="0.5" min="1" value={d.typicalCreditsPerYear} onChange={(e) => set((x) => void (x.typicalCreditsPerYear = +e.target.value || 6))} /></label>
            <label className="field">Source (policy title)<input type="text" value={d.provenance.source.title} onChange={(e) => set((x) => void (x.provenance.source.title = e.target.value))} /></label>
            <label className="field">Source link<input type="url" value={d.provenance.source.url ?? ''} placeholder="https://…" onChange={(e) => set((x) => void (x.provenance.source.url = e.target.value || undefined))} /></label>
          </div>
        </fieldset>
      </section>

      <section className="panel">
        <h2>Graduation requirements <span className="count">{d.requirements.reduce((a, r) => a + r.credits, 0)} credits listed</span></h2>
        <div className="table-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Requirement</th>
                <th className="num">Credits</th>
                <th>Subject areas that count</th>
                <th>Note</th>
                <th><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {d.requirements.map((r, i) => (
                <tr key={r.id}>
                  <td><input type="text" aria-label="Requirement name" value={r.label} disabled={readOnly} onChange={(e) => setReq(i, (x) => void (x.label = e.target.value))} /></td>
                  <td className="num"><input type="number" aria-label="Credits required" step="0.5" min="0" style={{ width: 72 }} value={r.credits} disabled={readOnly} onChange={(e) => setReq(i, (x) => void (x.credits = +e.target.value))} /></td>
                  <td>
                    <div className="row" style={{ gap: '2px 10px' }}>
                      {AREAS.map((a) => (
                        <label key={a} className="small" style={{ whiteSpace: 'nowrap' }}>
                          <input type="checkbox" disabled={readOnly || r.id === 'elective'} checked={r.areas.includes(a)} onChange={(e) => setReq(i, (x) => void (x.areas = e.target.checked ? [...x.areas, a] : x.areas.filter((y) => y !== a)))} /> {areaLabel(a)}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="small"><input type="text" aria-label="Note" value={r.note ?? ''} disabled={readOnly} onChange={(e) => setReq(i, (x) => void (x.note = e.target.value || undefined))} /></td>
                  <td>{!readOnly && r.id !== 'elective' && <button className="btn small quiet" onClick={() => set((x) => void x.requirements.splice(i, 1))} aria-label={`Remove ${r.label}`}>Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!readOnly && (
          <button className="btn small" style={{ marginTop: 10 }} onClick={() => set((x) => void x.requirements.splice(Math.max(0, x.requirements.length - 1), 0, { id: `req-${uid().slice(0, 6)}`, label: 'New requirement', credits: 1, areas: [] }))}>
            <Icon name="plus" /> Add a requirement
          </button>
        )}
      </section>

      <section className="panel">
        <h2>Local policy for foreign coursework</h2>
        <p className="small muted">Where these kinds of course count in your district. evalua’s defaults are only starting points.</p>
        <div className="grid2">
          {[
            ['wl.native', 'Language and literature in the student’s home language'],
            ['ela.efl', 'English studied abroad as a foreign language'],
            ['ss.religion', 'Religious studies'],
            ['cs', 'Computer science'],
          ].map(([cid, label]) => (
            <label className="field" key={cid}>
              {label}
              <select disabled={readOnly} value={d.conceptOverrides[cid] ?? ''} onChange={(e) => set((x) => { if (e.target.value) x.conceptOverrides[cid] = e.target.value; else delete x.conceptOverrides[cid]; x.policies = x.policies.filter((p) => p.id !== `concept:${cid}` || !e.target.value); if (e.target.value) x.policies.push({ id: `concept:${cid}`, title: label, text: `Counts toward “${x.requirements.find((r) => r.id === e.target.value)?.label}” under this district’s policy.`, source: { title: `${x.name} policy, as entered by the counselor` } }); })}>
                <option value="">evalua default</option>
                {d.requirements.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Course catalog <span className="count">{d.catalog.length} courses</span></h2>
        {!readOnly && (
          <div className="grid2" style={{ marginBottom: 14, alignItems: 'start' }}>
            <div>
              <label className="field">
                Paste course titles (one per line; an optional code first and credits last)
                <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'MTH101  Algebra I  1.0\nSCI210  Biology  1.0'} />
              </label>
              <button className="btn small" style={{ marginTop: 8 }} disabled={!paste.trim()} onClick={() => { addCatalog(paste, 'the pasted list'); setPaste(''); }}>Add pasted courses</button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <button className="btn small" onClick={() => fileRef.current?.click()} disabled={!!busy}><Icon name="upload" /> Upload the catalog (PDF, Word, CSV)</button>
                <input ref={fileRef} type="file" className="sr-only" tabIndex={-1} accept={ACCEPT + ',.csv,.txt'} aria-label="Upload a course catalog" onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f, f.name); e.target.value = ''; }} />
              </div>
              <label className="field">
                Or link to the catalog on your district’s website
                <span className="row" style={{ flexWrap: 'nowrap' }}>
                  <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.district.org/catalog.pdf" style={{ flex: 1 }} />
                  <button className="btn small" disabled={!/^https:\/\//.test(link) || !!busy} onClick={() => void fetchLink()}>Fetch</button>
                </span>
              </label>
              <span className="small muted">A catalog is a public document: the link is fetched through evalua’s server because browsers cannot read other sites directly. Uploaded files are read on this device.</span>
              {busy && <span role="status" className="small">{busy}</span>}
            </div>
          </div>
        )}
        <div className="table-wrap" style={{ maxHeight: 520, overflow: 'auto' }}>
          <table className="ledger">
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Subject</th>
                <th>Counts toward</th>
                <th className="num">Credits</th>
                <th><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {d.catalog.map((c, i) => (
                <tr key={`${c.code}-${c.title}-${i}`}>
                  <td className="mono small">{c.code ?? ''}</td>
                  <td>{c.title}</td>
                  <td>
                    <select aria-label={`Subject for ${c.title}`} disabled={readOnly} value={c.concepts[0] ?? ''} onChange={(e) => set((x) => void (x.catalog[i].concepts = e.target.value ? [e.target.value, ...x.catalog[i].concepts.slice(1).filter((y) => y !== e.target.value)] : []))}>
                      <option value="">Not matched</option>
                      {kb.concepts.map((k) => (
                        <option key={k.id} value={k.id}>{k.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select aria-label={`Requirement for ${c.title}`} disabled={readOnly} value={c.requirement} onChange={(e) => set((x) => void (x.catalog[i].requirement = e.target.value))}>
                      {d.requirements.map((r) => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                      {!d.requirements.some((r) => r.id === c.requirement) && <option value={c.requirement}>{c.requirement}</option>}
                    </select>
                  </td>
                  <td className="num">{c.credits}</td>
                  <td>{!readOnly && <button className="btn small quiet" onClick={() => set((x) => void x.catalog.splice(i, 1))} aria-label={`Remove ${c.title}`}>Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
