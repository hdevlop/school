/** School navigation preferences are grants in the existing role permission set. */
export const SIDEBAR_CONFIGURED_PERMISSION = 'sidebar:configured';

/** Additional placement policy; the student route still requires update:students. */
export function canEditStudentPlacement(role?: string | null): boolean {
  return role === 'admin' || role === 'principal' || role === 'registrar';
}

export const SIDEBAR_ENTRIES = [
  ['dashboard', '/dashboard', 'navigation.dashboard'],
  ['students', '/students', 'navigation.students'],
  ['insurance', '/insurance', 'navigation.insurance'],
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
  ['massar', '/massar/sheets', 'massar.title'],
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

/** Stable navigation identities; labels and role access stay in the app. */
export const SIDEBAR_ORDER_IDS = [
  'financial', 'attendance', 'student-conduct', 'evaluations', 'academic', 'massar', '/massar/rounds', '/massar/setup',
  'transport', 'access-control', 'appearance', 'communications', '/exam-planning',
  ...SIDEBAR_ENTRIES.map((entry) => entry[1]),
] as const;
export type SidebarOrderId = typeof SIDEBAR_ORDER_IDS[number];

export function sidebarKeyForItem(itemId: string): SidebarKey | undefined {
  if (itemId === '/massar/rounds' || itemId === '/massar/setup') return 'massar';
  const pageId = itemId === '/exam-planning' || itemId === '/assessment-planning' ? '/exams' : itemId;
  return SIDEBAR_ENTRIES.find((entry) => entry[1] === pageId)?.[0];
}

/** Sort siblings only: an order preference cannot move a page into another group. */
export function orderSidebarItems<T extends { id: string; children?: T[] }>(items: readonly T[], order: readonly string[]): T[] {
  const position = new Map(order.map((id, index) => [id, index]));
  const sort = (entries: readonly T[]): T[] => entries
    .map((item) => item.children ? { ...item, children: sort(item.children) } : item)
    .sort((a, b) => (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (position.get(b.id) ?? Number.MAX_SAFE_INTEGER));
  return sort(items);
}

type SidebarIdentity = { id: string; children?: SidebarIdentity[] };
export function sidebarItemIds(items: readonly SidebarIdentity[]): SidebarOrderId[] {
  return items.flatMap((item) => [item.id as SidebarOrderId, ...sidebarItemIds(item.children ?? [])]);
}

/** Older roles retain their existing navigation until explicitly configured. */
export function sidebarEntryVisible(can: (permission: string) => boolean, itemId: string): boolean {
  // Exam planning follows the Exams sidebar preference.
  const key = sidebarKeyForItem(itemId);
  return !key || !can(SIDEBAR_CONFIGURED_PERMISSION) || can(sidebarPermission(key));
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
  sidebarOrder?: SidebarOrderId[];
};
export type SaveRoleAccess = {
  permissionIds: string[];
  expectedPermissionIds: string[];
  /** Omit to preserve the current sidebar configuration, including legacy defaults. */
  sidebarKeys?: SidebarKey[];
  /** Omit to preserve the saved order. Empty restores the default order. */
  sidebarOrder?: SidebarOrderId[];
  expectedSidebarOrder?: SidebarOrderId[];
};
