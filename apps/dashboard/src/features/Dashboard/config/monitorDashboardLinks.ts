// Where each monitor dashboard card leads. Every destination is a route
// the monitor's sidebar already offers.
export const MONITOR_DASHBOARD_LINKS = {
  attendance: '/attendance/students',
  discipline: '/discipline',
  behaviorRewards: '/behavior-rewards',
  timetable: '/class-routines',
  students: '/students',
  notifications: '/notifications',
} as const;

/** Opens the student register on one section. */
export function sectionAttendanceHref({ classId, sectionId }: { classId: string; sectionId: string }): string {
  const params = new URLSearchParams({ classId, sectionId });
  return `${MONITOR_DASHBOARD_LINKS.attendance}?${params.toString()}`;
}
