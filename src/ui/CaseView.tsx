// The review workspace: original document on the left; what was read, what is suggested, and why, on the right.
import { Fragment, useMemo, useRef, useState } from 'react';
import { ACCEPT } from '../ingest/browser.ts';
import { activeProvider } from '../ai/provider.ts';
import { evaluate } from '../core/evaluate.ts';
import { READER_VERSION } from '../core/pipeline.ts';
import { groupByPeriod, periodKey } from '../core/periods.ts';
import { caseFlags } from '../core/verify.ts';
import type { ExtractedCourse, Field, SourceRef, Suggestion, USLetter, VerifyFlag } from '../core/types.ts';
import { download, evaluationCsv } from '../export/csv.ts';
import { caseLabel, DEFAULT_DISTRICT, deleteCase, now, STATUS_LABEL, STATUS_ORDER, uid, type CaseRecord } from '../store/db.ts';
import { Confidence, fmtDateTime, Icon, Source, Stamp } from './bits.tsx';
import { DocViewer } from './DocViewer.tsx';
import { go, useApp } from './state.tsx';
import { useCase } from './useCase.ts';

const LETTERS: USLetter[] = ['A', 'B', 'C', 'D', 'F', 'P', 'NC'];
const LEVELS = [9, 10, 11, 12];

export function CaseView({ id }: { id: string }) {
  const { kb, settings } = useApp();
  const who = settings.counselor || 'Counselor';
  const { rec, doc, missing, reading, notice, clearNotice, update, reread, addFiles } = useCase(id, kb, who);
  const addRef = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  const [highlight, setHighlight] = useState<SourceRef | null>(null);
  const [openWhy, setOpenWhy] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');

  const district = useMemo(() => kb.districts.find((d) => d.id === rec?.districtId) ?? (kb.districts.find((d) => d.id === DEFAULT_DISTRICT) ?? kb.districts[0]), [kb, rec?.districtId]);
  const evaluation = useMemo(() => (rec?.extraction ? evaluate(rec.extraction, kb, district, rec.overrides, rec.assume) : null), [rec?.extraction, rec?.overrides, rec?.assume, kb, district]);

  if (missing) {
    return (
      <div className="notice error" role="alert">
        <h3>This case is not on this device</h3>
        <p>Cases are stored only in the browser where they were created. It may have been deleted, or you may be using a different browser or device.</p>
        <a className="btn" href="#/">
          <Icon name="back" /> Back to all cases
        </a>
      </div>
    );
  }
  if (!rec || !doc) {
    return (
      <div className="reading" aria-live="polite">
        <span className="muted">Opening the case…</span>
        <div className="lines"><i /><i /><i /></div>
      </div>
    );
  }

  const ex = rec.extraction;
  const locked = rec.status === 'finalised';
  const show = (s?: SourceRef) => s && setHighlight({ ...s });
  // From an item that lists several courses: bring that row into view, put the cursor in its grade and show it on the original.
  const goToCourse = (courseId: string) => {
    const row = document.getElementById(`course-${courseId}`);
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row?.querySelector<HTMLInputElement>('input.grade')?.focus({ preventScroll: true });
    show(ex?.courses.find((c) => c.id === courseId)?.grade.source);
  };

  // ── edits ──
  const editField = (label: string, get: (c: CaseRecord) => Field<string>, value: string) => {
    const before = get(rec).value;
    if (before === value) return;
    update((c) => {
      const f = get(c);
      f.value = value;
      f.edited = true;
      f.confidence = 1;
    }, { action: `Changed ${label}`, detail: `“${before}” → “${value}”` });
  };
  const editCourse = (courseId: string, label: string, change: (c: ExtractedCourse) => void, detail: string) =>
    update((c) => {
      const course = c.extraction!.courses.find((x) => x.id === courseId);
      if (course) change(course);
    }, { action: `Changed ${label}`, detail });
  const override = (courseId: string, patch: Partial<NonNullable<CaseRecord['overrides'][string]>>, action: string, detail?: string) =>
    update((c) => {
      c.overrides[courseId] = { ...c.overrides[courseId], ...patch };
    }, { action, detail });

  const setStatus = (status: CaseRecord['status']) => update((c) => void (c.status = status), { action: `Status set to ${STATUS_LABEL[status]}` });

  const header = (
    <div className="case-head">
      <a className="btn quiet no-print" href="#/" aria-label="Back to all cases">
        <Icon name="back" /> Cases
      </a>
      <div>
        <div className="case-no">{caseLabel(rec)}</div>
        {/* Never a file name in place of the student's name: a file name can be anything. */}
        <h1 className={ex?.student.name.value ? '' : 'muted'}>{ex?.student.name.value || (ex ? 'Student name not found' : 'Not read yet')}</h1>
      </div>
      <Stamp status={rec.status} />
      <div className="case-actions">
        <label className="field" style={{ minWidth: 220 }}>
          <span className="sr-only">Receiving district</span>
          <select value={rec.districtId} disabled={locked} onChange={(e) => update((c) => void (c.districtId = e.target.value), { action: 'Changed district', detail: kb.districts.find((d) => d.id === e.target.value)?.name })}>
            {kb.districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.schoolYear}
              </option>
            ))}
          </select>
        </label>
        {ex && (
          <>
            <a className="btn primary" href={`#/case/${rec.id}/report`}>
              <Icon name="print" /> Report
            </a>
            <button className="btn" onClick={() => evaluation && download(`${caseLabel(rec)}-evaluation.csv`, evaluationCsv(ex, evaluation, { caseNo: caseLabel(rec), district: district.name, status: STATUS_LABEL[rec.status] }), 'text/csv')}>
              <Icon name="table" /> CSV
            </button>
          </>
        )}
        <button
          className="btn"
          disabled={locked || !!reading}
          title={locked ? 'Reopen the case to add documents' : 'Add later term reports, other years or missing pages to this case'}
          onClick={() => addRef.current?.click()}
        >
          <Icon name="plus" /> Add documents
        </button>
        <input
          ref={addRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose documents to add to this case"
          onChange={(e) => {
            addFiles([...(e.target.files ?? [])]);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );

  if (reading) {
    return (
      <>
        {header}
        <div className="panel reading" role="status" aria-live="polite">
          <h2>Reading the document</h2>
          <p className="muted">{reading}</p>
          <div className="lines"><i /><i /><i /><i /><i /></div>
          <p className="small muted">This happens on your device. The first scan or photo takes longer while the reading models load (about 35 MB, kept by your browser afterwards).</p>
        </div>
      </>
    );
  }

  if (!ex) {
    return (
      <>
        {header}
        <div className="notice error" role="alert">
          <h3>The document could not be read</h3>
          <p>{rec.error ?? 'Reading stopped before it finished.'}</p>
          <p className="small muted">The file is still stored on this device. Common causes: a password-protected PDF, a damaged file, or a browser that blocks WebAssembly.</p>
          <div className="row">
            <button className="btn primary" onClick={() => reread()}>
              <Icon name="redo" /> Try again
            </button>
            <button className="btn danger" onClick={async () => { if (confirm('Delete this case and its document from this device?')) { await deleteCase(rec.id); go('/'); } }}>
              Delete case
            </button>
          </div>
        </div>
      </>
    );
  }

  const sugOf = (cid: string) => evaluation?.suggestions.find((s) => s.courseId === cid);
  const flags: VerifyFlag[] = caseFlags(ex, evaluation?.flags);
  const openFlags = flags.filter((f) => !rec.resolved.includes(f.id));
  const periods = groupByPeriod(ex.courses).map((g) => ({ key: g.key, label: g.label, courses: g.items }));
  const pending = (evaluation?.suggestions ?? []).filter((s) => s.needsReview).length;
  const untranslated = ex.courses.filter((c) => c.translation === 'none' && c.name.original);
  // Years where the record shows a later term but not the earlier ones.
  const partialLevels = [...new Set(ex.courses.filter((c) => c.term && Number(c.term) > 1 && c.level != null && !c.wholeYear).map((c) => c.level!))].sort();
  const provider = activeProvider(settings);
  const system = kb.systems.find((s) => s.id === ex.systemId.value);

  return (
    <>
      {header}
      {notice && (
        <div className={`notice ${notice.kind === 'ok' ? 'ok' : 'error'}`} role={notice.kind === 'ok' ? 'status' : 'alert'} style={{ marginBottom: 14, display: 'flex', gap: 12, alignItems: 'start' }}>
          <span style={{ flex: 1 }}>{notice.text}</span>
          <button className="btn small quiet" onClick={clearNotice}>
            Dismiss
          </button>
        </div>
      )}
      {!locked && doc.tokens && (ex.reader ?? 1) < READER_VERSION && (
        <div className="notice check" role="status" style={{ marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ flex: 1 }}>
            This case was read by an earlier version of evalua. Reading has improved since: when a record is made of several reports, each report's grade level, school year and term are now read on their own. Read it again to update the courses. Your corrections, decisions and notes are kept.
          </span>
          <button className="btn small primary" onClick={() => reread({ reuseTokens: true, keepWork: true, action: 'Read again with the updated reader' })}>
            Read again
          </button>
        </div>
      )}
      <div className="workspace">
        {doc.tokens && (
          // Documents can also be dropped onto the original to add them to the case.
          // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- drop target; the "Add documents" button is the keyboard path
          <div
            className={`drop-target ${dropping ? 'over' : ''}`}
            onDragOver={(e) => {
              if (locked) return;
              e.preventDefault();
              setDropping(true);
            }}
            onDragLeave={() => setDropping(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDropping(false);
              if (!locked) addFiles([...e.dataTransfer.files]);
            }}
          >
            <DocViewer doc={doc.tokens} previews={doc.previews} highlight={highlight} fileName={rec.fileName} />
            {dropping && <div className="drop-hint" aria-hidden="true">Drop to add to this case</div>}
          </div>
        )}
        <div>
          <nav className="subnav no-print" aria-label="Sections of this case">
            <a href="#verify" onClick={(e) => jump(e, 'verify')}>To verify ({openFlags.length})</a>
            <a href="#student" onClick={(e) => jump(e, 'student')}>Student</a>
            <a href="#courses" onClick={(e) => jump(e, 'courses')}>Courses ({ex.courses.length})</a>
            <a href="#placement" onClick={(e) => jump(e, 'placement')}>Placement</a>
            <a href="#requirements" onClick={(e) => jump(e, 'requirements')}>Requirements</a>
            <a href="#notes" onClick={(e) => jump(e, 'notes')}>Notes and changes</a>
            <span style={{ marginLeft: 'auto' }} className="row">
              {rec.status === 'extracted' && (
                <button className="btn small" onClick={() => setStatus('reviewed')} title="You have compared the extracted data with the original">
                  <Icon name="check" /> Mark reviewed
                </button>
              )}
              {rec.status === 'reviewed' && (
                <button className="btn small primary" onClick={() => setStatus('finalised')} title="Lock the evaluation">
                  <Icon name="check" /> Finalise
                </button>
              )}
              {STATUS_ORDER.indexOf(rec.status) > 1 && (
                <button className="btn small quiet" onClick={() => setStatus('extracted')}>
                  Reopen
                </button>
              )}
            </span>
          </nav>

          {locked && (
            <div className="notice ok" style={{ marginBottom: 14 }}>
              This evaluation is finalised and locked. Choose <strong>Reopen</strong> to change it.
            </div>
          )}

          {/* ── items to verify ── */}
          <section className="panel" id="verify" aria-labelledby="verify-h">
            <h2 id="verify-h">
              Items to verify <span className="count">{openFlags.length} open · {flags.length - openFlags.length} checked</span>
            </h2>
            {flags.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Nothing was flagged. Still compare the record with the original before finalising.</p>
            ) : (
              <ul className="flags">
                {flags.map((f) => {
                  const done = rec.resolved.includes(f.id);
                  return (
                    <li key={f.id} className={done ? 'done' : ''}>
                      <span className={`tag ${f.severity === 'important' ? 'important' : f.severity === 'check' ? 'check' : ''}`}>{f.severity === 'important' ? 'Important' : f.severity === 'check' ? 'Check' : 'Note'}</span>
                      <div>
                        <strong>{f.title}</strong>
                        <span className="small">{f.detail}</span>
                        {f.courseIds && (
                          <span className="course-links">
                            {f.courseIds.map((cid) => {
                              const c = ex.courses.find((x) => x.id === cid);
                              return c ? (
                                <button key={cid} className="btn small quiet" onClick={() => goToCourse(cid)} aria-label={`Go to ${c.name.original || c.name.value} in the course table`}>
                                  {c.name.original || c.name.value}
                                </button>
                              ) : null;
                            })}
                          </span>
                        )}
                      </div>
                      <div className="rowbtns">
                        {f.source && (
                          <button className="locate" onClick={() => show(f.source)} aria-label={`Show on the document: ${f.title}`} title="Show on the document">
                            <Icon name="locate" />
                          </button>
                        )}
                        {f.id.startsWith('load-') && evaluation && (
                          <button
                            className="btn small"
                            disabled={locked}
                            title={`Reduce each course in this year in proportion, so the year totals about ${district.typicalCreditsPerYear} credits`}
                            onClick={() => {
                              const lv = Number(f.id.replace('load-grade ', ''));
                              const rows = evaluation.suggestions.filter((x) => ex.courses.find((c) => c.id === x.courseId)?.level === lv && x.credits > 0);
                              const total = rows.reduce((a, x) => a + x.credits, 0);
                              const factor = district.typicalCreditsPerYear / total;
                              update((c) => rows.forEach((x) => void (c.overrides[x.courseId] = { ...c.overrides[x.courseId], credits: Math.max(0.25, Math.round(x.credits * factor * 4) / 4) })), { action: 'Scaled credits for a year', detail: `grade ${lv}: ${total} → about ${district.typicalCreditsPerYear}` });
                            }}
                          >
                            Scale to {district.typicalCreditsPerYear}
                          </button>
                        )}
                        <button
                          className="btn small"
                          disabled={locked}
                          aria-pressed={done}
                          onClick={() => update((c) => void (c.resolved = done ? c.resolved.filter((x) => x !== f.id) : [...c.resolved, f.id]), { action: done ? 'Reopened an item to verify' : 'Checked an item to verify', detail: f.title })}
                        >
                          {done ? 'Checked' : 'Mark checked'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ── student ── */}
          <section className="panel" id="student" aria-labelledby="student-h">
            <h2 id="student-h">Student and document</h2>
            <dl className="kv">
              <FieldRow label="Student name" f={ex.student.name} locked={locked} onShow={show} onChange={(v) => editField('student name', (c) => c.extraction!.student.name, v)} />
              <FieldRow label="Date of birth" f={ex.student.dob} type="date" locked={locked} onShow={show} onChange={(v) => editField('date of birth', (c) => c.extraction!.student.dob, v)} />
              <FieldRow label="Student ID" f={ex.student.id} locked={locked} onShow={show} onChange={(v) => editField('student ID', (c) => c.extraction!.student.id, v)} />
              <FieldRow label="School" f={ex.school.name} locked={locked} onShow={show} onChange={(v) => editField('school', (c) => c.extraction!.school.name, v)} />
              <FieldRow label="Country" f={ex.country} locked={locked} onShow={show} onChange={(v) => editField('country', (c) => c.extraction!.country, v)} />
              <dt>
                <label htmlFor="sys">Education system</label>
              </dt>
              <dd>
                <select
                  id="sys"
                  value={ex.systemId.value}
                  disabled={locked}
                  onChange={(e) => {
                    // Re-read with the chosen system; corrections and decisions carry over.
                    reread({ systemId: e.target.value, reuseTokens: true, keepWork: true });
                  }}
                >
                  {kb.systems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {system && (
                  <span className="orig">
                    {system.summary.slice(0, 150)}… <a href={`#/reference/${system.id}`}>Open profile</a>
                  </span>
                )}
              </dd>
              <dd>
                <Confidence value={ex.systemId.confidence} label="System match" />
              </dd>
              <dt>Read by</dt>
              <dd className="small">
                {rec.engine} <span className="muted">· rules and dictionaries (no language model)</span>
              </dd>
              <dd>
                <button className="btn small quiet" disabled={locked} onClick={() => confirm('Read the file again from scratch? Your edits to this case will be discarded.') && reread()}>
                  Read again
                </button>
              </dd>
            </dl>
          </section>

          {/* ── courses ── */}
          <section className="panel" id="courses" aria-labelledby="courses-h">
            <h2 id="courses-h">
              Courses and suggested credit <span className="count">{pending} need a decision</span>
            </h2>
            <p className="small muted">
              Suggestions follow <a href={`#/districts/${encodeURIComponent(district.id)}`}>{district.name}</a>. Credit is a local decision: change anything, then accept. A coloured edge marks rows that still need you.
            </p>
            <div className="row no-print" style={{ marginBottom: 10 }}>
              <button
                className="btn small"
                disabled={locked || !evaluation}
                onClick={() => {
                  const ok = evaluation!.suggestions.filter((s) => s.needsReview && s.confidence >= 0.8 && s.grade.letter && s.conceptId !== 'elective.other');
                  update((c) => ok.forEach((s) => void (c.overrides[s.courseId] = { ...c.overrides[s.courseId], accepted: true })), { action: 'Accepted high-confidence suggestions', detail: `${ok.length} courses` });
                }}
              >
                <Icon name="check" /> Accept all high-confidence rows
              </button>
              <button
                className="btn small"
                disabled={locked}
                onClick={() =>
                  update((c) => {
                    const last = c.extraction!.courses[c.extraction!.courses.length - 1];
                    c.extraction!.courses.push({
                      id: `m-${uid().slice(0, 8)}`, name: { value: '', original: '', confidence: 1, edited: true }, translation: 'same',
                      grade: { value: '', confidence: 1, edited: true }, period: last ? { ...last.period } : { value: '', confidence: 1 }, level: last?.level ?? null,
                      term: last?.term, academicYear: last?.academicYear,
                    });
                  }, { action: 'Added a course by hand' })
                }
              >
                <Icon name="plus" /> Add a course
              </button>
              {provider && untranslated.length > 0 && (
                <button
                  className="btn small"
                  disabled={locked || aiBusy}
                  title={`Sends ${untranslated.length} course names to ${provider.label}`}
                  onClick={async () => {
                    setAiBusy(true);
                    setAiError('');
                    try {
                      const out = await provider.translateCourses(untranslated.map((c) => c.name.original ?? ''), ex.language, ex.docType);
                      const got = out.filter((t) => t.english);
                      update((c) => {
                        for (const t of got) {
                          for (const x of c.extraction!.courses) {
                            if (x.translation === 'none' && x.name.original === t.original) {
                              x.name.value = t.english;
                              x.translation = 'model';
                            }
                          }
                        }
                      }, { action: 'Translated course names with a model', detail: `${got.length} of ${untranslated.length} names, using ${provider.label}` });
                    } catch (e) {
                      setAiError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setAiBusy(false);
                    }
                  }}
                >
                  {aiBusy ? 'Translating…' : `Translate ${untranslated.length} names with the local model`}
                </button>
              )}
            </div>
            {aiError && (
              <div className="notice error" role="alert" style={{ marginBottom: 10 }}>
                The local model could not translate: {aiError}
              </div>
            )}
            {ex.courses.length === 0 ? (
              <div className="notice check">
                <h3>No courses were found</h3>
                <p className="small">Try a clearer scan, choose the writing system when uploading, or add the courses by hand with “Add a course”.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="ledger courses">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Grade</th>
                      <th>US subject · counts toward</th>
                      <th className="num">Credits</th>
                      <th>US grade</th>
                      <th>Confidence · decision</th>
                    </tr>
                  </thead>
                  {periods.map((p) => (
                    <tbody key={p.key}>
                      <tr>
                        <th className="period" colSpan={6} scope="rowgroup" aria-label={`Year or term: ${p.label || 'not printed'}`}>
                          <div className="row">
                            <span lang={ex.language}>
                              {p.label || 'No year or term printed'}{' '}
                              {p.courses[0].period.source && (
                                <button className="locate" style={{ color: '#d9d3c6' }} onClick={() => show(p.courses[0].period.source)} aria-label="Show this heading on the document">
                                  <Icon name="locate" />
                                </button>
                              )}
                            </span>
                            <label className="row small" style={{ gap: 6, fontWeight: 400 }}>
                              US grade level
                              <select
                                value={p.courses[0].level ?? ''}
                                disabled={locked}
                                onChange={(e) => {
                                  const lv = e.target.value ? +e.target.value : null;
                                  update((c) => c.extraction!.courses.filter((x) => periodKey(x) === p.key).forEach((x) => void ((x.level = lv), (x.levelByHand = true))), { action: 'Changed grade level', detail: `${p.label || 'document'} → ${lv ?? 'not set'}` });
                                }}
                              >
                                <option value="">Not set</option>
                                {LEVELS.map((l) => (
                                  <option key={l} value={l}>
                                    Grade {l}
                                  </option>
                                ))}
                                {p.courses[0].level != null && !LEVELS.includes(p.courses[0].level) && <option value={p.courses[0].level}>Grade {p.courses[0].level}</option>}
                              </select>
                            </label>
                          </div>
                        </th>
                      </tr>
                      {p.courses.map((c) => {
                        const s = sugOf(c.id);
                        const ov = rec.overrides[c.id] ?? {};
                        const cls = ov.exclude ? 'excluded' : s?.needsReview ? 'review' : 'accepted';
                        return (
                          <Fragment key={c.id}>
                            <tr className={cls} id={`course-${c.id}`}>
                              <td style={{ minWidth: 210 }}>
                                <input
                                  className={`name-en ${c.name.edited ? 'edited' : ''}`}
                                  aria-label="Course name in English"
                                  defaultValue={c.name.value}
                                  key={c.name.value}
                                  disabled={locked}
                                  placeholder="English name"
                                  onBlur={(e) => e.target.value !== c.name.value && editCourse(c.id, 'course name', (x) => { x.name.value = e.target.value; x.name.edited = true; if (!x.name.original) x.name.original = e.target.value; if (x.translation === 'none') x.translation = 'model'; }, `“${c.name.value}” → “${e.target.value}”`)}
                                />
                                <span className="orig" lang={ex.language}>
                                  {c.name.original && c.name.original !== c.name.value ? c.name.original : ''}
                                  {c.qualifier ? ` · ${c.qualifier}` : ''}
                                  {c.translation === 'none' && <span className="tag check" style={{ marginLeft: 6 }}>no translation</span>}
                                  {c.name.source && (
                                    <button className="locate" onClick={() => show(c.name.source)} aria-label={`Show “${c.name.original}” on the document`} title="Show on the document" style={{ verticalAlign: 'middle' }}>
                                      <Icon name="locate" />
                                    </button>
                                  )}
                                </span>
                              </td>
                              <td>
                                <div className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
                                  <input
                                    className={`grade ${c.grade.edited ? 'edited' : !c.grade.value || c.grade.confidence < 0.72 || (c.gradeWords && !c.gradeWords.agrees) ? 'doubt' : ''}`}
                                    title={c.grade.edited ? undefined : !c.grade.value ? 'Not readable: enter it from the original' : c.gradeWords && !c.gradeWords.agrees ? `The words beside it read “${c.gradeWords.text}” (${c.gradeWords.value})` : c.grade.confidence < 0.72 ? `May be misread (${Math.round(c.grade.confidence * 100)}% confidence): compare with the original` : undefined}
                                    aria-label={`Grade for ${c.name.value || 'course'}`}
                                    defaultValue={c.grade.value}
                                    key={c.grade.value}
                                    disabled={locked}
                                    onBlur={(e) => e.target.value !== c.grade.value && editCourse(c.id, 'grade', (x) => { x.grade.value = e.target.value; x.grade.edited = true; x.grade.confidence = 1; }, `${c.name.value}: “${c.grade.value}” → “${e.target.value}”`)}
                                  />
                                  {c.grade.source && (
                                    <button className="locate" onClick={() => show(c.grade.source)} aria-label={`Show the grade for ${c.name.value} on the document`} title="Show on the document">
                                      <Icon name="locate" />
                                    </button>
                                  )}
                                </div>
                                {c.gradeWords && !c.grade.edited && (
                                  <span className={`orig ${c.gradeWords.agrees ? '' : 'conflict'}`} lang={ex.language}>
                                    {c.gradeWords.agrees ? `matches “${c.gradeWords.text}”` : `words say “${c.gradeWords.text}” (${c.gradeWords.value})`}
                                  </span>
                                )}
                                {(c.credits || c.hours) && (
                                  <span className="orig mono">
                                    {c.credits ? `${c.credits.value} cr` : ''} {c.hours ? `${c.hours.value} h` : ''}
                                  </span>
                                )}
                              </td>
                              <td style={{ minWidth: 150 }}>
                                <select aria-label="US subject" value={s?.conceptId ?? ''} disabled={locked || ov.exclude} onChange={(e) => override(c.id, { conceptId: e.target.value, requirementId: undefined }, 'Changed US subject', `${c.name.value} → ${kb.concepts.find((k) => k.id === e.target.value)?.label}`)}>
                                  {kb.concepts.map((k) => (
                                    <option key={k.id} value={k.id}>
                                      {k.label}
                                    </option>
                                  ))}
                                </select>
                                <select aria-label="Counts toward" style={{ marginTop: 4 }} value={s?.requirementId ?? ''} disabled={locked || ov.exclude} onChange={(e) => override(c.id, { requirementId: e.target.value }, 'Changed requirement area', `${c.name.value} → ${district.requirements.find((r) => r.id === e.target.value)?.label}`)}>
                                  {district.requirements.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.label}
                                    </option>
                                  ))}
                                </select>
                                {s?.usCourse && <span className="orig"><strong>counts as {s.usCourse.title}</strong></span>}
                                {s?.catalogTitle && <span className="orig">closest catalog course: {s.catalogTitle}</span>}
                              </td>
                              <td className="num">
                                <input className="cr" type="number" min={0} max={20} step={0.25} aria-label="Suggested credits" value={s?.credits ?? 0} disabled={locked || ov.exclude} onChange={(e) => override(c.id, { credits: Math.max(0, +e.target.value) }, 'Changed credits', `${c.name.value} → ${e.target.value}`)} />
                                {s && s.share < 1 && <span className="orig mono" title="Fraction of a school year this row documents">{s.share} of a year</span>}
                              </td>
                              <td>
                                <select className="letter" aria-label="US letter grade" value={s?.grade.letter ?? ''} disabled={locked || ov.exclude} onChange={(e) => override(c.id, { letter: (e.target.value || undefined) as USLetter | undefined }, 'Changed US grade', `${c.name.value} → ${e.target.value || 'table value'}`)}>
                                  <option value="">—</option>
                                  {LETTERS.map((l) => (
                                    <option key={l} value={l}>
                                      {l}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ minWidth: 190 }}>
                                {s && <Confidence value={s.confidence} />}
                                <div className="rowbtns" style={{ marginTop: 4 }}>
                                  <button className="btn small" aria-expanded={openWhy === c.id} onClick={() => setOpenWhy(openWhy === c.id ? null : c.id)}>
                                    Why
                                  </button>
                                  {!ov.exclude && s?.needsReview && (
                                    <button className="btn small primary" disabled={locked} onClick={() => override(c.id, { accepted: true }, 'Accepted suggestion', c.name.value)} aria-label={`Accept the suggestion for ${c.name.value}`}>
                                      Accept
                                    </button>
                                  )}
                                  {!ov.exclude && s && !s.needsReview && <span className="tag ok" title={ov.accepted ? 'Accepted by a counselor' : 'High confidence'}>{ov.accepted ? 'Accepted' : 'OK'}</span>}
                                  <button className="btn small quiet" disabled={locked} onClick={() => override(c.id, { exclude: !ov.exclude }, ov.exclude ? 'Restored a course' : 'Excluded a course', c.name.value)} aria-label={ov.exclude ? `Restore ${c.name.value}` : `Leave ${c.name.value} out of the evaluation`}>
                                    {ov.exclude ? 'Restore' : 'Leave out'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {openWhy === c.id && s && (
                              <tr className="why">
                                <td colSpan={6}>
                                  <WhyPanel s={s} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  ))}
                </table>
              </div>
            )}
          </section>

          {/* ── placement ── */}
          {evaluation && (evaluation.placements.length > 0 || partialLevels.length > 0) && (
            <section className="panel" id="placement" aria-labelledby="place-h">
              <h2 id="place-h">Placement and expected coverage</h2>
              <p className="small muted">
                Credit above follows documented work. Placement follows what the student’s own system is expected to have covered by the date of this record, so you can continue them in the right course.
              </p>
              {partialLevels.length > 0 && (
                <fieldset className="assume" disabled={locked}>
                  <legend>Part of a year is on this record</legend>
                  {partialLevels.map((lv) => (
                    <label key={lv} className="small">
                      <input
                        type="checkbox"
                        checked={rec.assume?.earlierTermsDone.includes(lv) ?? false}
                        onChange={(e) =>
                          update((c) => {
                            const cur = c.assume?.earlierTermsDone ?? [];
                            c.assume = { earlierTermsDone: e.target.checked ? [...new Set([...cur, lv])] : cur.filter((x) => x !== lv) };
                          }, { action: e.target.checked ? 'Confirmed earlier terms completed' : 'Removed confirmation of earlier terms', detail: `grade ${lv}` })
                        }
                      />{' '}
                      The school or family confirms the earlier terms of grade {lv} were completed (count them with this report)
                    </label>
                  ))}
                </fieldset>
              )}
              {evaluation.placements.map((p) => (
                <div key={p.ladder} className="placement">
                  <h3>
                    {p.label} <span className="muted small">· as of {p.asOf}</span> <Confidence value={p.confidence} label="Placement confidence" />
                  </h3>
                  {p.continueIn && (
                    <p>
                      Continue in <strong>{p.continueIn.title}</strong>
                      {p.continueIn.catalogTitle && p.continueIn.catalogTitle !== p.continueIn.title ? ` (${p.continueIn.catalogTitle})` : ''}.
                    </p>
                  )}
                  <div className="req">
                    {p.steps.map((st) => (
                      <Fragment key={st.id}>
                        <div>
                          <strong>{st.title}</strong>
                        </div>
                        <div className={`bar ${st.coverage >= 0.75 ? 'full' : ''}`} role="img" aria-label={`${Math.round(st.coverage * 100)}% of ${st.title} expected to be covered`}>
                          <i style={{ width: `${Math.round(st.coverage * 100)}%` }} />
                        </div>
                        <div className="nums">{Math.round(st.coverage * 100)}%</div>
                      </Fragment>
                    ))}
                  </div>
                  <details style={{ marginTop: 8 }}>
                    <summary className="small">Why, topic by topic</summary>
                    <ol className="why-list" style={{ marginTop: 6 }}>
                      {p.reasons.map((r, i) => (
                        <li key={i}>
                          {r.text} {r.source && <Source source={r.source} />}
                        </li>
                      ))}
                      {p.steps
                        .filter((st) => st.coverage > 0 && st.coverage < 1 && st.missing.length)
                        .map((st) => (
                          <li key={st.id}>
                            {st.title}: covered — {st.covered.join('; ') || 'none'}; still to come — {st.missing.join('; ')}.
                          </li>
                        ))}
                    </ol>
                  </details>
                </div>
              ))}
            </section>
          )}

          {/* ── requirements ── */}
          {evaluation && (
            <section className="panel" id="requirements" aria-labelledby="req-h">
              <h2 id="req-h">
                Graduation requirements <span className="count">{district.schoolYear}</span>
              </h2>
              <p className="small muted">
                What the suggested credits cover in {district.name}, and what remains.{' '}
                {district.kind === 'template' && <strong>This is a state-minimum template, not your district’s rules.</strong>} <Source source={district.provenance.source} />
              </p>
              <div className="req" role="list">
                {evaluation.progress.map((p) => (
                  <Fragment key={p.requirementId}>
                    <div role="listitem">
                      <strong>{p.label}</strong>
                    </div>
                    <div className={`bar ${p.remaining === 0 && p.required > 0 ? 'full' : ''}`} role="img" aria-label={`${p.earned} of ${p.required} credits`}>
                      <i style={{ width: `${p.required ? Math.min(100, (p.earned / p.required) * 100) : 0}%` }} />
                    </div>
                    <div className="nums">
                      {p.earned} / {p.required}
                      {p.remaining > 0 ? <span className="muted"> · needs {p.remaining}</span> : p.required > 0 ? <span className="tag ok" style={{ marginLeft: 6 }}>met</span> : null}
                    </div>
                    {p.includes && p.includes.length > 0 && (
                      <ul className="includes">
                        {p.includes.map((i) => (
                          <li key={i.label}>
                            <span className={`tag ${i.met ? 'ok' : i.partial ? 'check' : ''}`}>{i.met ? 'on record' : i.partial ? 'in progress' : 'still needed'}</span> {i.label}
                            {i.expected && <span className="small"> — {i.expected}</span>}
                            {i.note && <span className="muted small"> — {i.note}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Fragment>
                ))}
              </div>
              <p style={{ marginTop: 12 }}>
                <strong>
                  {evaluation.totalEarned} of {evaluation.totalRequired}
                </strong>{' '}
                credits suggested in total. Requirements that only US coursework can meet (for example US history or state assessments) are not checked here.
              </p>
            </section>
          )}

          {/* ── notes and log ── */}
          <section className="panel" id="notes" aria-labelledby="notes-h">
            <h2 id="notes-h">Notes and change log</h2>
            <div className="grid2" style={{ alignItems: 'start' }}>
              <div>
                <label className="field">
                  Add a note
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: family will bring the original certificate on Friday." />
                </label>
                <button
                  className="btn small"
                  style={{ marginTop: 8 }}
                  disabled={!note.trim()}
                  onClick={() => {
                    update((c) => void c.notes.unshift({ id: uid(), at: now(), by: who, text: note.trim() }), { action: 'Added a note' });
                    setNote('');
                  }}
                >
                  Save note
                </button>
                <ul className="log" style={{ marginTop: 12 }}>
                  {rec.notes.map((n) => (
                    <li key={n.id}>
                      <time dateTime={n.at}>{fmtDateTime(n.at)}</time> · {n.by}
                      <br />
                      {n.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 style={{ marginBottom: 6 }}>What changed, and who changed it</h3>
                <ul className="log">
                  {[...rec.log].reverse().map((l, i) => (
                    <li key={i}>
                      <time dateTime={l.at}>{fmtDateTime(l.at)}</time> · {l.by} · <strong>{l.action}</strong>
                      {l.detail ? `: ${l.detail}` : ''}
                    </li>
                  ))}
                </ul>
                {!settings.counselor && (
                  <p className="small muted">
                    Changes are recorded as “Counselor”. Add your name in <a href="#/settings">Settings</a>.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function jump(e: React.MouseEvent, id: string) {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ block: 'start' });
  document.getElementById(id)?.querySelector<HTMLElement>('h2')?.focus?.();
}

function FieldRow({ label, f, onChange, onShow, locked, type = 'text' }: { label: string; f: Field<string>; onChange(v: string): void; onShow(s?: SourceRef): void; locked: boolean; type?: string }) {
  const id = `f-${label.replace(/\W+/g, '-')}`;
  return (
    <>
      <dt>
        <label htmlFor={id}>{label}</label>
      </dt>
      <dd>
        <input id={id} type={type} className={f.edited ? 'edited' : ''} defaultValue={f.value} key={f.value} disabled={locked} onBlur={(e) => onChange(e.target.value)} />
        {f.original && f.original !== f.value && <span className="orig">as printed: {f.original}</span>}
      </dd>
      <dd className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
        {f.edited ? <span className="tag ok">edited</span> : f.value ? <Confidence value={f.confidence} /> : <span className="tag check">not found</span>}
        {f.source && (
          <button className="locate" onClick={() => onShow(f.source)} aria-label={`Show ${label} on the document`} title="Show on the document">
            <Icon name="locate" />
          </button>
        )}
      </dd>
    </>
  );
}

function WhyPanel({ s }: { s: Suggestion }) {
  return (
    <div>
      <div className="row small" style={{ marginBottom: 6 }}>
        <strong>Why this suggestion</strong>
        <Confidence value={s.confidence} label="Overall confidence" />
        {s.grade.letter && <span className="tag">grade table: {s.grade.table}</span>}
      </div>
      <ol className="why-list">
        {s.reasons.map((r, i) => (
          <li key={i}>
            {r.text} {r.source && <Source source={r.source} />}
          </li>
        ))}
      </ol>
      {s.confidence < 0.7 && <p className="small" style={{ margin: '8px 0 0' }}><span className="tag check">Low confidence</span> Check this row against the original before accepting.</p>}
    </div>
  );
}
