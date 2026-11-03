import { describe, expect, it } from 'bun:test';
import { matchPermission } from 'najm-auth/client';
import { secretaryQuickActions } from '@/features/Dashboard/config/secretaryDashboard';
import { usesSecretaryDashboard } from '@/features/Dashboard/config/dashboardAudience';

const viewer = (permissions: string[]) => ({ role: 'secretary', can: (permission: string) => matchPermission(permissions, permission) });

describe('secretary dashboard navigation', () => {
  it('selects the secretary layout only for that role', () => {
    expect(usesSecretaryDashboard('secretary')).toBe(true);
    expect(usesSecretaryDashboard('SECRETARY')).toBe(true);
    for (const role of ['admin', 'floor_manager', 'supervisor', 'teacher', null, undefined]) {
      expect(usesSecretaryDashboard(role)).toBe(false);
    }
  });

  it('keeps revoked destinations out of quick actions while retaining personal notifications', () => {
    expect(secretaryQuickActions(viewer([])).map(({ href }) => href)).toEqual(['/notifications']);
    expect(secretaryQuickActions(viewer(['read:students', 'read:parents'])).map(({ href }) => href))
      .toEqual(['/students', '/parents', '/notifications']);
    expect(secretaryQuickActions(viewer(['read:*'])).map(({ href }) => href))
      .toEqual(['/students', '/parents', '/visit-requests', '/insurance', '/class-routines', '/notifications']);
  });
});
