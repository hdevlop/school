import { describe, expect, it } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { DashboardController } from '../../src/modules/dashboard/DashboardController';
import { FinanceDashboardController } from '../../src/modules/dashboard/finance/FinanceDashboardController';

// The roles a route's role guards admit, read from the guard metadata the
// framework runs: class-level guards apply to every route of the controller.
function allowedRoles(controller: any, method?: string): string[][] {
  return getGuardMetadata(controller, method)
    .filter((guard) => guard.guardClass?.name === 'RoleGuard')
    .map((guard) => [...[].concat(guard.params)].sort());
}

const FINANCE_ROLES = ['accounting', 'admin', 'principal'];
const STAFF_ROLES = [
  'accounting', 'admin', 'assistant', 'counselor', 'librarian',
  'nurse', 'principal', 'secretary', 'teacher',
];

describe('dashboard audience', () => {
  it('keeps every finance dashboard route to the roles that may read fees', () => {
    expect(allowedRoles(FinanceDashboardController)).toEqual([FINANCE_ROLES]);
  });

  it('keeps school-wide counts and attendance charts to staff', () => {
    for (const route of ['getStudentsByGender', 'getStudentAttendanceMonthly', 'getStaffAttendanceMonthly']) {
      expect(allowedRoles(DashboardController, route)).toEqual([STAFF_ROLES]);
    }
    for (const outsider of ['parent', 'student', 'driver']) {
      expect(STAFF_ROLES).not.toContain(outsider);
      expect(FINANCE_ROLES).not.toContain(outsider);
    }
  });

  it('still requires sign-in for the whole dashboard controller', () => {
    expect(getGuardMetadata(DashboardController).map((guard) => guard.guardClass?.name)).toEqual(['AuthGuard']);
  });
});
