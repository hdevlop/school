import { describe, expect, it, mock } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { SecretaryDashboardService } from '../../src/modules/dashboard/secretary/SecretaryDashboardService';
import { SecretaryDashboardController } from '../../src/modules/dashboard/secretary/SecretaryDashboardController';
import { yearScopedModules } from '../../src/config/yearScope';

const secretary = { id: 'staff-1', name: 'Salma', image: null, gender: 'F', email: null, phone: null, address: null };

function build() {
  const students = { getCount: mock(async (_activeOnly: boolean) => ({ count: 120 })) };
  const parents = { getCount: mock(async () => ({ count: 85 })) };
  const teachers = { getCount: mock(async () => ({ count: 12 })) };
  const visits = { getDashboardSummary: mock(async () => ({ newRequests: 3, contactedRequests: 2, queue: [] })) };
  const notifications = { unreadCount: mock(async (_userId: string) => 4) };
  const accounts = { getSupervisor: mock(async (_userId: string) => secretary) };
  const incidents = { getMonthlyCounts: mock(async (): Promise<{ month: string; severity: string; count: number }[]> => []) };
  const service = new SecretaryDashboardService(students as any, parents as any, teachers as any, visits as any, notifications as any, accounts as any, incidents as any);
  Object.defineProperty(service, 'year', { value: { reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' } });
  return { service, students, parents, teachers, visits, notifications, accounts, incidents };
}

describe('secretary dashboard', () => {
  it('counts active enrollments through the scoped student service and keeps notifications personal', async () => {
    const { service, students, notifications, accounts } = build();
    expect(await service.getOverview({ id: 'secretary-1', permissions: ['read:students', 'read:parents', 'read:visit-requests'] }))
      .toEqual({ secretary, students: 120, teachers: 12, parents: 85, incidentsMonthly: expect.any(Array), visitRequests: { newRequests: 3, contactedRequests: 2, queue: [] }, unreadNotifications: 4 });
    expect(accounts.getSupervisor).toHaveBeenCalledWith('secretary-1');
    expect(students.getCount).toHaveBeenCalledWith(true);
    expect(notifications.unreadCount).toHaveBeenCalledWith('secretary-1');
  });

  it('provides teacher and parent totals with dashboard access while retaining other resource permissions', async () => {
    const { service, students, parents, teachers, visits, incidents } = build();
    expect(await service.getOverview({ id: 'secretary-1', permissions: ['read:dashboard'] }))
      .toEqual({ secretary, students: null, teachers: 12, parents: 85, incidentsMonthly: expect.any(Array), visitRequests: null, unreadNotifications: 4 });
    expect(students.getCount).not.toHaveBeenCalled();
    expect(teachers.getCount).toHaveBeenCalledTimes(1);
    expect(parents.getCount).toHaveBeenCalledTimes(1);
    expect(incidents.getMonthlyCounts).toHaveBeenCalledTimes(1);
    expect(visits.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('honors wildcard grants and propagates failed reads instead of reporting zero', async () => {
    const { service, students } = build();
    expect((await service.getOverview({ id: 'secretary-1', permissions: ['read:*'] })).students).toBe(120);
    students.getCount.mockImplementation(async () => { throw new Error('Year scope unavailable'); });
    await expect(service.getOverview({ id: 'secretary-1', permissions: ['read:students'] })).rejects.toThrow('Year scope unavailable');
  });

  it('fills the viewed year with monthly incident counts by severity, without incident records', async () => {
    const { service, incidents } = build();
    incidents.getMonthlyCounts.mockResolvedValue([
      { month: '2026-11', severity: 'medium', count: 1 },
      { month: '2026-11', severity: 'high', count: 2 },
      { month: '2026-10', severity: 'low', count: 3 },
      { month: '2025-11', severity: 'critical', count: 10 },
    ]);
    const { incidentsMonthly } = await service.getOverview({ id: 'secretary-1', permissions: ['read:dashboard'] });
    expect(incidentsMonthly).toHaveLength(12);
    expect(incidentsMonthly[0]).toEqual({ month: '2026-09', low: 0, medium: 0, high: 0, critical: 0 });
    expect(incidentsMonthly.find((row) => row.month === '2026-11'))
      .toEqual({ month: '2026-11', low: 0, medium: 1, high: 2, critical: 0 });
    expect(incidentsMonthly.find((row) => row.month === '2026-10')?.low).toBe(3);
    expect(incidentsMonthly.some((row) => row.month === '2025-11')).toBe(false);
  });

  it('propagates a failed incident read instead of showing an empty chart', async () => {
    const { service, incidents } = build();
    incidents.getMonthlyCounts.mockImplementation(async () => { throw new Error('Incident counts unavailable'); });
    await expect(service.getOverview({ id: 'secretary-1', permissions: ['read:dashboard'] }))
      .rejects.toThrow('Incident counts unavailable');
  });

  it('propagates failed teacher and parent count reads instead of reporting zero', async () => {
    const teacherFailure = build();
    teacherFailure.teachers.getCount.mockImplementation(async () => { throw new Error('Teacher count unavailable'); });
    await expect(teacherFailure.service.getOverview({ id: 'secretary-1', permissions: ['read:dashboard'] }))
      .rejects.toThrow('Teacher count unavailable');

    const parentFailure = build();
    parentFailure.parents.getCount.mockImplementation(async () => { throw new Error('Parent count unavailable'); });
    await expect(parentFailure.service.getOverview({ id: 'secretary-1', permissions: ['read:dashboard'] }))
      .rejects.toThrow('Parent count unavailable');
  });

  it('requires the secretary role and dashboard permission, and registers the selected-year consumer', () => {
    const guards = [...getGuardMetadata(SecretaryDashboardController), ...getGuardMetadata(SecretaryDashboardController, 'getOverview')];
    expect(guards.filter((guard) => guard.guardClass?.name === 'RoleGuard').map((guard) => guard.params)).toEqual(['secretary']);
    expect(guards.filter((guard) => guard.guardClass?.name === 'PermissionGuard').map((guard) => guard.params)).toEqual(['read:dashboard']);
    expect(yearScopedModules['secretary-dashboard']).toBe(SecretaryDashboardController);
  });

  it.each([
    ['staff', 'getStaffAttendanceMonthly'],
    ['student', 'getStudentAttendanceMonthly'],
  ] as const)('offers %s attendance counts through the secretary dashboard without granting record access', async (type, method) => {
    const monthly = {
      today: 95, todayAbsent: 0, todayLate: 1, thisWeek: 90, lastWeek: 88, weeklyChangePct: 2,
      monthly: [{ month: '2026-11', present: 17, absent: 2, late: 1, total: 20 }],
    };
    const dashboard = { getAttendanceMonthly: mock(async (_type: string) => monthly) };
    const controller = new SecretaryDashboardController(build().service, dashboard as any);
    expect(await controller[method]()).toEqual(monthly);
    expect(dashboard.getAttendanceMonthly).toHaveBeenCalledWith(type);
    const guards = [...getGuardMetadata(SecretaryDashboardController), ...getGuardMetadata(SecretaryDashboardController, method)];
    expect(guards.filter((guard) => guard.guardClass?.name === 'RoleGuard').map((guard) => guard.params)).toEqual(['secretary']);
    expect(guards.filter((guard) => guard.guardClass?.name === 'PermissionGuard').map((guard) => guard.params)).toEqual(['read:dashboard']);
    dashboard.getAttendanceMonthly.mockImplementation(async () => { throw new Error('Year scope unavailable'); });
    await expect(controller[method]()).rejects.toThrow('Year scope unavailable');
  });
});
