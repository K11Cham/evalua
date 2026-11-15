// CSV export of one evaluation (one row per course).
import type { Evaluation, Extraction } from '../core/types.ts';

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function evaluationCsv(ex: Extraction, ev: Evaluation, meta: { caseNo: string; district: string; status: string }): string {
  const head = [
    'Case', 'Student', 'Date of birth', 'Student ID', 'School', 'Country', 'System', 'District', 'Status',
    'Period', 'US grade level', 'Course (original)', 'Course (English)', 'Grade (original)', 'Credits (original)', 'Hours (original)',
    'US subject', 'Counts toward', 'Closest catalog course', 'Suggested credits', 'US letter', 'US 4.0', 'US percent', 'Conversion table',
    'Confidence', 'Needs review', 'Reasoning',
  ];
  const rows = ex.courses.map((c) => {
    const s = ev.suggestions.find((x) => x.courseId === c.id);
    return [
      meta.caseNo, ex.student.name.value, ex.student.dob.value, ex.student.id.value, ex.school.name.value, ex.country.value, ex.docType, meta.district, meta.status,
      c.period.value, c.level ?? '', c.name.original ?? '', c.name.value, c.grade.value, c.credits?.value ?? '', c.hours?.value ?? '',
      s?.conceptLabel ?? '(excluded)', s?.requirementLabel ?? '', s?.catalogTitle ?? '', s?.credits ?? '', s?.grade.letter ?? '', s?.grade.gpa ?? '', s?.grade.percent ?? '', s?.grade.table ?? '',
      s ? Math.round(s.confidence * 100) + '%' : '', s ? (s.needsReview ? 'yes' : 'no') : '', s?.reasons.map((r) => r.text).join(' | ') ?? '',
    ];
  });
  // A byte-order mark makes Excel open non-Latin text correctly.
  return '﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function download(name: string, content: string | Blob, type = 'text/plain') {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
