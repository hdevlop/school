export type ExamPlanningEntry = {
  id: string;
  date: string;
  subject: string;
  lessons: string[];
  /** From "08:30" to "09:30"; none until the school sets them. */
  startTime?: string;
  endTime?: string;
};

/** How long an exam lasts while Planning gives it no time. */
export const PLANNING_DEFAULT_DURATION = 60;

const minutesOf = (time: string) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };

/** "09:30": a time some minutes later, within the day. */
export function addPlanningMinutes(time: string, minutes: number) {
  const total = Math.min(minutesOf(time) + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Minutes from start to end, or the default while either is missing. */
export function planningDuration(startTime?: string | null, endTime?: string | null) {
  return startTime && endTime ? minutesOf(endTime) - minutesOf(startTime) : PLANNING_DEFAULT_DURATION;
}

export type ExamPlanningClass = {
  id: string;
  name: string;
  visible: boolean;
  months: Record<string, ExamPlanningEntry[]>;
};

/** The school year starts in September: September–January is semester one. */
export function examPlanningSemester(month: string): 1 | 2 {
  const number = Number(month.slice(5, 7));
  return number >= 9 || number === 1 ? 1 : 2;
}

export function examPlanningMonths(academicYear: string): string[] {
  const start = Number(academicYear.slice(0, 4));
  if (!Number.isInteger(start) || start < 1900) return [];
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(start, 8 + index, 1));
    return date.toISOString().slice(0, 7);
  });
}
