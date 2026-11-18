// "Taught in English": the language of instruction, how strong the evidence is, and what it does and does not mean
// for English-learner services. evalua never decides EL status; it shows the evidence for the district's process.
import { STRENGTH_LABEL } from '../core/instruction.ts';
import type { DistrictProfile, Evaluation, Extraction } from '../core/types.ts';
import { Source } from './bits.tsx';

interface Props {
  ex: Extraction;
  evaluation: Evaluation;
  district: DistrictProfile;
  /** The printed report: no details toggle, everything shown. */
  print?: boolean;
}

export function InstructionNote({ ex, evaluation, district, print }: Props) {
  const a = evaluation.instruction;
  const named = (concept: string) =>
    evaluation.suggestions
      .filter((s) => s.conceptId === concept)
      .map((s) => ex.courses.find((c) => c.id === s.courseId)?.name.original)
      .filter((n, i, all): n is string => !!n && all.indexOf(n) === i);
  const ela = a.english === true ? named('ela.english') : [];
  const efl = a.english === false ? named('ela.efl') : [];
  const list = (ns: string[]) => ns.slice(0, 3).map((n) => `“${n}”`).join(', ');
  const identify = district.policies.find((p) => p.id === 'el-identification');
  const office = district.policies.find((p) => p.id === 'international-transcripts');
  const cls = a.english === true ? 'english' : a.english === false ? 'other' : 'unknown';

  const evidence = (
    <ul className="evidence">
      {a.evidence.map((e, i) => (
        <li key={i}>
          {e.text} {e.source && <Source source={e.source} />}
        </li>
      ))}
    </ul>
  );

  return (
    <section className={`instruction ${cls}`} aria-labelledby="instr-h">
      <h3 id="instr-h">Language of instruction</h3>
      <p className="instr-summary">
        <strong>{a.summary}</strong>
        {ela.length > 0 && ` ${list(ela)} on this record ${ela.length > 1 ? 'are' : 'is'} English language arts.`}
        {efl.length > 0 && ` ${list(efl)} on this record ${efl.length > 1 ? 'are' : 'is'} English studied as a foreign language.`}
      </p>
      <p className="small instr-strength">
        Evidence: <strong>{STRENGTH_LABEL[a.strength]}</strong>
        {a.translated && ' · this is a translation'}
      </p>
      {print ? evidence : (
        <details>
          <summary className="small">Why</summary>
          {evidence}
        </details>
      )}
      <div className="el-note small">
        {a.english === true ? (
          <p>
            <strong>Evidence of English-medium schooling.</strong> Placement in English-learner services should follow the district’s identification process, not country of origin. This record does not decide it either way.
          </p>
        ) : (
          <p>
            <strong>This record does not decide English-learner status.</strong> Placement in English-learner services follows the district’s identification process, not country of origin or the language a record is written in.
          </p>
        )}
        {identify ? (
          <p>
            {identify.text} <Source source={identify.source} />
            {(identify.more ?? []).map((s) => (
              <span key={s.title}> <Source source={s} /></span>
            ))}
          </p>
        ) : (
          <p>In US public schools that process is a home language survey at enrollment, then an English language proficiency screener for students whose survey names another language. Check your district’s own procedure.</p>
        )}
        {office && (
          <p>
            {office.title}: {office.text} <Source source={office.source} />
          </p>
        )}
      </div>
    </section>
  );
}
