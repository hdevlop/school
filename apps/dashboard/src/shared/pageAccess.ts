import { matchPermission } from 'najm-auth/client';

export type PageViewer = {
  role: string | null | undefined;
  can: (permission: string) => boolean;
};

type PageRule = (viewer: PageViewer) => boolean;

// Match the role groups in packages/server/src/auth.ts. These rules serve
// both server page guards and the sidebar; API and record guards still apply.
const ADMIN = ['admin'];
const ADMINISTRATORS = ['admin', 'principal'];
const FINANCIAL = ['admin', 'principal', 'accounting'];
const STAFF = ['admin', 'principal', 'accounting', 'teacher', 'counselor', 'nurse', 'secretary', 'librarian', 'assistant'];

const inRoles = (roles: readonly string[]): PageRule => ({ role }) => !!role && roles.includes(role.toLowerCase());
const can = (permission: string): PageRule => (viewer) => viewer.can(permission);

export const PAGE_ACCESS = {
  dashboard: inRoles(STAFF),
  students: can('read:students'),
  parents: can('read:parents'),
  teachers: can('read:teachers'),
  staff: inRoles(ADMIN),
  fees: inRoles(FINANCIAL),
  expenses: inRoles(FINANCIAL),
  payroll: inRoles(ADMIN),
  feeTypes: inRoles(FINANCIAL),
  reminders: inRoles(FINANCIAL),
  financialOperations: inRoles(ADMIN),
  studentAttendance: can('read:attendance'),
  staffAttendance: inRoles(ADMIN),
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
  cycles: inRoles(ADMIN),
  subjects: can('read:subjects'),
  vehicles: inRoles(ADMIN),
  accessControl: inRoles(ADMIN),
  appearance: inRoles(ADMIN),
  settings: inRoles(ADMINISTRATORS),
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
  return PAGE_ACCESS.dashboard(viewer) ? '/' : '/notifications';
}
