import { describe, expect, it, mock } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { REGISTRAR_GRADE_BANDS } from '@sms/contracts/registrar-dashboard';
import { RegistrarDashboardService } from '../../src/modules/dashboard/registrar/RegistrarDashboardService';
import { RegistrarDashboardController } from '../../src/modules/dashboard/registrar/RegistrarDashboardController';
import { yearScopedModules } from '../../src/config/yearScope';

const registrar = { id: 'staff-1', name: 'Nadia', image: null, gender: 'F', email: null, phone: null, address: null };

function build() {
  const repository = {
    getTotals: mock(async () => ({ recorded: 4, pending: 2, missed: 1, average: 71, passRate: 75 })),
    countTestsAwaitingGrades: mock(async (_today: string) => 3),
    getDistribution: mock(async () => [{ band: '70-79', count: 3 }, { band: '0-49', count: 1 }]),
    getMonthlyAverages: mock(async () => [{ month: '2026-10', average: 71, graded: 4 }, { month: '2025-10', average: 10, graded: 9 }]),
    getClassAverages: mock(async () => [{ id: 'c1', name: 'CE1', average: 71, graded: 4 }]),
    getSubjectAverages: mock(async () => [{ id: 's1', name: 'Maths', average: 71, graded: 4 }]),
  };
  const accounts = { getSupervisor: mock(async (_userId: string) => registrar) };
  const settings = { getPublicSettings: mock(async () => ({ timeZone: 'UTC' })) };
  const service = new RegistrarDashboardService(repository as any, accounts as any, settings as any);
  Object.defineProperty(service, 'year', { value: { reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' } });
  service.now = () => new Date('2026-11-04T10:00:00Z');
  return { service, repository, accounts };
}

describe('registrar dashboard', () => {
  it('sends the six grade figures for the signed-in registrar', async () => {
    const { service, repository, accounts } = build();
    const { registrar: account, grades } = await service.getOverview({ id: 'user-1', permissions: ['read:grades'] });
    expect(account).toEqual(registrar);
    expect(accounts.getSupervisor).toHaveBeenCalledWith('user-1');
    expect(grades).toMatchObject({ average: 71, passRate: 75, recorded: 4, pending: 2, missed: 1, testsAwaitingGrades: 3 });
    expect(repository.countTestsAwaitingGrades).toHaveBeenCalledWith('2026-11-04');
  });

  it('fills every band, lowest first, so an empty band still has its column', async () => {
    const { grades } = await build().service.getOverview({ id: 'user-1', permissions: ['read:grades'] });
    expect(grades?.distribution.map(({ band }) => band)).toEqual([...REGISTRAR_GRADE_BANDS]);
    expect(grades?.distribution.map(({ count }) => count)).toEqual([1, 0, 0, 3, 0, 0]);
  });

  it('fills the reporting year, leaving a month with no grades unknown rather than zero', async () => {
    const { grades } = await build().service.getOverview({ id: 'user-1', permissions: ['read:grades'] });
    expect(grades?.monthly).toHaveLength(12);
    expect(grades?.monthly[0]).toEqual({ month: '2026-09', average: null, graded: 0 });
    expect(grades?.monthly.find((row) => row.month === '2026-10')).toEqual({ month: '2026-10', average: 71, graded: 4 });
    expect(grades?.monthly.some((row) => row.month === '2025-10')).toBe(false);
  });

  it('keeps an average with no grades unknown rather than zero', async () => {
    const { service, repository } = build();
    repository.getTotals.mockResolvedValue({ recorded: 0, pending: 0, missed: 0, average: null as never, passRate: null as never });
    const { grades } = await service.getOverview({ id: 'user-1', permissions: ['read:grades'] });
    expect(grades).toMatchObject({ average: null, passRate: null, recorded: 0 });
  });

  it('reads no grades without read:grades, and honors a wildcard grant', async () => {
    const { service, repository } = build();
    expect((await service.getOverview({ id: 'user-1', permissions: ['read:dashboard'] })).grades).toBeNull();
    expect(repository.getTotals).not.toHaveBeenCalled();
    expect((await service.getOverview({ id: 'user-1', permissions: ['read:*'] })).grades).not.toBeNull();
  });

  it('propagates a failed read instead of reporting zero', async () => {
    const { service, repository } = build();
    repository.getDistribution.mockImplementation(async () => { throw new Error('Year scope unavailable'); });
    await expect(service.getOverview({ id: 'user-1', permissions: ['read:grades'] })).rejects.toThrow('Year scope unavailable');
  });

  it.each(['getOverview', 'getStudentAttendanceMonthly'])('limits %s to the registrar role and dashboard permission', (method) => {
    const guards = [...getGuardMetadata(RegistrarDashboardController), ...getGuardMetadata(RegistrarDashboardController, method)];
    expect(guards.filter((guard) => guard.guardClass?.name === 'RoleGuard').map((guard) => guard.params)).toEqual(['registrar']);
    expect(guards.filter((guard) => guard.guardClass?.name === 'PermissionGuard').map((guard) => guard.params)).toEqual(['read:dashboard']);
  });

  it('registers the selected-year consumer', () => {
    expect(yearScopedModules['registrar-dashboard']).toBe(RegistrarDashboardController);
  });

  it('offers student attendance counts only, without staff attendance or a conduct route', async () => {
    const monthly = { monthly: [{ month: '2026-11', present: 17, absent: 2, late: 1, total: 20 }] };
    const dashboard = { getAttendanceMonthly: mock(async (_type: string) => monthly) };
    const controller = new RegistrarDashboardController(build().service, dashboard as any);
    expect(await controller.getStudentAttendanceMonthly()).toEqual(monthly as never);
    expect(dashboard.getAttendanceMonthly).toHaveBeenCalledWith('student');
    expect(Object.getOwnPropertyNames(RegistrarDashboardController.prototype).sort())
      .toEqual(['constructor', 'getOverview', 'getStudentAttendanceMonthly']);
  });
});
