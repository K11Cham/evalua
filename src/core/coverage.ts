// Curriculum coverage: what part of a school year each row documents, which US course on a ladder the work
// belongs to, and where the student should continue. Credit follows documented work; placement follows
// what the student's own system is expected to have covered by the date of the document.
import { LADDER_LABEL, LADDER_OF, topicLabel, usCourses } from '../kb/usCourses.ts';
import type { Calendar, DistrictProfile, ExtractedCourse, LadderStep, Placement, Reason, Sequence, SystemProfile, UsCourse } from './types.ts';

const DEFAULT_CALENDAR: Calendar = {
  unit: 'semester',
  perYear: 2,
  note: 'No calendar is on file for this system; a year of two semesters is assumed.',
  provenance: { source: { title: 'evalua default (no calendar on file)' }, schoolYear: '', addedOn: '' },
};

const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
const frac = (n: number, d: number) => (n === d ? 'the whole year' : `${n} of ${d} ${d === 3 ? 'terms' : 'parts'}`);

export interface Span {
  /** Fraction of a school year documented by this row. */
  share: number;
  /** Position within the year (1-based), when the row is for one part of the year. */
  index?: number;
  perYear: number;
  unit: string;
  reasons: Reason[];
}

export interface CoverageOptions {
  /** Grade levels where the counselor has confirmed the earlier terms of the year were completed. */
  earlierTermsDone?: number[];
}

/** How much of a school year each course row documents. Rows for several terms of one subject add up. */
export function spans(courses: ExtractedCourse[], profile: SystemProfile | undefined, opts: CoverageOptions = {}): Map<string, Span> {
  const cal = profile?.calendar ?? DEFAULT_CALENDAR;
  const out = new Map<string, Span>();
  const nameKey = (c: ExtractedCourse) => (c.name.original ?? c.name.value).toLowerCase().replace(/\s+/g, ' ').trim();
  for (const c of courses) {
    const idx = c.term ? Number(c.term) : NaN;
    if (c.wholeYear || !Number.isFinite(idx) || idx < 1) {
      out.set(c.id, { share: 1, perYear: cal.perYear, unit: cal.unit, reasons: [] });
      continue;
    }
    // The document's own word wins over the system's default calendar.
    const n = c.termUnit === 'semester' ? 2 : c.termUnit === 'quarter' ? 4 : c.termUnit === 'trimester' ? 3 : cal.perYear;
    const part = Math.min(idx, n);
    const reasons: Reason[] = [];
    let share = 1 / n;
    // Other rows for the same subject in the same year already document those terms.
    const siblings = courses.filter((x) => x !== c && x.level === c.level && nameKey(x) === nameKey(c) && x.term);
    const confirmed = c.level != null && (opts.earlierTermsDone ?? []).includes(c.level) && !siblings.some((x) => Number(x.term) < part);
    if (confirmed && part > 1) {
      share = part / n;
      reasons.push({ text: `This row is for the ${ORD[part] ?? part} ${cal.unit} of ${n}. The counselor confirmed the earlier ${cal.unit}s of this year were completed, so it stands for ${frac(part, n)} (${share.toFixed(2)} of the year).`, source: cal.provenance.source });
    } else {
      reasons.push({
        text: `This row is for the ${ORD[part] ?? part} ${cal.unit} only; ${profile?.name ?? 'this system'} has ${n} ${cal.unit}s a year, so it documents ${share.toFixed(2)} of a full-year course.${part > 1 && !siblings.length ? ` Earlier ${cal.unit}s of this year are not on the document.` : ''}`,
        source: cal.provenance.source,
      });
    }
    out.set(c.id, { share, index: part, perYear: n, unit: cal.unit, reasons });
  }
  return out;
}

const rungs = (ladder: string) => usCourses.filter((u) => u.ladder === ladder).sort((a, b) => a.rung - b.rung);
const byLevelTopics = (seq: Sequence, level: number) => seq.byLevel[String(level)] ?? [];

/** Topics expected to be covered at a point in time: lower secondary, earlier years, and part of this year. */
function expectedTopics(seq: Sequence, level: number, fractionOfYear: number): Set<string> {
  const s = new Set(seq.before);
  const levels = Object.keys(seq.byLevel).map(Number).sort((a, b) => a - b);
  for (const l of levels) {
    if (l < level) for (const t of byLevelTopics(seq, l)) s.add(t);
  }
  // Topics are listed in teaching order, so part of a year covers the first part of its list.
  const year = byLevelTopics(seq, level);
  for (const t of year.slice(0, Math.round(year.length * Math.min(1, fractionOfYear)))) s.add(t);
  return s;
}

const coverageOf = (u: UsCourse, have: Set<string>) => u.topics.filter((x) => have.has(x.id)).length / u.topics.length;

export interface LadderAssignment {
  us: UsCourse;
  reasons: Reason[];
  /** How sure the placement on the ladder is, 0–1. */
  confidence: number;
}

export interface LadderPlan {
  assign: Map<string, LadderAssignment>;
  placements: Placement[];
}

/**
 * Places each row of a laddered subject (mathematics) on the US course sequence:
 *  - a course whose name identifies the US course (Matemáticas I → Algebra I) goes there directly;
 *  - a general course ("Mathematics", "Further Mathematics") goes to the US course that the year's topics
 *    advance most, using the system's sequence on file; without one, to the US course usually taken at that grade.
 * A US course that already has a full year of documented work passes later years on to the next rung.
 */
export function planLadders(
  courses: ExtractedCourse[],
  conceptOf: Map<string, string>,
  span: Map<string, Span>,
  profile: SystemProfile | undefined,
  district: DistrictProfile,
): LadderPlan {
  const assign = new Map<string, LadderAssignment>();
  const placements: Placement[] = [];
  const ladders = [...new Set(courses.map((c) => LADDER_OF[conceptOf.get(c.id) ?? '']?.ladder).filter((x): x is string => !!x))];
  for (const ladder of ladders) {
    const steps = rungs(ladder);
    const rows = courses
      .filter((c) => LADDER_OF[conceptOf.get(c.id) ?? '']?.ladder === ladder)
      .sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || (span.get(a.id)?.index ?? 0) - (span.get(b.id)?.index ?? 0));
    const filled = new Map<string, number>();
    for (const c of rows) {
      const concept = conceptOf.get(c.id)!;
      const direct = LADDER_OF[concept].course;
      const seq = profile?.sequences?.find((s) => s.concept === concept && s.ladder === ladder);
      let target: UsCourse | undefined;
      const reasons: Reason[] = [];
      let confidence = 0.5;
      if (direct) {
        target = steps.find((u) => u.id === direct);
        confidence = 0.9;
        reasons.push({ text: `The course name identifies it as ${target?.title}.` });
      } else if (seq && c.level != null && seq.byLevel[String(c.level)]) {
        const after = expectedTopics(seq, c.level, 1);
        confidence = seq.confidence;
        if (seq.kind === 'spiral') {
          // Year n of a spiral sequence is the n-th US course after what lower secondary completed.
          const levels = Object.keys(seq.byLevel).map(Number).sort((a, b) => a - b);
          const pre = new Set(seq.before);
          const entry = Math.max(0, steps.findIndex((u) => coverageOf(u, pre) < 0.75));
          target = steps[Math.min(steps.length - 1, entry + levels.indexOf(c.level))];
          const cov = coverageOf(target, after);
          reasons.push({
            text: `${profile!.name} ${c.name.value || 'mathematics'} is a spiral course: each year revisits algebra, geometry, trigonometry and statistics, like the US integrated pathway. This is year ${levels.indexOf(c.level) + 1} of ${levels.length}, so it stands for the ${['first', 'second', 'third', 'fourth', 'fifth'][entry + levels.indexOf(c.level)]} US course, ${target.title}; by the end of this year about ${Math.round(cov * 100)}% of ${target.title}’s topics are expected to be covered.`,
            source: seq.source,
          });
          if (cov < 0.5) reasons.push({ text: `Less than half of ${target.title}’s topics are covered by then, so check the course content before awarding it as ${target.title}.` });
        } else {
          const before = expectedTopics(seq, c.level, 0);
          let best = -1;
          let bestGain = 0;
          steps.forEach((u, i) => {
            if (u.rung < (seq.minRung ?? 1)) return;
            const gain = coverageOf(u, after) - coverageOf(u, before);
            if (gain > bestGain + 1e-9) ((best = i), (bestGain = gain));
          });
          if (best >= 0) {
            target = steps[best];
            const taught = byLevelTopics(seq, c.level).filter((x) => target!.topics.some((y) => y.id === x)).map(topicLabel);
            reasons.push({ text: `This year of ${c.name.value || concept} covers ${taught.slice(0, 5).join('; ')}${taught.length > 5 ? '…' : ''}: mostly ${target.title} content.`, source: seq.source });
          }
        }
        if (seq.note) reasons.push({ text: seq.note });
      }
      if (!target) {
        const lv = c.level ?? 10;
        const usual = concept === 'math.advanced' ? Math.max(12, lv + 1) : lv;
        target = steps.find((u) => u.usualLevel >= usual) ?? steps[steps.length - 1];
        reasons.push({
          text: `No year-by-year syllabus for this subject is on file for ${profile?.name ?? 'this system'}, so it is placed where a US student usually is at grade ${lv}: ${target.title}${concept === 'math.advanced' ? ' (an advanced mathematics course is placed one step higher)' : ''}. Check the syllabus or ask the school.`,
        });
        confidence = 0.45;
      }
      // A full year of documented work completes a course; further years move up the ladder.
      while ((filled.get(target.id) ?? 0) >= 0.999 && target.rung < steps[steps.length - 1].rung) {
        const next = steps.find((u) => u.rung === target!.rung + 1)!;
        reasons.push({ text: `${target.title} already has a full year of work on this record, so this year counts toward ${next.title}.` });
        target = next;
      }
      filled.set(target.id, (filled.get(target.id) ?? 0) + (span.get(c.id)?.share ?? 1));
      assign.set(c.id, { us: target, reasons, confidence });
    }

    // Placement as of the latest row on this ladder.
    const last = rows[rows.length - 1];
    const lastSpan = span.get(last.id);
    const lv = last.level;
    const yearFraction = lastSpan?.index ? lastSpan.index / lastSpan.perYear : 1;
    const seq = profile?.sequences?.find((s) => s.ladder === ladder && s.concept === 'math.general');
    const have = new Set<string>();
    const reasons: Reason[] = [];
    let confidence = 0.45;
    if (seq && lv != null) {
      for (const x of expectedTopics(seq, lv, yearFraction)) have.add(x);
      const adv = profile?.sequences?.find((s) => s.ladder === ladder && s.concept === 'math.advanced');
      if (adv && rows.some((r) => conceptOf.get(r.id) === 'math.advanced')) for (const x of expectedTopics(adv, lv, yearFraction)) have.add(x);
      confidence = seq.confidence;
      reasons.push({ text: `Expected coverage follows ${seq.source.title}: lower-secondary topics, every earlier year, and ${yearFraction < 1 ? `the first ${Math.round(yearFraction * 100)}% of` : 'all of'} grade ${lv}.`, source: seq.source });
      if (seq.note) reasons.push({ text: seq.note });
    }
    // Courses with documented work count as covered in proportion to it.
    const documented = new Map<string, number>();
    for (const [id, a] of assign) if (rows.some((r) => r.id === id)) documented.set(a.us.id, (documented.get(a.us.id) ?? 0) + (span.get(id)?.share ?? 1));
    const ladderSteps: LadderStep[] = steps.map((u) => {
      let cov = coverageOf(u, have);
      if (!seq) {
        // No sequence on file: assume on-track US progress — earlier courses done, the current one in proportion.
        const usual = u.usualLevel;
        cov = lv == null ? 0 : usual < lv ? 1 : usual === lv ? yearFraction : 0;
      }
      cov = Math.max(cov, Math.min(1, documented.get(u.id) ?? 0));
      return {
        id: u.id, title: u.title, coverage: Math.round(cov * 100) / 100,
        covered: u.topics.filter((x) => have.has(x.id)).map((x) => x.label),
        missing: u.topics.filter((x) => !have.has(x.id)).map((x) => x.label),
      };
    });
    if (!seq) reasons.push({ text: `No syllabus sequence for ${profile?.name ?? 'this system'} is on file, so earlier US courses are assumed complete at the usual US grade levels. Treat this as a starting point and check the student’s earlier records.` });
    const completed = ladderSteps.filter((s) => s.coverage >= 0.75).map((s) => s.title);
    const nextStep = ladderSteps.find((s) => s.coverage < 0.75);
    let continueIn: Placement['continueIn'] = null;
    if (nextStep) {
      const u = steps.find((x) => x.id === nextStep.id)!;
      const cat = district.catalog.find((k) => k.concepts.includes(u.concept));
      continueIn = { title: u.title, catalogTitle: cat?.title ?? null, coverage: nextStep.coverage };
      reasons.push({
        text:
          nextStep.coverage >= 0.2
            ? `${u.title} is in progress (about ${Math.round(nextStep.coverage * 100)}% of its topics expected by now). Topics still to come: ${nextStep.missing.join('; ')}.`
            : `${u.title} is the next course; little of it is expected to be covered yet.`,
      });
      // In a spiral system the next course is often almost as far along: say so, so the counselor can choose.
      const after = ladderSteps[ladderSteps.indexOf(nextStep) + 1];
      if (after && after.coverage >= 0.4 && after.coverage >= nextStep.coverage - 0.15) {
        reasons.push({ text: `${after.title} is about as far along (${Math.round(after.coverage * 100)}%). A counselor may place the student in ${after.title} and cover the remaining ${u.title} topics (${nextStep.missing.join('; ')}) alongside.` });
      }
      const validate = district.policies.find((p) => p.id === 'sequence-validation');
      if (validate) reasons.push({ text: validate.text, source: validate.source });
    }
    const unit = lastSpan?.index ? `, ${ORD[lastSpan.index] ?? lastSpan.index} ${lastSpan.unit}` : '';
    placements.push({ ladder, label: LADDER_LABEL[ladder] ?? ladder, asOf: lv != null ? `Grade ${lv}${unit}` : 'Date not known', steps: ladderSteps, completed, continueIn, confidence, reasons });
  }
  return { assign, placements };
}

/**
 * Rounds the documented share of each US course to the district's credit step.
 * 0.04 of slack lets two of three terms (0.67) count as one semester (0.5) but not a single term (0.33).
 */
export function roundToStep(share: number, step: number): number {
  if (share <= 0) return 0;
  return Math.min(1, Math.floor((share + 0.04) / step) * step);
}
