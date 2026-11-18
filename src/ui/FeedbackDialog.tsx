// "Export corrections for feedback": shows exactly what will be saved before anything is saved.
import { useEffect, useMemo, useRef } from 'react';
import type { DistrictProfile, KnowledgeBase } from '../core/types.ts';
import { download } from '../export/csv.ts';
import { buildFeedback, feedbackText } from '../export/feedback.ts';
import type { CaseRecord } from '../store/db.ts';

interface Props {
  rec: CaseRecord;
  kb: KnowledgeBase;
  district: DistrictProfile;
  files: { name: string; type: string }[];
  onClose(): void;
}

export function FeedbackDialog({ rec, kb, district, files, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const feedback = useMemo(() => buildFeedback(rec, kb, district, files), [rec, kb, district, files]);
  const text = useMemo(() => feedbackText(feedback), [feedback]);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  const n = feedback.corrections.length;
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape closes the dialog; Cancel is the other way out
    <dialog ref={ref} className="typed" aria-labelledby="fb-h" onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <h2 id="fb-h">Export corrections for feedback</h2>
      <p className="small">
        A file of what you corrected beside what evalua read, to help improve reading. It holds course subjects, grades, credits and grade levels, and facts about the
        document: its file type, education system and the reader version. <strong>It never includes</strong> the student’s name, ID or date of birth, the school’s
        name, addresses, signatures, the file name, your notes, the change log, or any page of the document. Below is everything that will be saved.
      </p>
      <p className="small muted" role="status">
        {n ? `${n} correction${n === 1 ? '' : 's'}` : 'No corrections yet'}
        {feedback.acceptedUnchanged ? `, and ${feedback.acceptedUnchanged} suggestion${feedback.acceptedUnchanged === 1 ? '' : 's'} accepted unchanged` : ''}.
      </p>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable preview must be reachable by keyboard */}
      <pre className="preview" tabIndex={0} aria-label="Exactly what will be saved">{text}</pre>
      <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
        <button className="btn quiet" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn primary"
          onClick={() => {
            download(`evalua-feedback-${feedback.exported}-${Math.random().toString(36).slice(2, 8)}.json`, text, 'application/json');
            onClose();
          }}
        >
          Save this file
        </button>
      </div>
    </dialog>
  );
}
