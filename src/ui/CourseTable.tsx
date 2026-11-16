// The course table, organised for review: school years that open and close, terms inside them, a one-line summary
// on every heading, filters for what still needs a person, and "Next to decide" so nobody hunts through a long record.
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { groupByPeriod, groupByYear } from '../core/periods.ts';
import type { DistrictProfile, Evaluation, ExtractedCourse, Extraction, KnowledgeBase, SourceRef, Suggestion, USLetter } from '../core/types.ts';
import type { CaseRecord } from '../store/db.ts';
import { Confidence, Icon, Source } from './bits.tsx';
import { rowDoubts, type Doubt } from './doubts.ts';

const LETTERS: USLetter[] = ['A', 'B', 'C', 'D', 'F', 'P', 'NC'];
const LEVELS = [9, 10, 11, 12];

type Filter = 'all' | 'decide' | 'doubt' | 'model' | 'out';
type Override = NonNullable<CaseRecord['overrides'][string]>;

interface Props {
  ex: Extraction;
  rec: CaseRecord;
  evaluation: Evaluation | null;
  kb: KnowledgeBase;
  district: DistrictProfile;
  locked: boolean;
  toolbar: ReactNode;
  /** Bring this course into view (opening its year and term, clearing a filter that hides it). `n` re-triggers. */
  reveal: { id: string; n: number } | null;
  onShow(s?: SourceRef): void;
  override(courseId: string, patch: Partial<Override>, action: string, detail?: string): void;
  editCourse(courseId: string, label: string, change: (c: ExtractedCourse) => void, detail: string): void;
  setLevel(periodKeyValue: string, label: string, level: number | null): void;
}

interface Row {
  c: ExtractedCourse;
  s?: Suggestion;
  ov: Override;
  doubts: Doubt[];
  decide: boolean;
}

const chips = (ds: Doubt[]) =>
  ds.length > 0 && (
    <span className="doubts">
      {ds.map((d) => (
        <span key={d.text} className={`doubt-chip ${d.level}`}>
          {d.text}
        </span>
      ))}
    </span>
  );

const Chevron = () => (
  <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

function storageKey(id: string) {
  return `evalua.closed.${id}`;
}
function loadClosed(id: string): Set<string> | null {
  try {
    const v = localStorage.getItem(storageKey(id));
    return v ? new Set(JSON.parse(v) as string[]) : null;
  } catch {
    return null;
  }
}
function saveClosed(id: string, closed: Set<string>) {
  try {
    localStorage.setItem(storageKey(id), JSON.stringify([...closed]));
  } catch {
    // Remembering open years is a convenience; without storage they simply start open.
  }
}

export function CourseTable({ ex, rec, evaluation, kb, district, locked, toolbar, reveal, onShow, override, editCourse, setLevel }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [openWhy, setOpenWhy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const years = useMemo(() => groupByYear(groupByPeriod(ex.courses)), [ex.courses]);
  const rows = useMemo(() => {
    const m = new Map<string, Row>();
    for (const c of ex.courses) {
      const s = evaluation?.suggestions.find((x) => x.courseId === c.id);
      const ov = rec.overrides[c.id] ?? {};
      m.set(c.id, { c, s, ov, doubts: ov.exclude ? [] : rowDoubts(c, s, !!ov.conceptId), decide: !ov.exclude && !!s?.needsReview });
    }
    return m;
  }, [ex.courses, evaluation, rec.overrides]);
  const ordered = years.flatMap((y) => y.periods.flatMap((p) => p.items.map((c) => rows.get(c.id)!)));

  // Long records start with the years folded, except the first one that still needs a decision.
  const [closed, setClosedState] = useState<Set<string>>(() => {
    const saved = loadClosed(rec.id);
    if (saved) return saved;
    if (years.length < 2 || ex.courses.length <= 12) return new Set();
    const firstOpen = years.find((y) => y.periods.some((p) => p.items.some((c) => rows.get(c.id)?.decide))) ?? years[0];
    return new Set(years.filter((y) => y !== firstOpen).map((y) => y.key));
  });
  const setClosed = (next: Set<string>) => {
    setClosedState(next);
    saveClosed(rec.id, next);
  };
  const toggle = (key: string) => {
    const next = new Set(closed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setClosed(next);
  };

  const matches = (r: Row) =>
    filter === 'all' ? true : filter === 'decide' ? r.decide : filter === 'doubt' ? r.doubts.length > 0 : filter === 'model' ? r.c.translation === 'model' && !r.c.name.edited : !!r.ov.exclude;
  const count = (f: (r: Row) => boolean) => ordered.filter(f).length;
  const counts = {
    all: ordered.length,
    decide: count((r) => r.decide),
    doubt: count((r) => r.doubts.length > 0),
    model: count((r) => r.c.translation === 'model' && !r.c.name.edited),
    out: count((r) => !!r.ov.exclude),
  };
  const filtering = filter !== 'all';

  // Open whatever hides a course, then bring it into view and put the cursor on it.
  const bringIntoView = (id: string, focus: 'grade' | 'accept' = 'grade') => {
    const y = years.find((yy) => yy.periods.some((p) => p.items.some((c) => c.id === id)));
    const p = y?.periods.find((pp) => pp.items.some((c) => c.id === id));
    if (y && p && (closed.has(y.key) || closed.has(p.key))) {
      const next = new Set(closed);
      next.delete(y.key);
      next.delete(p.key);
      setClosed(next);
    }
    const r = rows.get(id);
    if (r && !matches(r)) setFilter('all');
    setFlash(id);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const row = document.getElementById(`course-${id}`);
        row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const target = focus === 'accept' ? row?.querySelector<HTMLElement>('button.accept') : row?.querySelector<HTMLInputElement>('input.grade');
        (target ?? row?.querySelector<HTMLElement>('input, button'))?.focus({ preventScroll: true });
      }),
    );
  };
  useEffect(() => {
    if (reveal) bringIntoView(reveal.id);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- only when a new reveal is asked for
  }, [reveal]);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1500);
    return () => clearTimeout(t);
  }, [flash]);

  const decideIds = ordered.filter((r) => r.decide).map((r) => r.c.id);
  const lastRef = useRef<string | null>(null);
  const nextToDecide = (after?: string) => {
    if (!decideIds.length) return;
    const from = after ?? lastRef.current;
    const at = from ? ordered.findIndex((r) => r.c.id === from) : -1;
    const next = ordered.slice(at + 1).find((r) => r.decide && r.c.id !== from) ?? ordered.find((r) => r.decide && r.c.id !== from);
    if (!next) return;
    lastRef.current = next.c.id;
    bringIntoView(next.c.id, 'accept');
  };

  const summary = (items: ExtractedCourse[]) => {
    const rs = items.map((c) => rows.get(c.id)!);
    const credits = rs.reduce((a, r) => a + (r.ov.exclude ? 0 : (r.s?.credits ?? 0)), 0);
    const todo = rs.filter((r) => r.decide).length;
    const doubts = rs.filter((r) => r.doubts.length > 0).length;
    return (
      <span className="group-sum">
        <span>{rs.length} {rs.length === 1 ? 'course' : 'courses'}</span>
        <span>{+credits.toFixed(2)} cr</span>
        {todo > 0 ? <span className="todo">{todo} to decide</span> : <span>all decided</span>}
        {doubts > 0 && <span className="todo">{doubts} unsure</span>}
      </span>
    );
  };

  const levelSelect = (key: string, label: string, items: ExtractedCourse[]) => {
    const lv = items[0].level;
    return (
      <label className="group-level">
        US grade level
        <select value={lv ?? ''} disabled={locked} onChange={(e) => setLevel(key, label, e.target.value ? +e.target.value : null)}>
          <option value="">Not set</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              Grade {l}
            </option>
          ))}
          {lv != null && !LEVELS.includes(lv) && <option value={lv}>Grade {lv}</option>}
        </select>
      </label>
    );
  };

  const row = (r: Row) => {
    const { c, s, ov, doubts } = r;
    const cls = `${ov.exclude ? 'excluded' : r.decide ? 'review' : 'accepted'} ${flash === c.id ? 'flash' : ''}`;
    const of = (f: Doubt['field']) => doubts.filter((d) => d.field === f);
    const gradeDoubt = of('grade')[0];
    return (
      <Fragment key={c.id}>
        <tr className={cls} id={`course-${c.id}`}>
          <td style={{ minWidth: 190 }}>
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
              {c.name.source && (
                <button className="locate" onClick={() => onShow(c.name.source)} aria-label={`Show “${c.name.original}” on the document`} title="Show on the document" style={{ verticalAlign: 'middle' }}>
                  <Icon name="locate" />
                </button>
              )}
            </span>
            {chips(of('name'))}
          </td>
          <td>
            <div className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
              <input
                className={`grade ${c.grade.edited ? 'edited' : gradeDoubt ? 'doubt' : ''}`}
                title={gradeDoubt ? `${gradeDoubt.text}${c.gradeWords && !c.gradeWords.agrees ? `: the words read “${c.gradeWords.text}” (${c.gradeWords.value})` : c.grade.value ? ` (read with ${Math.round(c.grade.confidence * 100)}% confidence)` : ''}. Compare with the original.` : undefined}
                aria-label={`Grade for ${c.name.value || 'course'}`}
                defaultValue={c.grade.value}
                key={c.grade.value}
                disabled={locked}
                onBlur={(e) => e.target.value !== c.grade.value && editCourse(c.id, 'grade', (x) => { x.grade.value = e.target.value; x.grade.edited = true; x.grade.confidence = 1; }, `${c.name.value}: “${c.grade.value}” → “${e.target.value}”`)}
              />
              {c.grade.source && (
                <button className="locate" onClick={() => onShow(c.grade.source)} aria-label={`Show the grade for ${c.name.value} on the document`} title="Show on the document">
                  <Icon name="locate" />
                </button>
              )}
            </div>
            {c.gradeWords && !c.grade.edited && (
              <span className={`orig ${c.gradeWords.agrees ? '' : 'conflict'}`} lang={ex.language} title={c.gradeWords.agrees ? `The grade matches the words printed beside it, “${c.gradeWords.text}”` : undefined}>
                {c.gradeWords.agrees ? `✓ ${c.gradeWords.text}` : `words: “${c.gradeWords.text}” (${c.gradeWords.value})`}
              </span>
            )}
            {(c.credits || c.hours) && (
              <span className="orig mono">
                {c.credits ? `${c.credits.value} cr` : ''} {c.hours ? `${c.hours.value} h` : ''}
              </span>
            )}
            {chips(of('grade'))}
          </td>
          <td style={{ minWidth: 150 }}>
            <select aria-label="US subject" value={s?.conceptId ?? ''} disabled={locked || ov.exclude} onChange={(e) => override(c.id, { conceptId: e.target.value, requirementId: undefined }, 'Changed US subject', `${c.name.value} → ${kb.concepts.find((k) => k.id === e.target.value)?.label}`)}>
              {kb.concepts.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            <select aria-label="Counts toward" style={{ marginTop: 4 }} value={s?.requirementId ?? ''} disabled={locked || ov.exclude} onChange={(e) => override(c.id, { requirementId: e.target.value }, 'Changed requirement area', `${c.name.value} → ${district.requirements.find((r2) => r2.id === e.target.value)?.label}`)}>
              {district.requirements.map((r2) => (
                <option key={r2.id} value={r2.id}>
                  {r2.label}
                </option>
              ))}
            </select>
            {s?.usCourse && <span className="orig"><strong>counts as {s.usCourse.title}</strong></span>}
            {chips(of('subject'))}
          </td>
          <td className="num">
            <input className="cr" type="number" min={0} max={20} step={0.25} aria-label="Suggested credits" value={s?.credits ?? 0} disabled={locked || ov.exclude} onChange={(e) => override(c.id, { credits: Math.max(0, +e.target.value) }, 'Changed credits', `${c.name.value} → ${e.target.value}`)} />
            {s && s.share < 1 && <span className="orig mono" title="Fraction of a school year this row documents">{+s.share.toFixed(2)} yr</span>}
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
          <td>
            <div className="rowbtns">
              {!ov.exclude && r.decide && (
                <button
                  className="btn small primary accept"
                  disabled={locked}
                  onClick={() => {
                    override(c.id, { accepted: true }, 'Accepted suggestion', c.name.value);
                    // Straight on to the next row that needs a decision.
                    nextToDecide(c.id);
                  }}
                  aria-label={`Accept the suggestion for ${c.name.value}`}
                >
                  Accept
                </button>
              )}
              {!ov.exclude && s && !r.decide && <span className="tag ok" title={ov.accepted ? 'Accepted by a counselor' : 'High confidence'}>{ov.accepted ? 'Accepted' : 'OK'}</span>}
              <button className="btn small" aria-expanded={openWhy === c.id} onClick={() => setOpenWhy(openWhy === c.id ? null : c.id)} aria-label={`Why this suggestion for ${c.name.value}`}>
                Why
              </button>
              <button
                className={`btn small quiet ${ov.exclude ? '' : 'icon-only'}`}
                disabled={locked}
                onClick={() => override(c.id, { exclude: !ov.exclude }, ov.exclude ? 'Restored a course' : 'Excluded a course', c.name.value)}
                aria-label={ov.exclude ? `Restore ${c.name.value}` : `Leave out ${c.name.value}`}
                title={ov.exclude ? 'Count this course again' : 'Leave this course out of the evaluation'}
              >
                {ov.exclude ? 'Restore' : <Icon name="out" />}
              </button>
            </div>
            {chips(of('row'))}
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
  };

  if (ex.courses.length === 0) {
    return (
      <>
        <div className="course-tools no-print">{toolbar}</div>
        <div className="notice check">
          <h3>No courses were found</h3>
          <p className="small">Try a clearer scan, or choose the writing system when uploading. Or type the subjects and grades with “Type a table” at the top of the case: they are read like any other document.</p>
        </div>
      </>
    );
  }

  const FILTERS: [Filter, string][] = [
    ['all', 'All'],
    ['decide', 'To decide'],
    ['doubt', 'Unsure'],
    ...(counts.model ? ([['model', 'From the model']] as [Filter, string][]) : []),
    ...(counts.out ? ([['out', 'Left out']] as [Filter, string][]) : []),
  ];
  const anyClosed = years.some((y) => closed.has(y.key) || y.periods.some((p) => closed.has(p.key)));
  const visible = ordered.filter(matches).length;

  return (
    <>
      <div className="course-tools no-print">
        <div className="filters" role="group" aria-label="Show courses">
          {FILTERS.map(([f, label]) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {label}
              <span className="n">{counts[f]}</span>
            </button>
          ))}
        </div>
        <button className="btn small primary" disabled={!decideIds.length} onClick={() => nextToDecide()} title="Open the next course that still needs a decision">
          Next to decide <span aria-hidden="true">↓</span>
        </button>
        {years.length > 1 && !filtering && (
          <button className="btn small quiet" onClick={() => setClosed(anyClosed ? new Set() : new Set(years.map((y) => y.key)))}>
            {anyClosed ? 'Open all years' : 'Close all years'}
          </button>
        )}
        <span className="spacer" />
        {toolbar}
      </div>
      {filtering && visible === 0 ? (
        <p className="muted">No courses match this filter.</p>
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
                <th>Decision</th>
              </tr>
            </thead>
            {years.map((y) => {
              const yItems = y.periods.flatMap((p) => p.items);
              if (filtering && !yItems.some((c) => matches(rows.get(c.id)!))) return null;
              const yOpen = filtering || !closed.has(y.key);
              const single = y.periods.length === 1;
              return (
                <Fragment key={y.key}>
                  <tbody className="year-start">
                    <tr>
                      <th className="group year" colSpan={6} scope="rowgroup">
                        <div className="group-row">
                          <button className="toggle" aria-expanded={yOpen} onClick={() => toggle(y.key)} disabled={filtering}>
                            <Chevron />
                            <span lang={single ? ex.language : undefined}>{single && y.periods[0].items[0].period.value && !y.key.startsWith('p|') ? `${y.label} · ${y.periods[0].termLabel}` : y.label}</span>
                          </button>
                          {!single && <span className="group-sum">{y.periods.length} terms</span>}
                          {summary(yItems)}
                          {single && y.periods[0].items[0].period.source && (
                            <button className="locate" onClick={() => onShow(y.periods[0].items[0].period.source)} aria-label="Show this heading on the document">
                              <Icon name="locate" />
                            </button>
                          )}
                          {single && levelSelect(y.periods[0].key, y.periods[0].label, y.periods[0].items)}
                        </div>
                      </th>
                    </tr>
                    {yOpen && single && y.periods[0].items.filter((c) => matches(rows.get(c.id)!)).map((c) => row(rows.get(c.id)!))}
                  </tbody>
                  {yOpen &&
                    !single &&
                    y.periods.map((p) => {
                      const items = p.items.filter((c) => matches(rows.get(c.id)!));
                      if (!items.length) return null;
                      const pOpen = filtering || !closed.has(p.key);
                      return (
                        <tbody key={p.key}>
                          <tr>
                            <th className="group term" colSpan={6} scope="rowgroup">
                              <div className="group-row">
                                <button className="toggle" aria-expanded={pOpen} onClick={() => toggle(p.key)} disabled={filtering}>
                                  <Chevron />
                                  <span lang={ex.language}>{p.termLabel}</span>
                                </button>
                                {summary(p.items)}
                                {p.items[0].period.source && (
                                  <button className="locate" onClick={() => onShow(p.items[0].period.source)} aria-label={`Show “${p.termLabel}” on the document`}>
                                    <Icon name="locate" />
                                  </button>
                                )}
                                {levelSelect(p.key, p.label, p.items)}
                              </div>
                            </th>
                          </tr>
                          {pOpen && items.map((c) => row(rows.get(c.id)!))}
                        </tbody>
                      );
                    })}
                </Fragment>
              );
            })}
          </table>
        </div>
      )}
    </>
  );
}

export function WhyPanel({ s }: { s: Suggestion }) {
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
        {s.catalogTitle && <li>Closest course in the district catalog: {s.catalogTitle}.</li>}
      </ol>
      {s.confidence < 0.7 && <p className="small" style={{ margin: '8px 0 0' }}><span className="tag check">Low confidence</span> Check this row against the original before accepting.</p>}
    </div>
  );
}

