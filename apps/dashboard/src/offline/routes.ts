// One public document allowlist shared by the worker and local dispatcher.
export const SHELL_PATHS = [
  '/home', '/dashboard', '/students', '/students/*', '/parents', '/parents/*', '/teachers', '/teachers/*',
  '/staff', '/fees', '/expenses', '/payroll', '/fee-types', '/reminders', '/financial-operations',
  '/attendance/students', '/attendance/staff', '/alerts', '/announcements', '/discipline', '/behavior-rewards',
  '/assessments', '/exams', '/grades', '/calendar', '/class-routines', '/classes', '/sections', '/cycles',
  '/subjects', '/vehicles', '/roles', '/permissions', '/users', '/notifications',
  '/reports', '/aging', '/settings', '/preferences', '/transport', '/drivers', '/visit-requests', '/attendance/teachers',
] as const;
export function isShellPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || /[?#\\]/.test(path)) return false;
  return SHELL_PATHS.some(pattern => pattern.endsWith('/*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern);
}
