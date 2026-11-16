// "Type a table": subject and grade pairs entered by hand, for a record that cannot be read (a faint carbon copy, a
// handwritten card, a stamp across the marks) or that only exists on paper. What is typed becomes a small text
// document and goes through exactly the same reading as an uploaded file, so it is kept with the case, shown in the
// viewer, and can be read again like any other document.
import { useEffect, useRef, useState } from 'react';
import { parseTypedTable, typedTableText } from '../ingest/typed.ts';

type Row = [string, string, string];
const blank = (): Row => ['', '', ''];

interface Props {
  /** Ask for the student, school and country too (when the table starts a new case). */
  withStudent: boolean;
  /** Label of the main button. */
  action: string;
  onDone(file: File): void;
  onClose(): void;
}

export function TypedTable({ withStudent, action, onDone, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [student, setStudent] = useState('');
  const [school, setSchool] = useState('');
  const [country, setCountry] = useState('');
  const [cls, setCls] = useState('');
  const [year, setYear] = useState('');
  const [term, setTerm] = useState('');
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 6 }, blank));
  const [paste, setPaste] = useState('');
  const [pasteNote, setPasteNote] = useState('');

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  const filled = rows.filter((r) => r[0].trim() && r[1].trim());
  const half = rows.filter((r) => !!r[0].trim() !== !!r[1].trim());
  const set = (i: number, k: 0 | 1 | 2, v: string) => setRows((rs) => rs.map((r, j) => (j === i ? (Object.assign([...r], { [k]: v }) as Row) : r)));

  const addPasted = () => {
    const t = parseTypedTable(paste);
    if (!t.rows.length) {
      setPasteNote('No subject and grade pairs were found. Put one subject and its grade on each line, for example “Mathematics: 85”.');
      return;
    }
    setRows((rs) => [...rs.filter((r) => r[0].trim() || r[1].trim() || r[2].trim()), ...t.rows, blank()]);
    const field = (re: RegExp) => t.fields.find((f) => re.test(f.label))?.value ?? '';
    if (!cls) setCls(field(/^(class|classe|clase|grade level|level|form)$/i));
    if (!year) setYear(field(/year|année|año|ano|session/i));
    if (!term) setTerm(field(/term|trimestre|semest|período|periodo/i) || (t.headings.find((h) => /term|semester|trimestre|semestre/i.test(h)) ?? ''));
    if (withStudent && !student) setStudent(field(/^(student|student name|name|nom|nombre|nome|élève|alumno|aluno)$/i));
    if (withStudent && !school) setSchool(field(/school|école|escuela|escola|établissement|colegio/i));
    setPasteNote(`${t.rows.length} ${t.rows.length === 1 ? 'course' : 'courses'} added below. Check them before you continue.`);
    setPaste('');
  };

  const finish = () => {
    // A term typed as a bare number reads as "Term 2" on the document.
    const termLine = /^\d$/.test(term.trim()) ? `Term ${term.trim()}` : term;
    const text = typedTableText(
      [
        ...(withStudent ? [{ label: 'Student', value: student }, { label: 'School', value: school }, { label: 'Country', value: country }] : []),
        { label: 'Class', value: cls },
        { label: 'Year', value: year },
      ],
      filled,
      termLine,
    );
    const name = `Typed table${termLine.trim() ? ` - ${termLine.trim()}` : ''}${year.trim() ? ` ${year.trim()}` : ''}.txt`.replace(/[\\/:*?"<>|]/g, '-');
    onDone(new File([text], name, { type: 'text/plain' }));
  };

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape closes the dialog; the Cancel button is the other way out
    <dialog ref={ref} className="typed" aria-labelledby="typed-h" onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <h2 id="typed-h">Type a table</h2>
      <p className="small muted">
        For a record that cannot be read, or that you only have on paper. Type each subject and its grade as printed, in the document’s own language; evalua reads it like any other document, and it is kept with the case.
      </p>
      {withStudent && (
        <div className="grid3">
          <label className="field">
            Student
            <input type="text" value={student} onChange={(e) => setStudent(e.target.value)} />
          </label>
          <label className="field">
            School
            <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} />
          </label>
          <label className="field">
            Country
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. The Gambia" />
          </label>
        </div>
      )}
      <div className="grid3">
        <label className="field">
          Class or grade, as printed
          <input type="text" value={cls} onChange={(e) => setCls(e.target.value)} placeholder="e.g. Grade 10, SS 2, 1re" />
        </label>
        <label className="field">
          School year
          <input type="text" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2024-2025" />
        </label>
        <label className="field">
          Term or semester (if any)
          <input type="text" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. First term" />
        </label>
      </div>

      <table className="ledger typed-rows">
        <thead>
          <tr>
            <th scope="col">Subject</th>
            <th scope="col">Grade</th>
            <th scope="col">Credits or hours (optional)</th>
            <th scope="col">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>
                <input type="text" aria-label={`Subject ${i + 1}`} value={r[0]} onChange={(e) => set(i, 0, e.target.value)} />
              </td>
              <td>
                <input type="text" aria-label={`Grade ${i + 1}`} value={r[1]} onChange={(e) => set(i, 1, e.target.value)} className="mono" />
              </td>
              <td>
                <input
                  type="text"
                  aria-label={`Credits or hours ${i + 1}`}
                  value={r[2]}
                  onChange={(e) => set(i, 2, e.target.value)}
                  className="mono"
                  onKeyDown={(e) => {
                    // Enter on the last row adds another, so a long list can be typed without the mouse.
                    if (e.key === 'Enter' && i === rows.length - 1) {
                      e.preventDefault();
                      setRows((rs) => [...rs, blank()]);
                      requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`input[aria-label="Subject ${i + 2}"]`)?.focus());
                    }
                  }}
                />
              </td>
              <td>
                <button className="btn small quiet icon-only" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [blank()]))} aria-label={`Remove row ${i + 1}`} title="Remove this row">
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn small" style={{ marginTop: 6 }} onClick={() => setRows((rs) => [...rs, blank(), blank(), blank()])}>
        Add rows
      </button>

      <details className="paste">
        <summary>Paste a list instead</summary>
        <label className="field" style={{ marginTop: 6 }}>
          One subject and grade per line: “Mathematics: 85”, “Mathematics, 85”, or cells copied from a spreadsheet. Lines such as “Class: Grade 10” fill the fields above.
          <textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} />
        </label>
        <button className="btn small" style={{ marginTop: 6 }} disabled={!paste.trim()} onClick={addPasted}>
          Add these lines
        </button>
        {pasteNote && (
          <p className="small" role="status" style={{ margin: '6px 0 0' }}>
            {pasteNote}
          </p>
        )}
      </details>

      <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        {half.length > 0 && <span className="small muted" style={{ marginRight: 'auto' }}>{half.length === 1 ? 'One row has' : `${half.length} rows have`} a subject or a grade but not both; {half.length === 1 ? 'it' : 'they'} will be left out.</span>}
        <button className="btn quiet" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" disabled={!filled.length} onClick={finish}>
          {action} ({filled.length} {filled.length === 1 ? 'course' : 'courses'})
        </button>
      </div>
    </dialog>
  );
}
