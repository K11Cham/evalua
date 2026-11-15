// The original document, page by page, with the highlighted source of whichever field is selected.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DocTokens, SourceRef } from '../core/types.ts';

interface Props {
  doc: DocTokens;
  previews: (Blob | null)[];
  highlight: SourceRef | null;
  fileName: string;
}

export function DocViewer({ doc, previews, highlight, fileName }: Props) {
  const [zoom, setZoom] = useState(1);
  const urls = useMemo(() => previews.map((b) => (b ? URL.createObjectURL(b) : null)), [previews]);
  useEffect(() => () => urls.forEach((u) => u && URL.revokeObjectURL(u)), [urls]);
  const hlRef = useRef<HTMLDivElement>(null);
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    hlRef.current?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [highlight, reduce]);

  return (
    <section className="viewer" aria-label="Original document">
      <div className="viewer-bar">
        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={fileName}>
          {fileName}
        </strong>
        <span className="muted">
          {doc.pages.length} page{doc.pages.length === 1 ? '' : 's'}
        </span>
        <button className="btn small" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Zoom out">
          −
        </button>
        <span className="mono" aria-live="polite" style={{ minWidth: 44, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button className="btn small" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="Zoom in">
          +
        </button>
      </div>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard */}
      <div className="viewer-scroll" tabIndex={0} aria-label="Document pages. Scroll to read.">
        {doc.pages.map((p, i) => {
          const hl = highlight && highlight.page === i ? highlight : null;
          const pad = 0.004;
          return (
            <div key={i}>
              <div className="page" style={{ width: `${zoom * 100}%`, aspectRatio: urls[i] ? undefined : `${p.width} / ${p.height}` }}>
                {urls[i] ? (
                  <img src={urls[i]!} alt={`Page ${i + 1} of the original document`} />
                ) : (
                  // Word files have no page image: show the text laid out as it was read.
                  <DocxPage doc={doc} page={i} />
                )}
                {hl && (
                  <div
                    ref={hlRef}
                    className="hl"
                    style={{
                      left: `${(hl.x / p.width - pad) * 100}%`,
                      top: `${(hl.y / p.height - pad) * 100}%`,
                      width: `${(hl.w / p.width + 2 * pad) * 100}%`,
                      height: `${(hl.h / p.height + 2 * pad) * 100}%`,
                    }}
                  />
                )}
              </div>
              <div className="page-no">
                Page {i + 1}
                {!urls[i] && ' · text of the Word file as read'}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DocxPage({ doc, page }: { doc: DocTokens; page: number }) {
  const p = doc.pages[page];
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / p.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [p.width]);
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {doc.tokens
        .filter((t) => t.page === page)
        .map((t, i) => (
          <span key={i} className="tok" style={{ left: t.x * scale, top: t.y * scale, fontSize: Math.max(6, 13 * scale) }}>
            {t.text}
          </span>
        ))}
    </div>
  );
}
