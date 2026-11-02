// Where each floor manager dashboard card leads. Every destination is a route
// the floor manager's sidebar already offers.
export const FLOOR_MANAGER_DASHBOARD_LINKS = {
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
  return `${FLOOR_MANAGER_DASHBOARD_LINKS.attendance}?${params.toString()}`;
}
