// Loads one case and its document, reads the document if that has not happened yet, and saves every change.
import { useCallback, useEffect, useRef, useState } from 'react';
import { runExtraction } from '../core/pipeline.ts';
import type { KnowledgeBase } from '../core/types.ts';
import { ingestMany } from '../ingest/browser.ts';
import type { OcrModelId } from '../ingest/ocrModels.ts';
import { getCase, getDoc, now, putCase, putDoc, type CaseDoc, type CaseRecord } from '../store/db.ts';

export interface CaseState {
  rec: CaseRecord | null;
  doc: CaseDoc | null;
  missing: boolean;
  /** Progress message while the document is being read; '' when idle. */
  reading: string;
  /** Apply a change, record it in the change log, and save. */
  update(change: (c: CaseRecord) => void, log?: { action: string; detail?: string }): void;
  /** Read the document again (optionally forcing a system profile or script). */
  reread(opts?: { systemId?: string; hint?: OcrModelId | 'auto'; reuseTokens?: boolean }): void;
}

export function useCase(id: string, kb: KnowledgeBase, who: string): CaseState {
  const [rec, setRec] = useState<CaseRecord | null>(null);
  const [doc, setDoc] = useState<CaseDoc | null>(null);
  const [missing, setMissing] = useState(false);
  const [reading, setReading] = useState('');
  const busy = useRef(false);
  const recRef = useRef<CaseRecord | null>(null);
  useEffect(() => {
    recRef.current = rec;
  }, [rec]);

  const process = useCallback(
    async (r: CaseRecord, d: CaseDoc, opts: { systemId?: string; hint?: OcrModelId | 'auto'; reuseTokens?: boolean } = {}) => {
      if (busy.current) return;
      busy.current = true;
      try {
        let tokens = opts.reuseTokens ? d.tokens : null;
        let next = d;
        if (!tokens) {
          setReading('Opening the file…');
          const files = d.files.map((f) => new File([f.blob], f.name, { type: f.type }));
          const hint = (opts.hint ?? d.hint ?? 'auto') as OcrModelId | 'auto';
          const ing = await ingestMany(files, hint, setReading);
          tokens = ing.doc;
          next = { ...d, tokens, previews: ing.previews, hint };
          await putDoc(next);
          setDoc(next);
        }
        setReading('Finding courses and grades…');
        const extraction = runExtraction(tokens, kb, { systemId: opts.systemId });
        const updated: CaseRecord = {
          ...r,
          extraction,
          engine: tokens.engine,
          error: undefined,
          overrides: {},
          resolved: [],
          status: 'extracted',
          log: [...r.log, { at: now(), by: who, action: r.extraction ? 'Read again' : 'Read', detail: `${extraction.courses.length} courses found using ${tokens.engine}; system: ${extraction.docType}` }],
        };
        await putCase(updated);
        setRec(updated);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const failed: CaseRecord = { ...r, error: message, log: [...r.log, { at: now(), by: who, action: 'Could not be read', detail: message }] };
        await putCase(failed).catch(() => undefined);
        setRec(failed);
      } finally {
        busy.current = false;
        setReading('');
      }
    },
    [kb, who],
  );

  useEffect(() => {
    let live = true;
    setRec(null);
    setDoc(null);
    setMissing(false);
    Promise.all([getCase(id), getDoc(id)])
      .then(([r, d]) => {
        if (!live) return;
        if (!r || !d) return setMissing(true);
        setRec(r);
        setDoc(d);
        if (!r.extraction && !r.error) void process(r, d);
      })
      .catch(() => live && setMissing(true));
    return () => {
      live = false;
    };
  }, [id, process]);

  const update = useCallback<CaseState['update']>(
    (change, log) => {
      const cur = recRef.current;
      if (!cur) return;
      const next: CaseRecord = structuredClone(cur);
      change(next);
      if (log) next.log.push({ at: now(), by: who, ...log });
      next.updatedAt = now();
      setRec(next);
      void putCase(next);
    },
    [who],
  );

  const reread = useCallback<CaseState['reread']>(
    (opts) => {
      if (recRef.current && doc) void process(recRef.current, doc, opts);
    },
    [doc, process],
  );

  return { rec, doc, missing, reading, update, reread };
}
