/** School navigation preferences are grants in the existing role permission set. */
export const SIDEBAR_CONFIGURED_PERMISSION = 'sidebar:configured';

export const SIDEBAR_ENTRIES = [
  ['dashboard', '/dashboard', 'navigation.dashboard'],
  ['students', '/students', 'navigation.students'],
  ['parents', '/parents', 'navigation.parents'],
  ['teachers', '/teachers', 'navigation.teachers'],
  ['staff', '/staff', 'navigation.staff'],
  ['fees', '/fees', 'navigation.fees'],
  ['expenses', '/expenses', 'navigation.expenses'],
  ['payroll', '/payroll', 'navigation.payroll'],
  ['feeTypes', '/fee-types', 'navigation.feeTypes'],
  ['reminders', '/reminders', 'navigation.reminders'],
  ['financial-operations', '/financial-operations', 'navigation.pendingChecks'],
  ['attendance', '/attendance/students', 'navigation.studentAttendance'],
  ['staff-attendance', '/attendance/staff', 'navigation.staffAttendance'],
  ['alerts', '/alerts', 'navigation.alerts'],
  ['announcements', '/announcements', 'navigation.announcements'],
  ['discipline', '/discipline', 'navigation.discipline'],
  ['behavior-rewards', '/behavior-rewards', 'navigation.behaviorRewardsShort'],
  ['assessments', '/assessments', 'navigation.assessments'],
  ['exams', '/exams', 'navigation.exams'],
  ['grades', '/grades', 'navigation.grades'],
  ['events', '/calendar', 'navigation.calendar'],
  ['class-routines', '/class-routines', 'navigation.classRoutines'],
  ['classes', '/classes', 'navigation.classes'],
  ['sections', '/sections', 'navigation.sections'],
  ['cycles', '/cycles', 'navigation.cycles'],
  ['subjects', '/subjects', 'navigation.subjects'],
  ['vehicles', '/vehicles', 'navigation.vehicles'],
  ['roles', '/roles', 'navigation.roles'],
  ['permissions', '/permissions', 'navigation.permissions'],
  ['users', '/users', 'navigation.users'],
  ['theme', 'settings:theme', 'navigation.theme'],
  ['branding', 'settings:branding', 'navigation.branding'],
  ['settings', 'settings:preferences', 'navigation.settings'],
  ['notifications', '/notifications', 'notifications.inbox'],
] as const;

export type SidebarKey = typeof SIDEBAR_ENTRIES[number][0];
export const sidebarPermission = (key: string) => `sidebar:${key}`;
export const isSidebarPermission = (name: string) => name.startsWith('sidebar:');

/** Older roles retain their existing navigation until explicitly configured. */
export function sidebarEntryVisible(can: (permission: string) => boolean, itemId: string): boolean {
  // Exam planning follows the Exams sidebar preference; insurance follows Students.
  const pageId = itemId === '/exam-planning' || itemId === '/assessment-planning' ? '/exams'
    : itemId === '/insurance' ? '/students' : itemId;
  const entry = SIDEBAR_ENTRIES.find((entry) => entry[1] === pageId);
  return !entry || !can(SIDEBAR_CONFIGURED_PERMISSION) || can(sidebarPermission(entry[0]));
}

export type AccessPermission = {
  id: string;
  name: string;
  resource: string | null;
  action: string | null;
  description: string | null;
};
export type AccessRole = { id: string; name: string; description?: string | null };
export type RoleAccessSnapshot = {
  role: AccessRole;
  permissions: AccessPermission[];
  catalog: AccessPermission[];
};
export type SaveRoleAccess = {
  permissionIds: string[];
  expectedPermissionIds: string[];
  /** Omit to preserve the current sidebar configuration, including legacy defaults. */
  sidebarKeys?: SidebarKey[];
};
