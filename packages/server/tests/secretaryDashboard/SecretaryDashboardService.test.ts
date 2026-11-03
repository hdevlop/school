import { describe, expect, it, mock } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { SecretaryDashboardService } from '../../src/modules/dashboard/secretary/SecretaryDashboardService';
import { SecretaryDashboardController } from '../../src/modules/dashboard/secretary/SecretaryDashboardController';
import { yearScopedModules } from '../../src/config/yearScope';

function build() {
  const students = { getCount: mock(async (_activeOnly: boolean) => ({ count: 120 })) };
  const parents = { getCount: mock(async () => ({ count: 85 })) };
  const visits = { getDashboardSummary: mock(async () => ({ newRequests: 3, contactedRequests: 2, queue: [] })) };
  const notifications = { unreadCount: mock(async (_userId: string) => 4) };
  const service = new SecretaryDashboardService(students as any, parents as any, visits as any, notifications as any);
  return { service, students, parents, visits, notifications };
}

describe('secretary dashboard', () => {
  it('counts active enrollments through the scoped student service and keeps notifications personal', async () => {
    const { service, students, notifications } = build();
    expect(await service.getOverview({ id: 'secretary-1', permissions: ['read:students', 'read:parents', 'read:visit-requests'] }))
      .toEqual({ students: 120, parents: 85, visitRequests: { newRequests: 3, contactedRequests: 2, queue: [] }, unreadNotifications: 4 });
    expect(students.getCount).toHaveBeenCalledWith(true);
    expect(notifications.unreadCount).toHaveBeenCalledWith('secretary-1');
  });

  it('does not read or return records whose permission was revoked', async () => {
    const { service, students, parents, visits } = build();
    expect(await service.getOverview({ id: 'secretary-1', permissions: ['read:dashboard'] }))
      .toEqual({ students: null, parents: null, visitRequests: null, unreadNotifications: 4 });
    expect(students.getCount).not.toHaveBeenCalled();
    expect(parents.getCount).not.toHaveBeenCalled();
    expect(visits.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('honors wildcard grants and propagates failed reads instead of reporting zero', async () => {
    const { service, students } = build();
    expect((await service.getOverview({ id: 'secretary-1', permissions: ['read:*'] })).students).toBe(120);
    students.getCount.mockImplementation(async () => { throw new Error('Year scope unavailable'); });
    await expect(service.getOverview({ id: 'secretary-1', permissions: ['read:students'] })).rejects.toThrow('Year scope unavailable');
  });

  it('requires the secretary role and dashboard permission, and registers the selected-year consumer', () => {
    const guards = [...getGuardMetadata(SecretaryDashboardController), ...getGuardMetadata(SecretaryDashboardController, 'getOverview')];
    expect(guards.filter((guard) => guard.guardClass?.name === 'RoleGuard').map((guard) => guard.params)).toEqual(['secretary']);
    expect(guards.filter((guard) => guard.guardClass?.name === 'PermissionGuard').map((guard) => guard.params)).toEqual(['read:dashboard']);
    expect(yearScopedModules['secretary-dashboard']).toBe(SecretaryDashboardController);
  });
});
