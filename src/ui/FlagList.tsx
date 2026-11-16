// Items to verify: the most serious first, flags of one kind gathered into one item, checked items folded away.
import type { ReactNode } from 'react';
import type { ExtractedCourse, SourceRef, VerifyFlag } from '../core/types.ts';
import { Icon } from './bits.tsx';
import { flagKind, groupFlags, type FlagGroup } from './flagGroups.ts';

interface Props {
  flags: VerifyFlag[];
  resolved: string[];
  courses: ExtractedCourse[];
  locked: boolean;
  /** Mark these flags checked (true) or open again (false). */
  onCheck(ids: string[], done: boolean, what: string): void;
  onShow(s?: SourceRef): void;
  onCourse(courseId: string): void;
  /** An extra action for a flag, such as "Scale to 7". */
  renderExtra?(f: VerifyFlag): ReactNode;
}

const TAG: Record<VerifyFlag['severity'], [string, string]> = { important: ['important', 'Important'], check: ['check', 'Check'], info: ['', 'Note'] };

export function FlagList({ flags, resolved, courses, locked, onCheck, onShow, onCourse, renderExtra }: Props) {
  const isDone = (f: VerifyFlag) => resolved.includes(f.id);
  const open = groupFlags(flags.filter((f) => !isDone(f)));
  const done = groupFlags(flags.filter(isDone));
  if (flags.length === 0) return <p className="muted" style={{ margin: 0 }}>Nothing was flagged. Still compare the record with the original before finalising.</p>;

  const courseName = (id?: string) => {
    const c = id ? courses.find((x) => x.id === id) : undefined;
    return c ? c.name.original || c.name.value : '';
  };
  const courseButtons = (ids: string[]) => (
    <span className="course-links">
      {ids.map((cid) =>
        courseName(cid) ? (
          <button key={cid} className="btn small quiet" onClick={() => onCourse(cid)} aria-label={`Go to ${courseName(cid)} in the course table`}>
            {courseName(cid)}
          </button>
        ) : null,
      )}
    </span>
  );

  const item = (g: FlagGroup, checked: boolean) => {
    const [cls, word] = TAG[g.severity];
    const ids = g.flags.map((f) => f.id);
    if (g.flags.length === 1) {
      const f = g.flags[0];
      return (
        <li key={g.key} className={`${cls} ${checked ? 'done' : ''}`}>
          <span className={`tag ${cls}`}>{word}</span>
          <div>
            <strong>{f.title}</strong>
            <span className="small">{f.detail}</span>
            {f.courseIds ? courseButtons(f.courseIds) : f.courseId && courseName(f.courseId) ? (
              <span className="course-links">
                <button className="btn small quiet" onClick={() => onCourse(f.courseId!)} aria-label={`Go to ${courseName(f.courseId)} in the course table`}>
                  Go to the course
                </button>
              </span>
            ) : null}
          </div>
          <div className="rowbtns">
            {f.source && (
              <button className="locate" onClick={() => onShow(f.source)} aria-label={`Show on the document: ${f.title}`} title="Show on the document">
                <Icon name="locate" />
              </button>
            )}
            {renderExtra?.(f)}
            <button className="btn small" disabled={locked} aria-pressed={checked} onClick={() => onCheck(ids, !checked, f.title)}>
              {checked ? 'Checked' : 'Mark checked'}
            </button>
          </div>
        </li>
      );
    }
    // Several flags of one kind: one item, the shared explanation once, and each case on its own line.
    const sameDetail = g.flags.every((f) => f.detail === g.flags[0].detail);
    const detail = sameDetail ? g.flags[0].detail : '';
    return (
      <li key={g.key} className={`${cls} ${checked ? 'done' : ''}`}>
        <span className={`tag ${cls}`}>{word}</span>
        <div>
          <strong>
            {g.title} <span className="muted">({g.flags.length})</span>
          </strong>
          {detail && <span className="small">{detail}</span>}
          <ul className="flag-items">
            {g.flags.map((f) => {
              const fDone = isDone(f);
              const name = flagKind(f).item || f.detail;
              const cid = f.courseId;
              return (
                <li key={f.id} className={fDone ? 'done' : ''}>
                  <span className="item-name">
                    {cid && courseName(cid) ? (
                      <button className="linkish" onClick={() => onCourse(cid)} aria-label={`Go to ${name} in the course table`}>
                        {name}
                      </button>
                    ) : (
                      name
                    )}
                    {!sameDetail && <span className="small muted"> — {f.detail}</span>}
                  </span>
                  {f.source && (
                    <button className="locate" onClick={() => onShow(f.source)} aria-label={`Show on the document: ${f.title}`} title="Show on the document">
                      <Icon name="locate" />
                    </button>
                  )}
                  <button className="btn small quiet" disabled={locked} aria-pressed={fDone} onClick={() => onCheck([f.id], !fDone, f.title)} aria-label={`${fDone ? 'Checked' : 'Mark checked'}: ${f.title}`}>
                    {fDone ? 'Checked' : 'Mark checked'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rowbtns">
          <button className="btn small" disabled={locked} aria-pressed={checked} onClick={() => onCheck(ids, !checked, `${g.title} (${g.flags.length})`)}>
            {checked ? 'Open all again' : 'Mark all checked'}
          </button>
        </div>
      </li>
    );
  };

  return (
    <>
      {open.length > 0 ? <ul className="flags">{open.map((g) => item(g, false))}</ul> : <p className="muted" style={{ margin: 0 }}>Every item has been checked.</p>}
      {done.length > 0 && (
        <details className="checked-flags" open={open.length === 0}>
          <summary>Checked ({flags.length - flags.filter((f) => !isDone(f)).length})</summary>
          <ul className="flags">{done.map((g) => item(g, true))}</ul>
        </details>
      )}
    </>
  );
}
