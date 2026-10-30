export type ExamPlanningEntry = {
  id: string;
  date: string;
  subject: string;
  lessons: string[];
};

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
