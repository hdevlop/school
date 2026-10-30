import { matchPermission } from 'najm-auth/client';

export type PageViewer = {
  role: string | null | undefined;
  can: (permission: string) => boolean;
};

type PageRule = (viewer: PageViewer) => boolean;

// Match the role groups in packages/server/src/auth.ts. These rules serve
// both server page guards and the sidebar; API and record guards still apply.
// A page is the permission its routes ask for. Roles decide only the
// dashboard's audience, what stays the developer's, and — for the pages whose
// routes use `CanSchoolWide` — that the permission reads the whole school.
const ADMIN = ['admin'];
const STAFF = ['admin', 'principal', 'accounting', 'teacher', 'secretary', 'assistant', 'supervisor'];
const SCHOOL_WIDE = ['admin', 'principal', 'accounting', 'secretary', 'driver', 'assistant', 'supervisor'];

/** A role whose reads are school-wide, as `SCHOOL_WIDE_ROLES` on the server. */
export const isSchoolWideRole = (role: string | null | undefined) => !!role && SCHOOL_WIDE.includes(role.toLowerCase());

const inRoles = (roles: readonly string[]): PageRule => ({ role }) => !!role && roles.includes(role.toLowerCase());
const can = (permission: string): PageRule => (viewer) => viewer.can(permission);
const schoolWide = (permission: string): PageRule => (viewer) => isSchoolWideRole(viewer.role) && viewer.can(permission);

export const PAGE_ACCESS = {
  dashboard: inRoles(STAFF),
  students: can('read:students'),
  insurance: schoolWide('read:students'),
  parents: can('read:parents'),
  teachers: can('read:teachers'),
  staff: schoolWide('read:staff'),
  fees: schoolWide('read:fees'),
  expenses: schoolWide('read:expenses'),
  payroll: schoolWide('read:payroll'),
  feeTypes: schoolWide('read:feeTypes'),
  reminders: schoolWide('read:fees'),
  financialOperations: schoolWide('read:financial-operations'),
  studentAttendance: can('read:attendance'),
  staffAttendance: schoolWide('read:staff-attendance'),
  alerts: can('read:alerts'),
  announcements: can('read:announcements'),
  discipline: can('read:discipline'),
  behaviorRewards: can('read:behavior-rewards'),
  assessments: can('read:assessments'),
  exams: can('read:exams'),
  grades: can('read:grades'),
  calendar: can('read:events'),
  classRoutines: can('read:classes'),
  classes: can('read:classes'),
  sections: can('read:sections'),
  cycles: can('read:cycles'),
  subjects: can('read:subjects'),
  vehicles: schoolWide('read:vehicles'),
  accessControl: inRoles(ADMIN),
  appearance: inRoles(ADMIN),
  settings: can('read:settings'),
  visitRequests: can('read:visit-requests'),
  publicPage: can('read:settings'),
} satisfies Record<string, PageRule>;

export type PageAccess = keyof typeof PAGE_ACCESS;

// The same permission matcher and session precedence as usePermissions().
export function pageViewer(session: {
  user: { role?: string | null; permissions?: string[] };
  permissions?: string[];
}): PageViewer {
  const permissions = session.permissions ?? session.user.permissions ?? [];
  return { role: session.user.role, can: (permission) => matchPermission(permissions, permission) };
}

/** A usable home for every signed-in account, including non-staff roles. */
export function dashboardLandingPath(viewer: PageViewer): string {
  if (viewer.role === 'parent' || viewer.role === 'student') {
    return PAGE_ACCESS.students(viewer) ? '/students' : '/notifications';
  }
  return PAGE_ACCESS.dashboard(viewer) ? '/dashboard' : '/notifications';
}
