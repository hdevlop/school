import { DEFAULT_TEACHING_DAYS } from '@sms/contracts/routines';
import { monthsBetween } from '@sms/contracts/academic-years';
import { addDays, ratePercent, toMinutes } from './teacher/teacherDashboardMetrics';

const KPI_ATTENDANCE_DAYS = 7;

type RegisterSettings = { teachingDays?: readonly string[] | null; schoolStartTime?: string | null } | null | undefined;
type Section = { sectionId: string; studentCount: number };
type Marked = { sectionId: string; status: 'absent' | 'late' };
type AttendanceDay = { date: string; total: number; attended: number; absent: number; late: number };

/** Whether the weekday is one of the school's teaching days. */
export function isSchoolDay(settings: RegisterSettings, weekday: string): boolean {
  const teachingDays: readonly string[] = settings?.teachingDays ?? DEFAULT_TEACHING_DAYS;
  return teachingDays.includes(weekday);
}

/**
 * Today's registers and the year's student marks over a set of sections, as
 * the monitor's and the supervisor's dashboards both count them.
 */
export function summarizeRegisters<S extends Section, M extends Marked>(input: {
  sections: S[];
  marked: M[];
  registeredSectionIds: string[];
  attendanceDays: AttendanceDay[];
  settings: RegisterSettings;
  clock: { date: string; weekday: string; minutes: number };
  year: { reportingStartsOn: string; reportingEndsOn: string };
}) {
  const { sections, marked, registeredSectionIds, attendanceDays, settings, clock, year } = input;
  const today = clock.date;
  const schoolDay = isSchoolDay(settings, clock.weekday);
  // A register is owed once the school day has started, and only by a
  // section with students in it.
  const started = !settings?.schoolStartTime || clock.minutes >= toMinutes(settings.schoolStartTime);
  const registeredIds = new Set(registeredSectionIds);

  const absentBySection = new Map<string, number>();
  const lateBySection = new Map<string, number>();
  for (const row of marked) {
    const tally = row.status === 'absent' ? absentBySection : lateBySection;
    tally.set(row.sectionId, (tally.get(row.sectionId) ?? 0) + 1);
  }

  const sectionRows = sections.map((section) => ({
    ...section,
    registerTaken: registeredIds.has(section.sectionId),
    absent: absentBySection.get(section.sectionId) ?? 0,
    late: lateBySection.get(section.sectionId) ?? 0,
  }));
  const missingRegisters = schoolDay && started
    ? sectionRows.filter((section) => section.studentCount > 0 && !section.registerTaken).length
    : 0;
  const absentToday = marked.filter((row) => row.status === 'absent').length;
  const lateToday = marked.length - absentToday;

  const weekStart = addDays(today, 1 - KPI_ATTENDANCE_DAYS);
  const recentDays = attendanceDays.filter((day) => day.date >= weekStart);
  const attended = recentDays.reduce((sum, day) => sum + day.attended, 0);
  const total = recentDays.reduce((sum, day) => sum + day.total, 0);
  const monthly = monthsBetween(year.reportingStartsOn, year.reportingEndsOn).map((month) => ({ month, absent: 0, late: 0 }));
  const byMonth = new Map(monthly.map((row) => [row.month, row]));
  for (const day of attendanceDays) {
    const row = byMonth.get(day.date.slice(0, 7));
    if (row) {
      row.absent += day.absent;
      row.late += day.late;
    }
  }

  return {
    schoolDay,
    sectionRows,
    missingRegisters,
    absentToday,
    lateToday,
    attendanceRate: ratePercent(attended, total),
    monthly,
  };
}
