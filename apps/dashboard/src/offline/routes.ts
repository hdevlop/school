import { createShellPaths } from 'najm-offline/client';

// One public document allowlist shared by the worker and local dispatcher.
export const SHELL_PATHS = [
  '/home', '/dashboard', '/students', '/students/*', '/parents', '/parents/*', '/teachers', '/teachers/*',
  '/staff', '/fees', '/expenses', '/payroll', '/fee-types', '/reminders', '/financial-operations',
  '/attendance/students', '/attendance/staff', '/alerts', '/announcements', '/discipline', '/behavior-rewards',
  '/assessments', '/exams', '/grades', '/calendar', '/class-routines', '/classes', '/sections', '/cycles',
  '/subjects', '/vehicles', '/roles', '/permissions', '/users', '/notifications',
  '/reports', '/aging', '/settings', '/preferences', '/transport', '/drivers', '/visit-requests', '/attendance/teachers',
] as const;
export const isShellPath = createShellPaths(SHELL_PATHS);
