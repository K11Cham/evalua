// Loads one case and its document, reads the document if that has not happened yet, and saves every change.
import { useCallback, useEffect, useRef, useState } from 'react';
import { carryOver } from '../core/merge.ts';
import { runExtraction } from '../core/pipeline.ts';
import type { DocTokens, KnowledgeBase } from '../core/types.ts';
import { ingestMany } from '../ingest/browser.ts';
import type { OcrModelId } from '../ingest/ocrModels.ts';
import { getCase, getDoc, now, putCase, putDoc, type CaseDoc, type CaseRecord } from '../store/db.ts';

export interface CaseNotice {
  kind: 'ok' | 'error';
  text: string;
}

export interface CaseState {
  rec: CaseRecord | null;
  doc: CaseDoc | null;
  missing: boolean;
  /** Progress message while the document is being read; '' when idle. */
  reading: string;
  /** Result of the last "add documents", shown once. */
  notice: CaseNotice | null;
  clearNotice(): void;
  /** Apply a change, record it in the change log, and save. */
  update(change: (c: CaseRecord) => void, log?: { action: string; detail?: string }): void;
  /**
   * Read the document again. `keepWork` carries the counselor's corrections and decisions over
   * (used when only the system changes); without it the case starts clean.
   */
  reread(opts?: { systemId?: string; hint?: OcrModelId | 'auto'; reuseTokens?: boolean; keepWork?: boolean }): void;
  /** Add documents (later term reports, missing pages) to this case, keeping the work already done. */
  addFiles(files: File[]): void;
}

const fileKey = (name: string, size: number) => `${name}|${size}`;

export function useCase(id: string, kb: KnowledgeBase, who: string): CaseState {
  const [rec, setRec] = useState<CaseRecord | null>(null);
  const [doc, setDoc] = useState<CaseDoc | null>(null);
  const [missing, setMissing] = useState(false);
  const [reading, setReading] = useState('');
  const [notice, setNotice] = useState<CaseNotice | null>(null);
  const busy = useRef(false);
  const recRef = useRef<CaseRecord | null>(null);
  const docRef = useRef<CaseDoc | null>(null);
  useEffect(() => {
    recRef.current = rec;
  }, [rec]);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  /** Reads the tokens, then either starts clean or carries the earlier work over. */
  const finish = useCallback(
    async (r: CaseRecord, tokens: DocTokens, opts: { systemId?: string; keepWork: boolean; action: string; detail?: (added: number, kept: number, lost: string[]) => string }) => {
      setReading('Finding courses and grades…');
      const fresh = runExtraction(tokens, kb, { systemId: opts.systemId });
      let updated: CaseRecord;
      if (opts.keepWork && r.extraction) {
        const carried = carryOver(r.extraction, fresh, r.overrides, r.resolved);
        updated = {
          ...r,
          extraction: carried.extraction,
          overrides: carried.overrides,
          resolved: carried.resolved,
          engine: tokens.engine,
          error: undefined,
          // New material needs a fresh look before the case is called reviewed.
          status: r.status === 'uploaded' ? 'extracted' : r.status === 'reviewed' ? 'extracted' : r.status,
          log: [...r.log, { at: now(), by: who, action: opts.action, detail: opts.detail?.(carried.added, carried.kept, carried.lost) }],
        };
      } else {
        updated = {
          ...r,
          extraction: fresh,
          engine: tokens.engine,
          error: undefined,
          overrides: {},
          resolved: [],
          status: 'extracted',
          log: [...r.log, { at: now(), by: who, action: opts.action, detail: `${fresh.courses.length} courses found using ${tokens.engine}; system: ${fresh.docType}` }],
        };
      }
      await putCase(updated);
      setRec(updated);
      return updated;
    },
    [kb, who],
  );

  const process = useCallback(
    async (r: CaseRecord, d: CaseDoc, opts: { systemId?: string; hint?: OcrModelId | 'auto'; reuseTokens?: boolean; keepWork?: boolean } = {}) => {
      if (busy.current) return;
      busy.current = true;
      try {
        let tokens = opts.reuseTokens ? d.tokens : null;
        if (!tokens) {
          setReading('Opening the file…');
          const files = d.files.map((f) => new File([f.blob], f.name, { type: f.type }));
          const hint = (opts.hint ?? d.hint ?? 'auto') as OcrModelId | 'auto';
          const ing = await ingestMany(files, hint, setReading);
          tokens = ing.doc;
          const next = { ...d, tokens, previews: ing.previews, hint };
          await putDoc(next);
          setDoc(next);
        }
        await finish(r, tokens, {
          systemId: opts.systemId,
          keepWork: !!opts.keepWork,
          action: opts.keepWork ? 'Changed the education system' : r.extraction ? 'Read again' : 'Read',
          detail: (added, kept, lost) => `${kept} courses kept with your changes${added ? `, ${added} new` : ''}${lost.length ? `; not found again: ${lost.join(', ')}` : ''}`,
        });
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
    [finish, who],
  );

  useEffect(() => {
    let live = true;
    setRec(null);
    setDoc(null);
    setMissing(false);
    setNotice(null);
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
      if (recRef.current && docRef.current) void process(recRef.current, docRef.current, opts);
    },
    [process],
  );

  const addFiles = useCallback<CaseState['addFiles']>(
    (files) => {
      const r = recRef.current;
      const d = docRef.current;
      if (!r || !d || busy.current || !files.length) return;
      void (async () => {
        busy.current = true;
        setNotice(null);
        try {
          const have = new Set(d.files.map((f) => fileKey(f.name, f.blob.size)));
          const fresh = files.filter((f) => !have.has(fileKey(f.name, f.size)));
          const repeated = files.length - fresh.length;
          if (!fresh.length) {
            setNotice({ kind: 'error', text: repeated === 1 ? 'That file is already in this case.' : 'Those files are already in this case.' });
            return;
          }
          const big = fresh.find((f) => f.size > 60 * 1024 * 1024);
          if (big) {
            setNotice({ kind: 'error', text: `“${big.name}” is larger than 60 MB. Use a smaller scan or split the file.` });
            return;
          }
          const hint = (d.hint ?? 'auto') as OcrModelId | 'auto';
          let tokens: DocTokens;
          let previews: (Blob | null)[];
          const allFiles = [...d.files, ...fresh.map((f) => ({ name: f.name, type: f.type, blob: f as Blob }))];
          if (d.tokens) {
            // Only the new files are read; their pages go after the ones already here.
            setReading('Opening the added file…');
            const ing = await ingestMany(fresh, hint, setReading);
            const offset = d.tokens.pages.length;
            tokens = {
              kind: d.tokens.kind === 'ocr' || ing.doc.kind === 'ocr' ? 'ocr' : d.tokens.kind,
              pages: [...d.tokens.pages, ...ing.doc.pages],
              tokens: [...d.tokens.tokens, ...ing.doc.tokens.map((t) => ({ ...t, page: t.page + offset }))],
              engine: [...new Set([...d.tokens.engine.split(' + '), ...ing.doc.engine.split(' + ')])].filter(Boolean).join(' + '),
              warnings: [...d.tokens.warnings, ...ing.doc.warnings],
            };
            previews = [...d.previews, ...ing.previews];
          } else {
            // The earlier reading failed: read everything together.
            setReading('Opening the files…');
            const ing = await ingestMany(allFiles.map((f) => new File([f.blob], f.name, { type: f.type })), hint, setReading);
            tokens = ing.doc;
            previews = ing.previews;
          }
          const nextDoc: CaseDoc = { ...d, files: allFiles, tokens, previews };
          await putDoc(nextDoc);
          setDoc(nextDoc);
          const names = fresh.map((f) => f.name).join(', ');
          // A system the counselor chose by hand (read with confidence 1) is kept.
          const chosen = r.extraction && r.extraction.systemId.confidence >= 1 ? r.extraction.systemId.value : undefined;
          let summary = '';
          const updated = await finish(
            { ...r, fileName: allFiles.length === 1 ? allFiles[0].name : `${allFiles[0].name} + ${allFiles.length - 1} more` },
            tokens,
            {
              systemId: chosen,
              keepWork: true,
              action: 'Added documents',
              detail: (added, kept, lost) =>
                (summary = `${names}: ${added} new course row${added === 1 ? '' : 's'}; ${kept} earlier row${kept === 1 ? '' : 's'} kept with your changes${lost.length ? `; not found again: ${lost.join(', ')}` : ''}.`),
            },
          );
          setNotice({
            kind: 'ok',
            text: `Added ${fresh.length} document${fresh.length === 1 ? '' : 's'}. ${summary}${repeated ? ` ${repeated} file${repeated === 1 ? ' was' : 's were'} already in the case and skipped.` : ''}${r.status === 'reviewed' && updated.status === 'extracted' ? ' The case is back to “extracted” so the new rows get a review.' : ''}`,
          });
        } catch (e) {
          setNotice({ kind: 'error', text: `The added file could not be read: ${e instanceof Error ? e.message : String(e)}. The case is unchanged.` });
        } finally {
          busy.current = false;
          setReading('');
        }
      })();
    },
    [finish],
  );

  return { rec, doc, missing, reading, notice, clearNotice: () => setNotice(null), update, reread, addFiles };
}
