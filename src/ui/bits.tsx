// Small shared pieces: stamps, confidence meter, source citations, icons.
import type { Provenance, SourceInfo } from '../core/types.ts';
import { STATUS_LABEL, type CaseStatus } from '../store/db.ts';
import { schoolYearOf } from './state.tsx';

export function Stamp({ status }: { status: CaseStatus }) {
  return <span className={`stamp ${status}`}>{STATUS_LABEL[status]}</span>;
}

export function Confidence({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(value * 100);
  const level = value >= 0.8 ? 'high' : value >= 0.6 ? 'mid' : 'low';
  const word = level === 'high' ? 'high' : level === 'mid' ? 'medium' : 'low';
  const on = Math.max(value > 0 ? 1 : 0, Math.round(value * 5));
  return (
    <span className={`conf ${level}`} title={`${label ?? 'Confidence'}: ${pct}% (${word})`}>
      <span className="conf-bar" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} className={i < on ? 'on' : ''} />
        ))}
      </span>
      <span>
        {pct}%<span className="sr-only"> {label ?? 'confidence'}, {word}</span>
      </span>
    </span>
  );
}

export function Source({ source }: { source?: SourceInfo }) {
  if (!source) return null;
  return (
    <span className="source">
      Source:{' '}
      {source.url ? (
        <a href={source.url} target="_blank" rel="noreferrer noopener">
          {source.title}
        </a>
      ) : (
        source.title
      )}
      {source.document ? ` (${source.document})` : ''}
    </span>
  );
}

/** When a stored fact was added, and whether it may be out of date. */
export function Freshness({ p }: { p: Provenance }) {
  const current = schoolYearOf();
  const ageMonths = (Date.now() - new Date(p.addedOn).getTime()) / (1000 * 60 * 60 * 24 * 30.4);
  const stale = p.schoolYear !== current || ageMonths > 12;
  const added = new Date(p.addedOn).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  return (
    <span className="source">
      <Source source={p.source} /> · school year {p.schoolYear} · added {added}{' '}
      {stale ? <span className="tag check">May be outdated: check the source</span> : <span className="tag ok">Current</span>}
    </span>
  );
}

const paths: Record<string, string> = {
  upload: 'M12 16V4m0 0 4.5 4.5M12 4 7.5 8.5M4 15v4h16v-4',
  locate: 'M12 3v3m0 12v3M3 12h3m12 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  print: 'M7 8V4h10v4M7 17H4v-7h16v7h-3M7 14h10v6H7z',
  table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
  trash: 'M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13',
  plus: 'M12 5v14M5 12h14',
  back: 'M10 6 4 12l6 6M4 12h16',
  redo: 'M19 8a8 8 0 1 0 1.5 7M19 3v5h-5',
  info: 'M12 11v6M12 7.5v.5M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
};

export function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
