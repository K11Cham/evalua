// Evaluation: extracted courses + a district profile → suggested US credit, with reasoning and sources.
// Credit decisions are local policy. Everything here is a suggestion a counselor can change.
import { convertGrade, type SectionContext } from './convert.ts';
import { buildMatcher } from './match.ts';
import type {
  CatalogCourse, DistrictProfile, Evaluation, ExtractedCourse, Extraction, KnowledgeBase, Reason, RequirementProgress, Suggestion, SystemProfile, USLetter, VerifyFlag,
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

const CARNEGIE = { title: 'Carnegie Foundation for the Advancement of Teaching: “What is the Carnegie Unit?”', url: 'https://www.carnegiefoundation.org/faqs/carnegie-unit/' };
const roundQuarter = (x: number) => Math.round(x * 4) / 4;

interface CreditResult {
  credits: number;
  reasons: Reason[];
  review: boolean;
}

function suggestCredits(c: ExtractedCourse, profile: SystemProfile | undefined, district: DistrictProfile, letter: USLetter | null): CreditResult {
  const unit = district.creditsPerYearCourse;
  const fmt = (n: number) => `${n} ${n === 1 ? 'credit' : 'credits'}`;
  if (profile?.credit.noCredit) {
    return { credits: 0, review: false, reasons: [{ text: `${profile.name} is an admission test, not coursework: no credit is suggested. ${profile.credit.note}`, source: profile.credit.provenance.source }] };
  }
  if (letter === 'F') return { credits: 0, review: false, reasons: [{ text: 'Failing grade: no credit suggested.' }] };
  if (c.level != null && c.level < 9) {
    return { credits: 0, review: true, reasons: [{ text: `Taken below grade 9 (grade ${c.level} equivalent). High school credit is suggested only if district policy allows it.` }] };
  }
  const fromHours = (hours: number, how: string, source?: Reason['source']): CreditResult => {
    const units = Math.max(0.25, Math.min(1, roundQuarter(hours / district.hoursPerUnit)));
    return {
      credits: units * unit,
      review: false,
      reasons: [
        { text: `${how} ÷ ${district.hoursPerUnit} hours per Carnegie unit = ${(hours / district.hoursPerUnit).toFixed(2)}, rounded to ${fmt(units * unit)}${unit !== 1 ? ` (this district awards ${unit} credits per full-year course)` : ''}.`, source: source ?? CARNEGIE },
      ],
    };
  };
  if (c.hours && c.hours.value > 0) return fromHours(c.hours.value, `${c.hours.value} hours of instruction`);
  if (c.credits && c.credits.value > 0 && profile?.credit.hoursPerCredit) {
    const hours = c.credits.value * profile.credit.hoursPerCredit;
    return fromHours(hours, `${c.credits.value} ${profile.name} credits × ${profile.credit.hoursPerCredit} hours each = ${Math.round(hours)} hours`, profile.credit.provenance.source);
  }
  if (c.term) {
    return { credits: 0.5 * unit, review: false, reasons: [{ text: `One term of a two-term year: ${fmt(0.5 * unit)} suggested (no hours are printed on the document).` }] };
  }
  if (profile?.credit.examCourseYears && !c.period.value) {
    return {
      credits: unit,
      review: true,
      reasons: [{
        text: `This is an examination result, not a year-by-year record. ${fmt(unit)} per subject is suggested; the subject normally represents ${profile.credit.examCourseYears} year(s) of study, so district policy may award more with a school transcript.`,
        source: profile.credit.provenance.source,
      }],
    };
  }
  return { credits: unit, review: false, reasons: [{ text: `Full-year course: ${fmt(unit)} suggested (no hours are printed on the document).` }] };
}

function pickCatalog(district: DistrictProfile, conceptId: string, level: number | null): CatalogCourse | null {
  const hits = district.catalog.filter((c) => c.concepts.includes(conceptId));
  if (!hits.length) return null;
  if (level != null) {
    const exact = hits.find((c) => c.levels?.includes(level));
    if (exact) return exact;
  }
  return hits[0];
}

export function evaluate(ex: Extraction, kb: KnowledgeBase, district: DistrictProfile, overrides: Record<string, Override> = {}): Evaluation {
  const profile = kb.systems.find((s) => s.id === ex.systemId.value);
  const generic = kb.systems.find((s) => s.id === 'generic');
  const englishDoc = ex.courses.length > 0 && ex.courses.filter((c) => c.translation === 'same').length >= ex.courses.length / 2;
  const match = buildMatcher(kb, profile, englishDoc);
  const flags: VerifyFlag[] = [];
  const elective = district.requirements.find((r) => r.id === 'elective');

  // Section context for scale selection: all grades that share a period label.
  const sections = new Map<string, SectionContext>();
  for (const c of ex.courses) {
    const s = sections.get(c.period.value) ?? { grades: [], hintText: c.period.value };
    s.grades.push(c.grade.value);
    sections.set(c.period.value, s);
  }

  const suggestions: Suggestion[] = [];
  for (const c of ex.courses) {
    const ov = overrides[c.id] ?? {};
    if (ov.exclude) continue;
    const look = match(c.name.original ?? c.name.value);
    const conceptId = ov.conceptId ?? look.conceptId;
    const concept = kb.concepts.find((k) => k.id === conceptId) ?? kb.concepts.find((k) => k.id === 'elective.other')!;
    const reasons: Reason[] = [];
    if (ov.conceptId) reasons.push({ text: `Subject set by the counselor: ${concept.label}.` });
    else if (look.how === 'system-profile') reasons.push({ text: `“${c.name.original}” is listed in the ${profile!.name} profile as ${look.matched} → ${concept.label}.`, source: profile!.provenance.source });
    else if (look.how === 'system-profile-fuzzy') reasons.push({ text: `“${c.name.original}” closely resembles “${look.matched}” in the ${profile!.name} profile → ${concept.label}. Check the spelling was read correctly.`, source: profile!.provenance.source });
    else if (look.how === 'alias') reasons.push({ text: `“${c.name.original}” matches the subject dictionary entry for ${concept.label} (${concept.sced}).` });
    else if (look.how === 'alias-part') reasons.push({ text: `“${c.name.original}” contains a term for ${concept.label} (${concept.sced}).` });
    else if (look.how === 'alias-fuzzy') reasons.push({ text: `“${c.name.original}” is similar to a term for ${concept.label}. Low confidence: confirm the subject.` });
    else reasons.push({ text: `“${c.name.original}” was not recognised. It is placed as an unclassified elective until a counselor chooses a subject.` });

    // Where it counts in this district.
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
    const cat = pickCatalog(district, conceptId, c.level);

    const section = sections.get(c.period.value)!;
    const grade = convertGrade(c, profile, generic, section);
    if (ov.letter) {
      grade.letter = ov.letter;
      grade.gpa = { A: 4, B: 3, C: 2, D: 1, F: 0, P: null, NC: null }[ov.letter];
      grade.percent = { A: 95, B: 85, C: 75, D: 65, F: 50, P: null, NC: null }[ov.letter];
      grade.confidence = 1;
      grade.reasons = [{ text: `US grade set by the counselor: ${ov.letter}.` }];
    }
    const credit = suggestCredits(c, profile, district, grade.letter);
    const credits = ov.credits ?? credit.credits;
    const creditReasons = ov.credits != null ? [{ text: `Credits set by the counselor: ${ov.credits}.` }] : credit.reasons;

    const matchConf = ov.conceptId ? 1 : look.confidence;
    const confidence = Math.round(Math.min(c.name.confidence || 0.5, matchConf, grade.letter ? Math.max(grade.confidence, 0.3) : 0.3) * 100) / 100;
    const policySensitive = !!policy && !ov.requirementId;
    suggestions.push({
      courseId: c.id,
      conceptId,
      conceptLabel: concept.label,
      requirementId: req?.id ?? 'elective',
      requirementLabel: req?.label ?? 'Elective',
      catalogTitle: cat?.title ?? null,
      credits,
      grade,
      confidence,
      reasons: [...reasons, ...creditReasons, ...grade.reasons],
      needsReview: !ov.accepted && (confidence < 0.7 || conceptId === 'elective.other' || !grade.letter || (credit.review && ov.credits == null) || policySensitive),
    });
  }

  // Graduation requirement progress. Credit beyond a requirement spills into electives.
  const earnedBy = new Map<string, { earned: number; ids: string[] }>();
  for (const s of suggestions) {
    if (s.credits <= 0) continue;
    const e = earnedBy.get(s.requirementId) ?? { earned: 0, ids: [] };
    e.earned += s.credits;
    e.ids.push(s.courseId);
    earnedBy.set(s.requirementId, e);
  }
  let spill = 0;
  const progress: RequirementProgress[] = [];
  for (const r of district.requirements) {
    if (r.id === 'elective') continue;
    const e = earnedBy.get(r.id) ?? { earned: 0, ids: [] };
    const counted = Math.min(e.earned, r.credits);
    spill += e.earned - counted;
    progress.push({ requirementId: r.id, label: r.label, required: r.credits, earned: counted, remaining: Math.max(0, r.credits - counted), courseIds: e.ids });
  }
  if (elective) {
    const e = earnedBy.get('elective') ?? { earned: 0, ids: [] };
    const total = e.earned + spill;
    const counted = Math.min(total, elective.credits);
    progress.push({ requirementId: 'elective', label: elective.label, required: elective.credits, earned: counted, remaining: Math.max(0, elective.credits - counted), courseIds: e.ids });
  }
  const totalEarned = Math.round(suggestions.reduce((a, s) => a + s.credits, 0) * 100) / 100;

  // Over-award check per academic year.
  const perYear = new Map<string, number>();
  for (const s of suggestions) {
    const c = ex.courses.find((x) => x.id === s.courseId)!;
    const k = c.level != null ? `grade ${c.level}` : c.academicYear ?? '';
    if (k) perYear.set(k, (perYear.get(k) ?? 0) + s.credits);
  }
  for (const [year, total] of perYear) {
    const typical = district.typicalCreditsPerYear;
    if (total > typical * 1.3) {
      flags.push({
        id: `load-${year}`,
        severity: 'check',
        title: `Suggested credits for ${year} exceed a normal year`,
        detail: `${total} credits are suggested for ${year}; a full-time student in ${district.name} normally earns about ${typical}. Many systems teach more subjects for fewer hours each. Consider reducing credits per course for this year.`,
      });
    }
  }

  return { districtId: district.id, schoolYear: district.schoolYear, suggestions, progress, totalEarned, totalRequired: district.totalCredits, flags };
}
