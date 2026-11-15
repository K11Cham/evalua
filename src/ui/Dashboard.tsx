// The register: start a new evaluation, see every case and where it stands.
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { ACCEPT } from '../ingest/browser.ts';
import { OCR_MODELS, type OcrModelId } from '../ingest/ocrModels.ts';
import { caseLabel, deleteCase, listCases, nextNumber, now, putCase, putDoc, STATUS_ORDER, STATUS_LABEL, uid, type CaseRecord, type CaseStatus } from '../store/db.ts';
import { fmtDate, Icon, Stamp } from './bits.tsx';
import { go, useApp } from './state.tsx';

const HINTS: { id: OcrModelId | 'auto'; label: string }[] = [
  { id: 'auto', label: 'Detect automatically' },
  { id: 'main', label: 'Latin alphabet, Chinese or Japanese' },
  { id: 'korean', label: 'Korean' },
  { id: 'cyrillic', label: 'Cyrillic (Russian, Ukrainian…)' },
  { id: 'arabic', label: 'Arabic script (Arabic, Persian, Urdu)' },
  { id: 'devanagari', label: 'Devanagari (Hindi, Nepali, Marathi)' },
  { id: 'thai', label: 'Thai' },
  { id: 'greek', label: 'Greek' },
];

export function Dashboard() {
  const { kb, settings, ready } = useApp();
  const [cases, setCases] = useState<CaseRecord[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [over, setOver] = useState(false);
  const [districtId, setDistrictId] = useState(settings.districtId);
  const [hint, setHint] = useState<OcrModelId | 'auto'>('auto');
  const [filter, setFilter] = useState<CaseStatus | 'all'>('all');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setDistrictId(settings.districtId), [settings.districtId]);
  const refresh = () => listCases().then(setCases).catch((e) => setLoadError(String(e?.message ?? e)));
  useEffect(() => void refresh(), []);

  // "n" starts a new evaluation from anywhere on the page.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA|SELECT/.test(t.tagName)) input.current?.click();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  async function start(files: File[]) {
    setError('');
    if (!files.length) return;
    const bad = files.find((f) => f.size > 60 * 1024 * 1024);
    if (bad) return setError(`“${bad.name}” is larger than 60 MB. Use a smaller scan or split the file.`);
    if (files.length > 1 && files.some((f) => /\.docx$/i.test(f.name))) return setError('Add Word files one at a time. Several images or PDFs can be combined as pages of one record.');
    const id = uid();
    const rec: CaseRecord = {
      id, number: await nextNumber(), createdAt: now(), updatedAt: now(), status: 'uploaded',
      fileName: files.length === 1 ? files[0].name : `${files[0].name} + ${files.length - 1} more`,
      fileType: files[0].type || files[0].name.split('.').pop() || '', engine: '', districtId,
      extraction: null, overrides: {}, resolved: [], notes: [],
      log: [{ at: now(), by: settings.counselor || 'Counselor', action: 'Uploaded', detail: files.map((f) => f.name).join(', ') }],
    };
    await putDoc({ caseId: id, files: files.map((f) => ({ name: f.name, type: f.type, blob: f })), hint, tokens: null, previews: [] });
    await putCase(rec);
    go(`/case/${id}`);
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void start([...e.dataTransfer.files]);
  };

  const shown = (cases ?? []).filter((c) => filter === 'all' || c.status === filter);
  const district = (id: string) => kb.districts.find((d) => d.id === id)?.name ?? 'District not set';

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">Register of evaluations</div>
          <h1>Cases</h1>
        </div>
        <p className="lede" style={{ margin: 0 }}>
          Read an international transcript, see each course mapped to your district’s requirements with the reasoning shown, and decide. Nothing you add here leaves this device.
        </p>
      </div>

      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- drag-and-drop target; the button inside is the keyboard path */}
      <section className={`drop ${over ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop} aria-labelledby="new-h">
        <div className="drop-grid">
          <div style={{ display: 'grid', gap: 14 }}>
            <h2 id="new-h">New evaluation</h2>
            <p className="muted" style={{ margin: 0 }}>
              Drop a transcript here, or choose a file: PDF, Word (.docx), or a photo or scan (JPG, PNG, HEIC). Several photos become the pages of one record.
            </p>
            <div className="grid2">
              <label className="field">
                Receiving district and school year
                <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
                  {kb.districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.schoolYear}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Writing system of the document
                <select value={hint} onChange={(e) => setHint(e.target.value as OcrModelId | 'auto')}>
                  {HINTS.map((h) => (
                    <option key={h.id} value={h.id} title={h.id === 'auto' ? '' : OCR_MODELS[h.id as OcrModelId].label}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="row">
              <button className="btn primary" onClick={() => input.current?.click()} disabled={!ready}>
                <Icon name="upload" /> Choose a transcript
              </button>
              <span className="small muted">
                or press <kbd className="mono">N</kbd>
              </span>
              <a className="btn quiet" href="#/districts">
                Set up my district
              </a>
            </div>
            <input ref={input} type="file" accept={ACCEPT} multiple className="sr-only" tabIndex={-1} aria-label="Choose transcript files" onChange={(e) => { void start([...(e.target.files ?? [])]); e.target.value = ''; }} />
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
          </div>
          <ol className="steps" aria-label="How an evaluation goes">
            <li><span><strong>Upload.</strong> The file is read in your browser. It is never sent to a server.</span></li>
            <li><span><strong>Review.</strong> The original sits beside what was read. Click any field to see where it came from; correct anything.</span></li>
            <li><span><strong>Decide.</strong> Each suggested credit shows what it matched, why, how sure it is, and its source. You accept or change it.</span></li>
            <li><span><strong>Export.</strong> Print or save a PDF report, or download a CSV.</span></li>
          </ol>
        </div>
      </section>

      <div className="row" style={{ margin: '26px 0 10px', justifyContent: 'space-between' }}>
        <h2>All cases {cases && <span className="muted small mono">· {cases.length}</span>}</h2>
        <div className="row" role="group" aria-label="Filter by status">
          {(['all', ...STATUS_ORDER] as const).map((s) => (
            <button key={s} className={`btn small ${filter === s ? 'primary' : ''}`} aria-pressed={filter === s} onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="notice error" role="alert">
          <h3>Saved cases could not be opened</h3>
          This browser blocked local storage ({loadError}). Private-browsing windows often do this. Open evalua in a normal window.
        </div>
      )}
      {!cases && !loadError && (
        <div className="reading" aria-live="polite">
          <span className="muted">Opening the register…</span>
          <div className="lines"><i /><i /><i /></div>
        </div>
      )}
      {cases && cases.length === 0 && (
        <div className="empty">
          <h2>The register is empty</h2>
          <br />
          <p>Add a transcript above to open your first case. To try it out, use one of the fictitious sample transcripts linked on the Privacy page.</p>
        </div>
      )}
      {cases && cases.length > 0 && shown.length === 0 && <p className="muted">No cases with this status.</p>}
      {shown.length > 0 && (
        <div className="table-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>No.</th>
                <th>Student</th>
                <th>Record</th>
                <th>District</th>
                <th>Status</th>
                <th className="num">To verify</th>
                <th>Updated</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => {
                const open = (c.extraction?.flags ?? []).filter((f) => !c.resolved.includes(f.id)).length;
                return (
                  <tr key={c.id}>
                    <td className="mono">{caseLabel(c)}</td>
                    <td>
                      <a className="rowlink" href={`#/case/${c.id}`}>
                        {c.extraction?.student.name.value || 'Name not read yet'}
                      </a>
                      <span className="orig">{c.fileName}</span>
                    </td>
                    <td>
                      {c.extraction ? c.extraction.docType : c.error ? <span className="tag important">Could not be read</span> : <span className="muted">Not read yet</span>}
                      {c.extraction?.country.value && <span className="orig">{c.extraction.country.value}</span>}
                    </td>
                    <td className="small">{district(c.districtId)}</td>
                    <td><Stamp status={c.status} /></td>
                    <td className="num">{c.extraction ? (open ? <span className="tag check">{open}</span> : <span className="tag ok">0</span>) : '—'}</td>
                    <td className="small mono">{fmtDate(c.updatedAt)}</td>
                    <td>
                      <button className="btn small quiet" aria-label={`Delete case ${caseLabel(c)}`} onClick={async () => { if (confirm(`Delete case ${caseLabel(c)} and its document from this device? This cannot be undone.`)) { await deleteCase(c.id); void refresh(); } }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
