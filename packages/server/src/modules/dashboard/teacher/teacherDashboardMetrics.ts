import type { TeacherSessionStatus } from '@sms/contracts/teacher-dashboard';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type SchoolClock = { date: string; weekday: Weekday; minutes: number };

/**
 * Today's date, weekday and minute of the day on the school's clock. The
 * business-date override (demo and test data) wins for the date; the time of
 * day always comes from the school's time zone.
 */
export function schoolClock(timeZone: string | null | undefined, now = new Date(), dateOverride: string | null = null): SchoolClock {
  const parts = zonedParts(now, timeZone);
  const date = dateOverride ?? `${parts.year}-${parts.month}-${parts.day}`;
  return {
    date,
    weekday: weekdayOf(date),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function zonedParts(now: Date, timeZone: string | null | undefined) {
  const read = (zone: string | undefined) => Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now).map((part) => [part.type, part.value]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute', string>;

  try {
    return read(timeZone || undefined);
  } catch {
    // An unknown zone in settings falls back to the server's own clock.
    return read(undefined);
  }
}

export function weekdayOf(date: string): Weekday {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Every date from `from` to `to`, both included. */
export function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

/** Minutes since midnight for `HH:MM` or `HH:MM:SS`. */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function toClockTime(time: string): string {
  return time.slice(0, 5);
}

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
