import { examPlanningMonths, examPlanningSemester, type ExamPlanningClass, type ExamPlanningEntry } from '@sms/contracts';
import type { PlanningAssessment } from '@/features/Assessments/planning/planningModel';

export type PlanningDateRange = { from: string; to: string };
export type ExamPlanningDrafts = Record<string, Record<string, ExamPlanningEntry[]>>;
export type PlanningEntrySelection = { classId: string; month: string; entryId: string };

export function planningMonthRange(month: string): PlanningDateRange {
  const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0));
  return { from: `${month}-01`, to: lastDay.toISOString().slice(0, 10) };
}

export function initialPlanningMonth(classes: ExamPlanningClass[], today: string, year: string): string {
  const months = examPlanningMonths(year);
  const current = months.includes(today.slice(0, 7)) ? today.slice(0, 7) : months[0] ?? today.slice(0, 7);
  const populated = months.filter(month => classes.some(cls => cls.months[month]?.length));
  return populated.includes(current) || !populated.length ? current : populated.reduce((best, month) =>
    Math.abs(Date.parse(`${month}-01`) - Date.parse(`${current}-01`)) < Math.abs(Date.parse(`${best}-01`) - Date.parse(`${current}-01`)) ? month : best);
}

export function examPlanningEntries(cls: ExamPlanningClass, range: PlanningDateRange, drafts: ExamPlanningDrafts = {}): ExamPlanningEntry[] {
  return Object.values({ ...cls.months, ...drafts[cls.id] }).flat()
    .filter(entry => entry.date >= range.from && entry.date <= range.to)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Editing one month preserves all other months, including hidden entries. */
export function updatePlanningMonthDraft(drafts: ExamPlanningDrafts, cls: ExamPlanningClass, month: string, entries: ExamPlanningEntry[]): ExamPlanningDrafts {
  const months = { ...drafts[cls.id], [month]: entries };
  if (JSON.stringify(entries) === JSON.stringify(cls.months[month] ?? [])) delete months[month];
  const next = { ...drafts, [cls.id]: months };
  if (!Object.keys(months).length) delete next[cls.id];
  return next;
}

/** The list, preview and print document use the same inclusive date range. */
export function examPlanningRecords(classes: ExamPlanningClass[], range: PlanningDateRange, drafts: ExamPlanningDrafts = {}): PlanningAssessment[] {
  return classes.flatMap(cls => examPlanningEntries(cls, range, drafts).map(entry => ({
    id: `${cls.id}:${entry.date.slice(0, 7)}:${entry.id}`, title: entry.subject, date: entry.date, status: 'scheduled', class: { id: cls.id, name: cls.name },
    subject: { id: entry.subject, name: entry.subject },
    planning: { round: '', semester: examPlanningSemester(entry.date), groups: [{ label: '', language: entry.language, lessons: entry.lessons }] },
  })));
}
