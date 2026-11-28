import type { TeacherSessionStatus } from '@sms/contracts/teacher-dashboard';
import { toMinutes, weekdayOf } from '../../../shared/schoolClock';

export function sessionStatus(startTime: string, endTime: string, nowMinutes: number): {
  status: TeacherSessionStatus;
  minutesUntilStart: number | null;
} {
  const start = toMinutes(startTime);
  if (nowMinutes < start) return { status: 'upcoming', minutesUntilStart: start - nowMinutes };
  if (nowMinutes < toMinutes(endTime)) return { status: 'inProgress', minutesUntilStart: null };
  return { status: 'completed', minutesUntilStart: null };
}

/** Whole percent, or null when nothing was counted. */
export function ratePercent(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 100) : null;
}

type WeekEntry = { dayOfWeek: string; activeDays: string[] | null };

/** The lessons a weekly routine holds on one date. */
export function entriesOn<T extends WeekEntry>(entries: readonly T[], date: string): T[] {
  const weekday = weekdayOf(date);
  return entries.filter((entry) =>
    entry.dayOfWeek === weekday && (!entry.activeDays || entry.activeDays.includes(weekday)));
}

export type Register = { date: string; sectionId: string | null; teacherAssignmentId: string | null };

/**
 * Whether a lesson's register exists. A daily register belongs to the whole
 * section, so any teacher's marks count; a per-lesson one must come from this
 * lesson's assignment.
 */
export function hasRegister(
  registers: readonly Register[],
  lesson: { sectionId: string; teacherAssignmentId: string },
  date: string,
  mode: 'daily' | 'per_class',
): boolean {
  return registers.some((register) => register.date === date && (mode === 'daily'
    ? register.sectionId === lesson.sectionId
    : register.teacherAssignmentId === lesson.teacherAssignmentId));
}

type GradedAssessment = { date: string; gradedCount: number; studentCount: number };

/** A held assessment with students still waiting for a grade. */
export function awaitsGrading(assessment: GradedAssessment, today: string): boolean {
  return assessment.date <= today
    && assessment.studentCount > 0
    && assessment.gradedCount < assessment.studentCount;
}

/**
 * The assessments worth a teacher's attention first: those still being
 * graded (oldest first), then the next ones coming up, then the most recently
 * finished.
 */
export function rankAssessments<T extends GradedAssessment>(assessments: readonly T[], today: string, limit: number): T[] {
  const byDate = (a: T, b: T) => a.date.localeCompare(b.date);
  const grading = assessments.filter((item) => awaitsGrading(item, today)).sort(byDate);
  const upcoming = assessments.filter((item) => item.date > today).sort(byDate);
  const finished = assessments
    .filter((item) => item.date <= today && !awaitsGrading(item, today))
    .sort((a, b) => byDate(b, a));
  return [...grading, ...upcoming, ...finished].slice(0, limit);
}
