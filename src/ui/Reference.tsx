// The knowledge base, open for inspection: every system profile with its sources and how fresh they are.
import type { GradeScale, SystemProfile } from '../core/types.ts';
import { Freshness, Source } from './bits.tsx';
import { useApp } from './state.tsx';

function ScaleTable({ s }: { s: GradeScale }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3>{s.label}</h3>
      <div className="table-wrap" style={{ margin: '6px 0' }}>
        <table className="ledger">
          <thead>
            <tr>
              <th>Grade on the document</th>
              <th>Meaning</th>
              <th>US letter</th>
            </tr>
          </thead>
          <tbody>
            {s.entries.map((e, i) => (
              <tr key={i}>
                <td className="mono">{e.labels ? e.labels.join(', ') : e.min === e.max ? e.min : `${e.min} – ${e.max}`}</td>
                <td>{e.descriptor ?? ''}</td>
                <td className="mono">{e.us === 'NC' ? 'not converted' : e.us === 'P' ? 'P (pass)' : e.us}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {s.passing && <p className="small">Lowest pass: {s.passing}.</p>}
      {s.note && <p className="small">{s.note}</p>}
      <Freshness p={s.provenance} />
    </div>
  );
}

function Profile({ p }: { p: SystemProfile }) {
  return (
    <article>
      <div className="kicker">{p.countries.join(' · ') || 'Any country'}</div>
      <h1 style={{ marginBottom: 10 }}>{p.name}</h1>
      <p className="lede">{p.summary}</p>
      <p>
        <Freshness p={p.provenance} />
      </p>

      <section className="panel">
        <h2>Grading scales and US equivalents</h2>
        <p className="small muted">US equivalents are conventions used by evaluators, not rules. A counselor can change any converted grade on a case.</p>
        {p.scales.map((s) => (
          <ScaleTable key={s.id} s={s} />
        ))}
      </section>

      <section className="panel">
        <h2>Credit and hours</h2>
        <p>{p.credit.note}</p>
        <ul className="small">
          {p.credit.noCredit && <li>No US credit is suggested for this document type.</li>}
          {p.credit.hoursPerCredit && <li>One credit or unit in this system ≈ {p.credit.hoursPerCredit} hours of instruction (120 hours = one Carnegie unit).</li>}
          {p.credit.examCourseYears && <li>An examination subject normally represents {p.credit.examCourseYears} year(s) of study.</li>}
          {p.defaultLevel && <li>When no year is printed, courses are placed at US grade {p.defaultLevel}.</li>}
        </ul>
        <Freshness p={p.credit.provenance} />
      </section>

      {p.courses.length > 0 && (
        <section className="panel">
          <h2>
            Typical course names <span className="count">{p.courses.length}</span>
          </h2>
          <div className="table-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>As printed</th>
                  <th>English</th>
                  <th>Subject</th>
                </tr>
              </thead>
              <tbody>
                {p.courses.map((c, i) => (
                  <tr key={i}>
                    <td lang={p.languages[0]}>{c.names.join(' · ')}</td>
                    <td>{c.en}</td>
                    <td className="small mono">{c.concept}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {p.documentation.length > 0 && (
        <section className="panel">
          <h2>Where the system is documented</h2>
          <ul>
            {p.documentation.map((d, i) => (
              <li key={i}>
                <Source source={d} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

export function Reference({ id }: { id?: string }) {
  const { kb } = useApp();
  const current = kb.systems.find((s) => s.id === id) ?? kb.systems[0];
  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">Reference</div>
          <h1>Education systems</h1>
        </div>
        <p className="lede" style={{ margin: 0 }}>
          What evalua knows about each system, where each fact came from, and when it was added. Nothing here contains student data.
        </p>
      </div>
      <div className="two-col">
        <nav aria-label="Education systems">
          <ul className="side-list">
            <li className="grp">{kb.systems.length} profiles · {kb.schoolYear}</li>
            {kb.systems.map((s) => (
              <li key={s.id}>
                <a href={`#/reference/${s.id}`} aria-current={s.id === current.id ? 'true' : undefined}>
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <Profile p={current} />
      </div>
    </>
  );
}
