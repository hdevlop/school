import { describe, expect, it } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { DashboardController } from '../../src/modules/dashboard/DashboardController';
import { FinanceDashboardController } from '../../src/modules/dashboard/finance/FinanceDashboardController';
import { AcademicDashboardController } from '../../src/modules/dashboard/academic/AcademicDashboardController';
import { TeacherDashboardController } from '../../src/modules/dashboard/teacher/TeacherDashboardController';
import { FloorManagerDashboardController } from '../../src/modules/dashboard/floorManager/FloorManagerDashboardController';
import { SupervisorDashboardController } from '../../src/modules/dashboard/supervisor/SupervisorDashboardController';

// The roles a route's role guards admit, read from the guard metadata the
// framework runs: class-level guards apply to every route of the controller.
function allowedRoles(controller: any, method?: string): string[][] {
  return getGuardMetadata(controller, method)
    .filter((guard) => guard.guardClass?.name === 'RoleGuard')
    .map((guard) => [...[].concat(guard.params)].sort());
}

function permissions(controller: any, method: string): string[] {
  return getGuardMetadata(controller, method)
    .filter((guard) => guard.guardClass?.name === 'PermissionGuard')
    .map((guard) => guard.params);
}

const FINANCE_ROLES = ['accounting', 'admin', 'principal'];
/** Pinned here, not read from the code under test. */
const SCHOOL_WIDE_ROLES = ['accounting', 'admin', 'assistant', 'driver', 'principal', 'secretary'];

describe('dashboard audience', () => {
  it('keeps every finance dashboard route to the roles that may read fees', () => {
    expect(allowedRoles(FinanceDashboardController)).toEqual([FINANCE_ROLES]);
  });

  // The finance cards read their counts from the widgets route, so it admits
  // the same roles; before, only admin got figures and the others saw zeros.
  it('gives the finance summary cards to the finance dashboard roles', () => {
    expect(allowedRoles(DashboardController, 'getWidgets')).toEqual([FINANCE_ROLES]);
  });

  // The roles screen decides who sees each school-wide chart: the route asks
  // for the permission of the records it counts, past ownership.
  it('asks each school-wide chart for the permission of what it counts', () => {
    const charts = {
      getStudentsByGender: ['read:students'],
      getStudentAttendanceMonthly: ['read:attendance'],
      getStaffAttendanceMonthly: ['read:staff-attendance'],
    };
    for (const [route, expected] of Object.entries(charts)) {
      expect(allowedRoles(DashboardController, route), route).toEqual([SCHOOL_WIDE_ROLES]);
      expect(permissions(DashboardController, route), route).toEqual(expected);
    }
    expect(allowedRoles(AcademicDashboardController, 'getKpis')).toEqual([SCHOOL_WIDE_ROLES]);
    expect(permissions(AcademicDashboardController, 'getKpis')).toEqual(['read:students', 'read:teachers', 'read:attendance', 'read:grades']);
    for (const outsider of ['teacher', 'supervisor', 'floor_manager', 'parent', 'student']) {
      expect(SCHOOL_WIDE_ROLES).not.toContain(outsider);
    }
  });

  // Each role's own home page: the role picks it, read:dashboard opens it.
  it('opens each role dashboard with read:dashboard', () => {
    const own: [unknown, string, string[]][] = [
      [TeacherDashboardController, 'getOverview', ['teacher']],
      [TeacherDashboardController, 'getAttendanceTrend', ['teacher']],
      [FloorManagerDashboardController, 'getOverview', ['floor_manager']],
      [SupervisorDashboardController, 'getOverview', ['supervisor']],
    ];
    for (const [controller, route, roles] of own) {
      // The role guard is the controller's; the permission each route's.
      expect(allowedRoles(controller), route).toEqual([roles]);
      expect(permissions(controller, route), route).toEqual(['read:dashboard']);
    }
  });

  it('still requires sign-in for the whole dashboard and academic dashboard controllers', () => {
    expect(getGuardMetadata(DashboardController).map((guard) => guard.guardClass?.name)).toEqual(['AuthGuard']);
    expect(getGuardMetadata(AcademicDashboardController).map((guard) => guard.guardClass?.name)).toEqual(['AuthGuard']);
  });
});
