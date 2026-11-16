// Why a course row is uncertain, in words a counselor can act on, placed by the field it is about. A row with no
// doubts shows nothing: a percentage on every row is noise, and "83%" on a row that is right says nothing useful.
import type { ExtractedCourse, Suggestion } from '../core/types.ts';

export interface Doubt {
  /** Short, shown next to the field. */
  text: string;
  /** 'low' = likely wrong until checked; 'mid' = worth a look. */
  level: 'low' | 'mid';
  field: 'name' | 'grade' | 'subject' | 'row';
}

export function rowDoubts(c: ExtractedCourse, s: Suggestion | undefined, conceptByHand = false): Doubt[] {
  const out: Doubt[] = [];
  if (!c.grade.edited) {
    if (!c.grade.value) out.push({ text: 'Grade not readable', level: 'low', field: 'grade' });
    else if (c.gradeWords && !c.gradeWords.agrees) out.push({ text: 'Grade and its words disagree', level: 'low', field: 'grade' });
    else if (c.grade.confidence < 0.72) out.push({ text: 'Grade may be misread', level: 'mid', field: 'grade' });
  }
  if (!c.name.edited) {
    if (c.name.confidence < 0.72) out.push({ text: 'Name may be misread', level: 'mid', field: 'name' });
    if (c.translation === 'none') out.push({ text: 'No English name', level: 'mid', field: 'name' });
    if (c.translation === 'model') out.push({ text: 'English name from the model', level: 'mid', field: 'name' });
  }
  if (s && !conceptByHand && s.conceptId === 'elective.other') out.push({ text: 'Subject not recognised', level: 'mid', field: 'subject' });
  if (s && !s.grade.letter && c.grade.value) out.push({ text: 'No US grade for this mark', level: 'mid', field: 'grade' });
  // Only when nothing more specific explains it.
  if (s && s.confidence < 0.6 && out.length === 0) out.push({ text: 'Low confidence overall', level: 'low', field: 'row' });
  return out;
}
