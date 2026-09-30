import type { NavItem } from 'najm-kit';

// Who sees each sidebar page: the guard on the page's main list route, stated
// here the same way. A role sees a page because its permissions (the roles
// screen) or its role group admit it, not because of a list of role names in
// the menu. The server stays the authority: a hidden page is still refused by
// its route, and a shown one can still refuse a record. When a route's guard
// changes, change its entry here.

export type NavViewer = {
  role: string | null | undefined;
  /** najm-auth's permission check, wildcards included (`usePermissions().can`). */
  can: (permission: string) => boolean;
};

type NavRule = (viewer: NavViewer) => boolean;

// The role groups of `packages/server/src/auth.ts`, and najm-auth's `isAdmin`.
const ADMIN = ['admin'];
const FINANCIAL = ['admin', 'principal', 'accounting'];
const STAFF = ['admin', 'principal', 'accounting', 'teacher', 'counselor', 'nurse', 'secretary', 'librarian', 'assistant'];

const inRoles = (roles: readonly string[]): NavRule => ({ role }) => !!role && roles.includes(role.toLowerCase());
const can = (permission: string): NavRule => (viewer) => viewer.can(permission);

export const NAV_ACCESS = {
  dashboard: inRoles(STAFF), // /dashboard/academic/kpis: isStaff
  students: can('read:students'), // StudentController list: CanList
  parents: can('read:parents'),
  teachers: can('read:teachers'),
  staff: inRoles(ADMIN), // StaffController list: isAdmin
  fees: inRoles(FINANCIAL), // FeeController list: isFinancial
  expenses: inRoles(FINANCIAL),
  payroll: inRoles(ADMIN),
  feeTypes: inRoles(FINANCIAL),
  reminders: inRoles(FINANCIAL), // /dashboard/finance/overdue: isFinancial
  financialOperations: inRoles(ADMIN), // audit log, notifications, rollover: isAdmin
  studentAttendance: can('read:attendance'),
  staffAttendance: inRoles(ADMIN), // the staff roster is written with isAdmin
  alerts: can('read:alerts'),
  announcements: can('read:announcements'),
  discipline: can('read:discipline'),
  behaviorRewards: can('read:behavior-rewards'),
  assessments: can('read:assessments'),
  exams: can('read:exams'),
  grades: can('read:grades'),
  calendar: can('read:events'), // EventController list: canAccessAllEvents
  classRoutines: can('read:classes'),
  classes: can('read:classes'),
  sections: can('read:sections'),
  cycles: inRoles(ADMIN),
  subjects: can('read:subjects'),
  vehicles: inRoles(ADMIN), // canAccessAllVehicles = isAdmin
  accessControl: inRoles(ADMIN), // najm-auth's role, permission and user routes
  appearance: inRoles(ADMIN),
} satisfies Record<string, NavRule>;

export type NavAccess = keyof typeof NAV_ACCESS;

/** A sidebar entry with the page rule that decides whether it is shown. */
export type GatedNavItem = Omit<NavItem, 'children'> & {
  access?: NavAccess;
  children?: GatedNavItem[];
};

/**
 * The entries this viewer may open. An entry without `access` is always shown;
 * a group is shown when at least one of its entries is.
 */
export function visibleNavItems(items: readonly GatedNavItem[], viewer: NavViewer): NavItem[] {
  return items.flatMap(({ access, children, ...item }) => {
    if (access && !NAV_ACCESS[access](viewer)) return [];
    if (!children) return [item as NavItem];
    const visible = visibleNavItems(children, viewer);
    return visible.length ? [{ ...item, children: visible } as NavItem] : [];
  });
}
