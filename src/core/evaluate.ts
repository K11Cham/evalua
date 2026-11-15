// Evaluation: extracted courses + a district profile → suggested US credit, with reasoning and sources.
// Credit decisions are local policy. Everything here is a suggestion a counselor can change.
//
// Credit follows documented work, not grades alone:
//   1. how much of a school year each row documents (one term of three, a semester, a full year, an exam);
//   2. which US course the work is (subjects on a ladder, like mathematics, are placed by syllabus topics);
//   3. the documented shares of each US course added up and rounded to the district's credit step.
import { convertGrade, type SectionContext } from './convert.ts';
import { planLadders, roundToStep, spans, type CoverageOptions } from './coverage.ts';
import { buildMatcher } from './match.ts';
import { usCourses } from '../kb/usCourses.ts';
import type {
  CatalogCourse, Concept, DistrictProfile, Evaluation, Extraction, GradeConversion, KnowledgeBase, Reason, Requirement, RequirementProgress, Suggestion, SystemProfile, USLetter, VerifyFlag,
} from './types.ts';

/** A counselor's change to one suggestion. Any field left undefined keeps the suggestion. */
export interface Override {
  conceptId?: string;
  requirementId?: string;
  credits?: number;
  letter?: USLetter;
  /** Exclude the course from the evaluation entirely. */
  exclude?: boolean;
  accepted?: boolean;
}

export type EvaluateOptions = CoverageOptions;

const usCourseConcept = (id: string) => usCourses.find((u) => u.id === id)?.concept ?? '';

const CARNEGIE = { title: 'Carnegie Foundation for the Advancement of Teaching: “What is the Carnegie Unit?”', url: 'https://www.carnegiefoundation.org/faqs/carnegie-unit/' };
const ORDINAL = ['', '', 'second year', 'third year', 'fourth year'];
const r2 = (x: number) => Math.round(x * 100) / 100;

function pickCatalog(district: DistrictProfile, conceptId: string, level: number | null, name = ''): CatalogCourse | null {
  const hits = district.catalog.filter((c) => c.concepts.includes(conceptId));
  if (!hits.length) return null;
  // Several catalog courses share a subject (Circuits, Automotive, Drafting): the course name decides.
  const n = name.toLowerCase();
  const byWord = hits.find((c) => c.keywords?.some((k) => n.includes(k)));
  if (byWord) return byWord;
  if (level != null) {
    const exact = hits.find((c) => c.levels?.includes(level));
    if (exact) return exact;
  }
  return hits[0];
}

interface Draft {
  courseId: string;
  concept: Concept;
  req: Requirement | undefined;
  reasons: Reason[];
  grade: GradeConversion;
  confidence: number;
  policySensitive: boolean;
  /** Year-course units before rounding (1 = one full-year course). */
  raw: number;
  rawReasons: Reason[];
  review: boolean;
  zero?: string;
}

/** Why a row earns nothing, or its unrounded year-course units, before district rounding. */
function baseUnits(
  c: Extraction['courses'][number],
  profile: SystemProfile | undefined,
  district: DistrictProfile,
  letter: USLetter | null,
  share: number,
): { raw: number; reasons: Reason[]; review: boolean; zero?: string } {
  if (profile?.credit.noCredit) {
    return { raw: 0, review: false, zero: 'admission test', reasons: [{ text: `${profile.name} is an admission test, not coursework: no credit is suggested. ${profile.credit.note}`, source: profile.credit.provenance.source }] };
  }
  if (letter === 'F') return { raw: 0, review: false, zero: 'failing grade', reasons: [{ text: 'Failing grade: no credit suggested.' }] };
  if (c.level != null && c.level < 9) {
    return { raw: 0, review: true, zero: 'below grade 9', reasons: [{ text: `Taken below grade 9 (grade ${c.level} equivalent). High school credit is suggested only if district policy allows it.` }] };
  }
  const fromHours = (hours: number, how: string, source?: Reason['source']) => {
    const units = Math.min(1, hours / district.hoursPerUnit);
    return {
      raw: units,
      review: false,
      reasons: [{ text: `${how} ÷ ${district.hoursPerUnit} hours per Carnegie unit = ${units.toFixed(2)} of a full-year course.`, source: source ?? CARNEGIE }],
    };
  };
  if (c.hours && c.hours.value > 0) return fromHours(c.hours.value, `${c.hours.value} hours of instruction`);
  if (c.credits && c.credits.value > 0 && profile?.credit.hoursPerCredit) {
    const hours = c.credits.value * profile.credit.hoursPerCredit;
    return fromHours(hours, `${c.credits.value} ${profile.name} credits × ${profile.credit.hoursPerCredit} hours each = ${Math.round(hours)} hours`, profile.credit.provenance.source);
  }
  if (profile?.credit.examCourseYears && !c.period.value && !c.term) {
    return {
      raw: 1,
      review: true,
      reasons: [{
        text: `This is an examination result, not a year-by-year record. One full-year course per subject is suggested; the subject normally represents ${profile.credit.examCourseYears} year(s) of study, so district policy may award more with a school transcript.`,
        source: profile.credit.provenance.source,
      }],
    };
  }
  if (share < 1) return { raw: share, review: false, reasons: [] };
  return { raw: 1, review: false, reasons: [{ text: 'Full-year course (no hours are printed on the document).' }] };
}

export function evaluate(ex: Extraction, kb: KnowledgeBase, district: DistrictProfile, overrides: Record<string, Override> = {}, opts: EvaluateOptions = {}): Evaluation {
  const profile = kb.systems.find((s) => s.id === ex.systemId.value);
  const generic = kb.systems.find((s) => s.id === 'generic');
  const englishDoc = ex.courses.length > 0 && ex.courses.filter((c) => c.translation === 'same').length >= ex.courses.length / 2;
  const match = buildMatcher(kb, profile, englishDoc);
  const flags: VerifyFlag[] = [];
  const elective = district.requirements.find((r) => r.id === 'elective');
  const unit = district.creditsPerYearCourse;
  const step = district.creditStep ?? 0.5;

  // Section context for scale selection: all grades that share a period label.
  const sections = new Map<string, SectionContext>();
  for (const c of ex.courses) {
    const s = sections.get(c.period.value) ?? { grades: [], hintText: c.period.value };
    s.grades.push(c.grade.value);
    sections.set(c.period.value, s);
  }

  const included = ex.courses.filter((c) => !overrides[c.id]?.exclude);
  const span = spans(included, profile, opts);
  const conceptOf = new Map<string, string>();
  const looks = new Map<string, ReturnType<typeof match>>();
  for (const c of included) {
    const look = match(c.name.original ?? c.name.value);
    looks.set(c.id, look);
    conceptOf.set(c.id, overrides[c.id]?.conceptId ?? look.conceptId);
  }
  const plan = planLadders(included, conceptOf, span, profile, district);

  // ── first pass: subject, requirement, grade, unrounded units ──
  const drafts: Draft[] = [];
  for (const c of included) {
    const ov = overrides[c.id] ?? {};
    const look = looks.get(c.id)!;
    const conceptId = conceptOf.get(c.id)!;
    const concept = kb.concepts.find((k) => k.id === conceptId) ?? kb.concepts.find((k) => k.id === 'elective.other')!;
    const reasons: Reason[] = [];
    if (ov.conceptId) reasons.push({ text: `Subject set by the counselor: ${concept.label}.` });
    else if (look.how === 'system-profile') reasons.push({ text: `“${c.name.original}” is listed in the ${profile!.name} profile as ${look.matched} → ${concept.label}.`, source: profile!.provenance.source });
    else if (look.how === 'system-profile-fuzzy') reasons.push({ text: `“${c.name.original}” closely resembles “${look.matched}” in the ${profile!.name} profile → ${concept.label}. Check the spelling was read correctly.`, source: profile!.provenance.source });
    else if (look.how === 'alias') reasons.push({ text: `“${c.name.original}” matches the subject dictionary entry for ${concept.label} (${concept.sced}).` });
    else if (look.how === 'alias-part') reasons.push({ text: `“${c.name.original}” contains a term for ${concept.label} (${concept.sced}).` });
    else if (look.how === 'alias-fuzzy') reasons.push({ text: `“${c.name.original}” is similar to a term for ${concept.label}. Low confidence: confirm the subject.` });
    else reasons.push({ text: `“${c.name.original}” was not recognised. It is placed as an unclassified elective until a counselor chooses a subject.` });

    const overrideReq = ov.requirementId ?? district.conceptOverrides[conceptId];
    const req =
      district.requirements.find((r) => r.id === overrideReq) ??
      district.requirements.find((r) => r.concepts?.includes(conceptId)) ??
      district.requirements.find((r) => r.id !== 'elective' && r.areas.includes(concept.area)) ??
      elective;
    const policy = district.policies.find((p) => p.id === `concept:${conceptId}`);
    if (ov.requirementId) reasons.push({ text: `Requirement area set by the counselor: ${req?.label ?? 'Elective'}.` });
    else if (policy) reasons.push({ text: `${policy.title}: ${policy.text}`, source: policy.source });
    else if (req && req.id !== 'elective') reasons.push({ text: `${concept.label} counts toward “${req.label}” in ${district.name} (${district.schoolYear}).`, source: district.provenance.source });
    else reasons.push({ text: `No graduation requirement in ${district.name} names this subject; it counts as an elective.`, source: district.provenance.source });

    const grade = convertGrade(c, profile, generic, sections.get(c.period.value)!);
    if (ov.letter) {
      grade.letter = ov.letter;
      grade.gpa = { A: 4, B: 3, C: 2, D: 1, F: 0, P: null, NC: null }[ov.letter];
      grade.percent = { A: 95, B: 85, C: 75, D: 65, F: 50, P: null, NC: null }[ov.letter];
      grade.confidence = 1;
      grade.reasons = [{ text: `US grade set by the counselor: ${ov.letter}.` }];
    }
    if (grade.letter === 'F' && !ov.letter && !c.grade.edited && c.grade.confidence < 0.995) {
      flags.push({
        id: `fail-${c.id}`, severity: 'check', courseId: c.id,
        title: `Converted to a failing grade: ${c.name.value || c.name.original}`,
        detail: `The grade was read as “${c.grade.value}” from a scan or photo, which converts to F. A misread digit can cause this: compare with the original.`,
        source: c.grade.source,
      });
    }
    const sp = span.get(c.id)!;
    const base = baseUnits(c, profile, district, grade.letter, sp.share);
    const matchConf = ov.conceptId ? 1 : look.confidence;
    drafts.push({
      courseId: c.id, concept, req, reasons, grade,
      confidence: Math.min(c.name.confidence || 0.5, matchConf, grade.letter ? Math.max(grade.confidence, 0.3) : 0.3),
      policySensitive: !!policy && !ov.requirementId,
      raw: base.raw, rawReasons: [...(base.zero ? [] : sp.reasons), ...base.reasons], review: base.review, zero: base.zero,
    });
  }

  // ── second pass: which US course each row is, then round per US course ──
  const courseOf = new Map(ex.courses.map((c) => [c.id, c]));
  const usOf = new Map<string, { id: string; title: string; concept: string }>();
  const extraReasons = new Map<string, Reason[]>();
  for (const d of drafts) {
    const a = plan.assign.get(d.courseId);
    if (a) {
      usOf.set(d.courseId, { id: a.us.id, title: a.us.title, concept: a.us.concept });
      extraReasons.set(d.courseId, a.reasons);
      d.confidence = Math.min(d.confidence, Math.max(0.5, a.confidence));
    }
  }
  // Second and later years of a single-course subject (Physics in SS1, SS2, SS3) are further study of it.
  const yearsSeen = new Map<string, number[]>();
  for (const d of [...drafts].sort((a, b) => (courseOf.get(a.courseId)!.level ?? 0) - (courseOf.get(b.courseId)!.level ?? 0))) {
    if (usOf.has(d.courseId) || !['science', 'social', 'world_language', 'ela'].includes(d.concept.area)) continue;
    const lv = courseOf.get(d.courseId)!.level;
    if (lv == null) continue;
    const seen = yearsSeen.get(d.concept.id) ?? [];
    if (!seen.includes(lv)) seen.push(lv);
    yearsSeen.set(d.concept.id, seen);
  }
  // Rows pool their credit only when they are the same course: the same US course on a ladder, or the same
  // printed course name in the same year (its term reports). Different courses in one area never share.
  const nameKey = (id: string) => (courseOf.get(id)!.name.original ?? courseOf.get(id)!.name.value).toLowerCase().replace(/\s+/g, ' ').trim();
  const groupKey = (d: Draft) => usOf.get(d.courseId)?.id ?? `${d.concept.id}|${courseOf.get(d.courseId)!.level ?? '?'}|${nameKey(d.courseId)}`;
  const groups = new Map<string, Draft[]>();
  for (const d of drafts) {
    if (overrides[d.courseId]?.credits != null || d.zero) continue;
    groups.set(groupKey(d), [...(groups.get(groupKey(d)) ?? []), d]);
  }
  const awarded = new Map<string, { credits: number; reasons: Reason[]; review: boolean }>();
  for (const [, ds] of groups) {
    const sum = ds.reduce((a, d) => a + d.raw, 0);
    const units = roundToStep(sum, step);
    const title = usOf.get(ds[0].courseId)?.title ?? ds[0].concept.label;
    const reasons: Reason[] = [];
    const partial = sum < 0.999;
    if (partial || ds.length > 1) {
      reasons.push({
        text:
          `${ds.length > 1 ? `${ds.length} rows on this record add up to` : 'This record documents'} ${r2(sum)} of a full-year ${title} course. ` +
          (units > 0
            ? `${district.name} awards credit in steps of ${step} of a course, so ${r2(units * unit)} credit${units * unit === 1 ? ' is' : 's are'} suggested.`
            : `${district.name} awards credit in steps of ${step} of a course, so no credit is suggested yet. Add the reports for the rest of the year, or confirm completed terms, to award it.`),
        source: district.provenance.source,
      });
    } else {
      reasons.push({ text: `One full-year course: ${unit} credit${unit === 1 ? '' : 's'} suggested.` });
    }
    // Split the award across the rows in proportion, in whole hundredths that add up exactly.
    const total = Math.round(units * unit * 100);
    const exact = ds.map((d) => (sum > 0 ? (total * d.raw) / sum : 0));
    const cents = exact.map(Math.floor);
    let left = total - cents.reduce((a, b) => a + b, 0);
    const order = exact.map((x, j) => [x - Math.floor(x), j] as const).sort((a, b) => b[0] - a[0]);
    for (const [, j] of order) {
      if (left <= 0) break;
      cents[j]++;
      left--;
    }
    ds.forEach((d, i) => awarded.set(d.courseId, { credits: cents[i] / 100, reasons, review: units === 0 && sum > 0 }));
  }

  const suggestions: Suggestion[] = drafts.map((d) => {
    const c = courseOf.get(d.courseId)!;
    const ov = overrides[d.courseId] ?? {};
    const us = usOf.get(d.courseId);
    const seen = yearsSeen.get(d.concept.id);
    const ordinal = !us && seen && c.level != null && seen.indexOf(c.level) > 0 ? ORDINAL[seen.indexOf(c.level) + 1] : '';
    const cat = pickCatalog(district, us?.concept ?? d.concept.id, c.level, `${c.name.value} ${c.name.original ?? ''}`);
    const catalogTitle = cat ? `${cat.title}${ordinal ? ` (${ordinal})` : ''}` : null;
    const aw = awarded.get(d.courseId);
    const credits = ov.credits ?? aw?.credits ?? 0;
    const creditReasons = ov.credits != null ? [{ text: `Credits set by the counselor: ${ov.credits}.` }] : [...d.rawReasons, ...(aw?.reasons ?? [])];
    const placeReasons = [...(extraReasons.get(d.courseId) ?? [])];
    if (ordinal) placeReasons.push({ text: `${d.concept.label} also appears in an earlier year of this record, so this is its ${ordinal}; it counts as further study in the subject rather than a repeat of the same US course.` });
    const confidence = r2(d.confidence);
    return {
      courseId: d.courseId,
      conceptId: d.concept.id,
      conceptLabel: d.concept.label,
      requirementId: d.req?.id ?? 'elective',
      requirementLabel: d.req?.label ?? 'Elective',
      catalogTitle,
      usCourse: us ? { id: us.id, title: us.title } : undefined,
      share: r2(span.get(d.courseId)?.share ?? 1),
      credits,
      grade: d.grade,
      confidence,
      reasons: [...d.reasons, ...placeReasons, ...creditReasons, ...d.grade.reasons],
      needsReview: !ov.accepted && (confidence < 0.7 || d.concept.id === 'elective.other' || !d.grade.letter || ((d.review || !!aw?.review) && ov.credits == null) || d.policySensitive),
    };
  });

  // Graduation requirement progress. Credit beyond a requirement spills into electives.
  const earnedBy = new Map<string, { earned: number; ids: string[] }>();
  for (const s of suggestions) {
    if (s.credits <= 0) continue;
    const e = earnedBy.get(s.requirementId) ?? { earned: 0, ids: [] };
    e.earned += s.credits;
    e.ids.push(s.courseId);
    earnedBy.set(s.requirementId, e);
  }
  // Named courses: each credited US course meets at most one of them (one English row is not English I and II).
  const conceptsOf = (s: Suggestion) => [usOf.get(s.courseId)?.concept, s.conceptId].filter(Boolean) as string[];
  const used = new Set<string>();
  const creditByCourse = new Map<string, { credits: number; ids: string[]; concepts: string[] }>();
  for (const s of [...suggestions].sort((a, b) => (courseOf.get(a.courseId)!.level ?? 0) - (courseOf.get(b.courseId)!.level ?? 0))) {
    if (s.credits <= 0) continue;
    const k = usOf.get(s.courseId)?.id ?? `${s.conceptId}|${courseOf.get(s.courseId)!.level ?? '?'}|${nameKey(s.courseId)}`;
    const e = creditByCourse.get(k) ?? { credits: 0, ids: [], concepts: conceptsOf(s) };
    e.credits += s.credits;
    e.ids.push(s.courseId);
    creditByCourse.set(k, e);
  }
  const expectedOf = (concepts: string[]) => {
    for (const p of plan.placements) {
      const st = p.steps.find((x) => concepts.includes(usCourseConcept(x.id)));
      if (st && st.coverage >= 0.75) return `about ${Math.round(st.coverage * 100)}% expected to be covered by earlier years (${p.asOf}); not on this record`;
    }
    return undefined;
  };
  const matchInclude = (concepts: string[]) => {
    for (const [k, e] of creditByCourse) {
      if (used.has(k) || !e.concepts.some((c) => concepts.includes(c))) continue;
      used.add(k);
      return e.credits;
    }
    return 0;
  };
  let spill = 0;
  const progress: RequirementProgress[] = [];
  for (const r of district.requirements) {
    if (r.id === 'elective') continue;
    const e = earnedBy.get(r.id) ?? { earned: 0, ids: [] };
    const counted = Math.min(e.earned, r.credits);
    spill += e.earned - counted;
    progress.push({
      requirementId: r.id, label: r.label, required: r.credits, earned: r2(counted), remaining: r2(Math.max(0, r.credits - counted)), courseIds: e.ids,
      includes: r.includes?.map((i) => {
        const got = matchInclude(i.concepts);
        return { label: i.label, met: got >= 0.99, partial: got > 0 && got < 0.99, note: i.note, expected: got > 0 ? undefined : expectedOf(i.concepts) };
      }),
    });
  }
  if (elective) {
    const e = earnedBy.get('elective') ?? { earned: 0, ids: [] };
    const counted = Math.min(e.earned + spill, elective.credits);
    progress.push({ requirementId: 'elective', label: elective.label, required: elective.credits, earned: r2(counted), remaining: r2(Math.max(0, elective.credits - counted)), courseIds: e.ids });
  }
  const totalEarned = r2(suggestions.reduce((a, s) => a + s.credits, 0));

  // Over-award check per academic year.
  const perYear = new Map<string, number>();
  for (const s of suggestions) {
    const c = courseOf.get(s.courseId)!;
    const k = c.level != null ? `grade ${c.level}` : (c.academicYear ?? '');
    if (k) perYear.set(k, (perYear.get(k) ?? 0) + s.credits);
  }
  for (const [year, total] of perYear) {
    const typical = district.typicalCreditsPerYear;
    if (total > typical * 1.3) {
      flags.push({
        id: `load-${year}`, severity: 'check',
        title: `Suggested credits for ${year} exceed a normal year`,
        detail: `${r2(total)} credits are suggested for ${year}; a full-time student in ${district.name} normally earns about ${typical}. Many systems teach more subjects for fewer hours each. Consider reducing credits per course for this year.`,
      });
    }
  }
  // District rule about students who already finished secondary school abroad.
  const finished = district.policies.find((p) => p.id === 'completed-abroad');
  // A full final year, or a school-leaving certificate (an exam result placed at grade 12). Not an entrance test.
  const finalYear = !profile?.credit.noCredit && included.some((c) => (c.level ?? 0) >= 12 && (span.get(c.id)?.share ?? 1) >= 1);
  if (finished && finalYear) {
    flags.push({ id: 'completed-abroad', severity: 'important', title: 'The record may show completed secondary education', detail: `${finished.text} (${finished.source.title})` });
  }
  // A single term or semester on its own: say so once, plainly.
  const partials = drafts.filter((d) => (span.get(d.courseId)?.share ?? 1) < 1 && !d.zero);
  if (partials.length && partials.length === drafts.filter((d) => !d.zero).length) {
    const sp = span.get(partials[0].courseId)!;
    flags.push({
      id: 'partial-year', severity: 'check',
      title: `This record covers part of a school year`,
      detail: `Every course on it is for one ${sp.unit} (${sp.perYear} make a year), so each documents about ${r2(sp.share)} of a course. Credit is suggested only for documented work. Ask for the other ${sp.unit} reports, or confirm the earlier ${sp.unit}s were completed, and use the placement suggestions to continue the student in the right courses.`,
    });
  }

  return { districtId: district.id, schoolYear: district.schoolYear, suggestions, progress, totalEarned, totalRequired: district.totalCredits, flags, placements: plan.placements };
}
