import type { BadgeColor } from 'najm-kit';

export type GradeRemark = 'excellent' | 'veryGood' | 'good' | 'fairlyGood' | 'average' | 'insufficient';

/**
 * The usual Moroccan remark (ملاحظة) for a mark, read on /20 whatever the
 * exam's scale: 7.5/10 is 15/20, "good". Lower bounds, best first.
 */
const REMARKS: Array<[number, GradeRemark]> = [[18, 'excellent'], [16, 'veryGood'], [14, 'good'], [12, 'fairlyGood'], [10, 'average'], [0, 'insufficient']];

/** One clearly different hue per remark: green, blue, violet, yellow, orange, red, from excellent to insufficient. */
export const GRADE_REMARK_STYLES: Record<GradeRemark, string> = {
  excellent: 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200',
  veryGood: 'border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700 dark:bg-sky-900/60 dark:text-sky-200',
  good: 'border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-700 dark:bg-violet-900/60 dark:text-violet-200',
  fairlyGood: 'border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/60 dark:text-yellow-200',
  average: 'border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-700 dark:bg-orange-900/60 dark:text-orange-200',
  insufficient: 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-900/60 dark:text-rose-200',
};
/** The same hues on a mark field: its border and a light wash say how the typed mark reads. */
export const GRADE_REMARK_FIELD_STYLES: Record<GradeRemark, string> = {
  excellent: 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40',
  veryGood: 'border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-950/40',
  good: 'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/40',
  fairlyGood: 'border-yellow-400 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-950/40',
  average: 'border-orange-400 bg-orange-50 dark:border-orange-600 dark:bg-orange-950/40',
  insufficient: 'border-rose-400 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/40',
};
/** The badge colour underneath, for anything that reads the colour name rather than the style. */
export const GRADE_REMARK_COLORS: Record<GradeRemark, BadgeColor> = {
  excellent: 'success', veryGood: 'success', good: 'info', fairlyGood: 'info', average: 'warning', insufficient: 'destructive',
};

/** No remark without a mark: an absent or ungraded student, or an exam without a scale. */
export function gradeRemark(grade: { marksObtained?: number | string | null; totalMarks?: number | string | null; status?: string | null }): GradeRemark | null {
  if (grade.status === 'missed' || grade.status === 'pending' || grade.marksObtained == null || grade.marksObtained === '') return null;
  const marks = Number(grade.marksObtained), total = Number(grade.totalMarks);
  if (!Number.isFinite(marks) || !(total > 0)) return null;
  const outOf20 = Math.round(marks / total * 20 * 100) / 100;
  return REMARKS.find(([floor]) => outOf20 >= floor)![1];
}
