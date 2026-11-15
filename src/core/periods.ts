// One school period of one report. "First term" of grade 10 and "First term" of grade 11 are
// different periods, so a period is its label together with its grade level and school year.
import type { ExtractedCourse } from './types.ts';

export const periodKey = (c: Pick<ExtractedCourse, 'level' | 'academicYear' | 'period'>): string => `${c.level ?? ''}|${c.academicYear ?? ''}|${c.period.value}`;

/** The heading for a period: its printed label, plus the school year when the label does not show it. */
export function periodLabel(c: Pick<ExtractedCourse, 'academicYear' | 'period'>): string {
  const label = c.period.value;
  const y = c.academicYear;
  if (!y) return label;
  const shown = y.split(/[-–]/).some((part) => part && label.includes(part.length === 2 ? `-${part}` : part));
  if (shown) return label;
  return label ? `${label} · ${y}` : y;
}

export interface PeriodGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/** Courses grouped by period, earliest school year and grade first when the record shows them. */
export function groupByPeriod<T extends Pick<ExtractedCourse, 'level' | 'academicYear' | 'period' | 'term'>>(courses: T[]): PeriodGroup<T>[] {
  const groups: (PeriodGroup<T> & { first: number })[] = [];
  const index = new Map<string, number>();
  courses.forEach((c, i) => {
    const k = periodKey(c);
    const at = index.get(k);
    if (at != null) groups[at].items.push(c);
    else {
      index.set(k, groups.length);
      groups.push({ key: k, label: periodLabel(c), items: [c], first: i });
    }
  });
  // Put the periods in school order only when every period says where it falls; otherwise keep the document's order.
  const placed = groups.every((g) => g.items[0].level != null || g.items[0].academicYear);
  if (placed && groups.length > 1) {
    const yearOf = (g: PeriodGroup<T>) => Number(g.items[0].academicYear?.slice(0, 4)) || Infinity;
    const levelOf = (g: PeriodGroup<T>) => g.items[0].level ?? Infinity;
    const termOf = (g: PeriodGroup<T>) => Number(g.items[0].term) || 0;
    const byYear = groups.every((g) => g.items[0].academicYear);
    groups.sort((a, b) => (byYear ? yearOf(a) - yearOf(b) : 0) || levelOf(a) - levelOf(b) || yearOf(a) - yearOf(b) || termOf(a) - termOf(b) || a.first - b.first);
  }
  return groups.map(({ key, label, items }) => ({ key, label, items }));
}
