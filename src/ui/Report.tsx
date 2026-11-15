// Print-ready evaluation report. "Save as PDF" in the browser's print dialog produces the PDF:
// it handles every script with the device's own fonts and keeps the text selectable.
import { useEffect, useMemo, useState } from 'react';
import { evaluate } from '../core/evaluate.ts';
import type { SourceInfo } from '../core/types.ts';
import { caseLabel, getCase, STATUS_LABEL, type CaseRecord } from '../store/db.ts';
import { fmtDate, Icon } from './bits.tsx';
import { useApp } from './state.tsx';

export function Report({ id }: { id: string }) {
  const { kb, settings } = useApp();
  const [rec, setRec] = useState<CaseRecord | null | undefined>(undefined);
  useEffect(() => void getCase(id).then((r) => setRec(r ?? null)), [id]);
  const district = useMemo(() => kb.districts.find((d) => d.id === rec?.districtId) ?? kb.districts.find((d) => d.id === 'generic-22')!, [kb, rec?.districtId]);
  const ev = useMemo(() => (rec?.extraction ? evaluate(rec.extraction, kb, district, rec.overrides) : null), [rec, kb, district]);

  useEffect(() => {
    if (rec?.extraction) document.title = `${caseLabel(rec)} ${rec.extraction.student.name.value} — transcript evaluation`;
    return () => void (document.title = 'evalua');
  }, [rec]);

  if (rec === undefined) return <p className="muted">Opening the report…</p>;
  if (!rec || !rec.extraction || !ev) {
    return (
      <div className="notice error" role="alert">
        <h3>No report yet</h3>
        <p>This case has not been read, or it is not stored on this device.</p>
        <a className="btn" href="#/">Back to all cases</a>
      </div>
    );
  }
  const ex = rec.extraction;
  const system = kb.systems.find((s) => s.id === ex.systemId.value);
  const openFlags = [...ex.flags, ...ev.flags].filter((f) => !rec.resolved.includes(f.id));
  const periods: { label: string; ids: string[] }[] = [];
  for (const c of ex.courses) {
    if (rec.overrides[c.id]?.exclude) continue;
    const g = periods.find((p) => p.label === c.period.value);
    if (g) g.ids.push(c.id);
    else periods.push({ label: c.period.value, ids: [c.id] });
  }
  const tables = new Map<string, SourceInfo | undefined>();
  for (const s of ev.suggestions) if (s.grade.letter) tables.set(s.grade.table, s.grade.reasons[0]?.source);
  const draft = rec.status !== 'finalised';
  const gpaRows = ev.suggestions.filter((s) => s.grade.gpa != null && s.credits > 0);
  const gpa = gpaRows.length ? gpaRows.reduce((a, s) => a + s.grade.gpa! * s.credits, 0) / gpaRows.reduce((a, s) => a + s.credits, 0) : null;

  return (
    <>
      <div className="row no-print" style={{ marginBottom: 16, justifyContent: 'space-between' }}>
        <a className="btn quiet" href={`#/case/${rec.id}`}>
          <Icon name="back" /> Back to the case
        </a>
        <div className="row">
          <span className="small muted">In the print dialog choose “Save as PDF” to keep a file.</span>
          <button className="btn primary" onClick={() => window.print()}>
            <Icon name="print" /> Print or save as PDF
          </button>
        </div>
      </div>
      {draft && (
        <div className="notice check no-print" style={{ maxWidth: '8.5in', margin: '0 auto 14px' }}>
          This case is <strong>{STATUS_LABEL[rec.status].toLowerCase()}</strong>, not finalised: the report is marked DRAFT.
        </div>
      )}
      <article className="report">
        <header className="letterhead">
          <div>
            <h1>Transcript evaluation</h1>
            <div>
              {district.name} · school year {district.schoolYear}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono">{caseLabel(rec)}</div>
            <div>{fmtDate(new Date().toISOString())}</div>
            <div>
              <strong>{draft ? 'DRAFT — not final' : 'FINAL'}</strong>
            </div>
          </div>
        </header>

        <dl className="meta">
          <div><dt>Student</dt><dd>{ex.student.name.value || '—'}</dd></div>
          <div><dt>Date of birth</dt><dd>{ex.student.dob.value || '—'}</dd></div>
          <div><dt>Student ID</dt><dd>{ex.student.id.value || '—'}</dd></div>
          <div><dt>Sending school</dt><dd lang={ex.language}>{ex.school.name.value || '—'}</dd></div>
          <div><dt>Country</dt><dd>{ex.country.value || '—'}</dd></div>
          <div><dt>Record type</dt><dd>{ex.docType}</dd></div>
          <div><dt>Document</dt><dd>{rec.fileName}</dd></div>
          <div><dt>Prepared by</dt><dd>{settings.counselor || '________________'}</dd></div>
        </dl>

        <h2>Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Graduation requirement</th>
              <th className="num">Required</th>
              <th className="num">Suggested from this record</th>
              <th className="num">Still needed</th>
            </tr>
          </thead>
          <tbody>
            {ev.progress.map((p) => (
              <tr key={p.requirementId}>
                <td>{p.label}</td>
                <td className="num">{p.required}</td>
                <td className="num">{p.earned}</td>
                <td className="num">{p.remaining}</td>
              </tr>
            ))}
            <tr>
              <td><strong>Total</strong></td>
              <td className="num"><strong>{ev.totalRequired}</strong></td>
              <td className="num"><strong>{ev.totalEarned}</strong></td>
              <td className="num"><strong>{Math.max(0, ev.totalRequired - ev.totalEarned)}</strong></td>
            </tr>
          </tbody>
        </table>
        {gpa != null && (
          <p className="fine">
            Credit-weighted average of converted grades: {gpa.toFixed(2)} on a 4.0 scale ({gpaRows.length} graded courses). Shown for reference; districts differ on whether transfer grades enter the GPA.
          </p>
        )}

        <h2>Courses</h2>
        <table>
          <thead>
            <tr>
              <th>Course as printed</th>
              <th>English</th>
              <th>Grade</th>
              <th>US subject</th>
              <th>Counts toward</th>
              <th className="num">Credits</th>
              <th>US grade</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p, i) => [
              <tr className="period-row" key={`p${i}`}>
                <td colSpan={7} lang={ex.language}>
                  {p.label || 'No year or term printed'}
                  {(() => {
                    const lv = ex.courses.find((c) => c.id === p.ids[0])?.level;
                    return lv ? ` — US grade ${lv} equivalent` : '';
                  })()}
                </td>
              </tr>,
              ...p.ids.map((cid) => {
                const c = ex.courses.find((x) => x.id === cid)!;
                const s = ev.suggestions.find((x) => x.courseId === cid);
                const ov = rec.overrides[cid] ?? {};
                const decided = ov.conceptId || ov.requirementId || ov.credits != null || ov.letter;
                return (
                  <tr key={cid}>
                    <td lang={ex.language}>{c.name.original || c.name.value}</td>
                    <td>{c.name.value}</td>
                    <td className="mono">{c.grade.value || '—'}</td>
                    <td>{s?.conceptLabel}</td>
                    <td>{s?.requirementLabel}</td>
                    <td className="num">{s?.credits}</td>
                    <td>
                      {s?.grade.letter ?? '—'}
                      {decided ? <span className="mark" title="Set by the counselor">C</span> : s?.needsReview ? <span className="mark" title="Not yet confirmed">?</span> : null}
                    </td>
                  </tr>
                );
              }),
            ])}
          </tbody>
        </table>
        <p className="fine">
          <span className="mark">C</span> set or changed by the counselor. <span className="mark">?</span> suggested by evalua and not yet confirmed. Unmarked rows are accepted suggestions.
        </p>

        {openFlags.length > 0 && (
          <div className="keep">
            <h2>Items still to verify ({openFlags.length})</h2>
            <ul className="fine">
              {openFlags.map((f) => (
                <li key={f.id}>
                  <strong>{f.title}.</strong> {f.detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {rec.notes.length > 0 && (
          <div className="keep">
            <h2>Notes</h2>
            <ul className="fine">
              {rec.notes.map((n) => (
                <li key={n.id}>
                  {fmtDate(n.at)} · {n.by}: {n.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="keep">
          <h2>How this was prepared</h2>
          <ul className="fine">
            <li>The document was read on the counselor’s device by {rec.engine}; structure and subject matching used rules and dictionaries, not a language model.</li>
            {system && (
              <li>
                Education system profile: {system.name}. {system.provenance.source.title}
                {system.provenance.source.url ? ` (${system.provenance.source.url})` : ''}, added {fmtDate(system.provenance.addedOn)} for {system.provenance.schoolYear}.
              </li>
            )}
            {[...tables].map(([t, src]) => (
              <li key={t}>
                Grade conversion table: {t}
                {src?.url ? ` (${src.url})` : ''}.
              </li>
            ))}
            <li>Hours were converted at {district.hoursPerUnit} hours per Carnegie unit where the document prints hours.</li>
            <li>
              Requirements: {district.name}. {district.provenance.source.title}
              {district.provenance.source.url ? ` (${district.provenance.source.url})` : ''}.
              {district.kind === 'template' ? ' This is a state-minimum template; local requirements may be higher.' : ''}
            </li>
            <li>
              Credit for coursework completed abroad is a local decision. These are suggestions with their reasoning, for a counselor or registrar to confirm; this report does not certify that the source document is authentic.
            </li>
          </ul>
          <div className="sig">
            <div>Counselor / registrar signature and date</div>
            <div>Reviewed by (administrator) and date</div>
          </div>
        </div>
      </article>
    </>
  );
}
