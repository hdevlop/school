// Where each teacher dashboard card leads. Every destination is a route the
// teacher's sidebar already offers.
export const TEACHER_DASHBOARD_LINKS = {
  timetable: '/class-routines',
  attendance: '/attendance/students',
  grades: '/grades',
  assessments: '/assessments',
  classes: '/classes',
  notifications: '/notifications',
  discipline: '/discipline',
} as const;

type Lesson = { classId: string; sectionId: string; teacherAssignmentId: string };

/** Opens the student register on one lesson's class, section and assignment. */
export function lessonAttendanceHref({ classId, sectionId, teacherAssignmentId }: Lesson): string {
  const params = new URLSearchParams({ classId, sectionId, assignmentId: teacherAssignmentId });
  return `${TEACHER_DASHBOARD_LINKS.attendance}?${params.toString()}`;
}

export function splitMinutes(total: number): { hours: number; minutes: number } {
  const whole = Math.max(0, Math.round(total));
  return { hours: Math.floor(whole / 60), minutes: whole % 60 };
}
