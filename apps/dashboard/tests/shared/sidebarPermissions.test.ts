import { describe, expect, it } from 'bun:test';
import { matchPermission } from 'najm-auth/client';
import { SIDEBAR_CONFIGURED_PERMISSION } from '@sms/contracts/access-control';
import { createSidebarItems } from '@/shared/schoolNavigation';
import { PAGE_ACCESS } from '@/shared/pageAccess';

const viewer = (role: string, permissions: string[]) => ({ role, can: (name: string) => matchPermission(permissions, name) });
function ids(items: ReturnType<typeof createSidebarItems>): string[] {
  return items.flatMap((item) => [item.id, ...ids(item.children ?? [])]);
}

describe('independent sidebar visibility', () => {
  it('preserves legacy navigation until a role is explicitly configured', () => {
    const user = viewer('accounting', ['read:fees', 'read:payroll', 'read:feeTypes']);
    expect(ids(createSidebarItems((key) => key, user))).toEqual(expect.arrayContaining(['/fees', '/payroll', '/fee-types']));
  });

  it('hides payroll independently of fees and fee types without revoking page access', () => {
    const user = viewer('accounting', ['read:fees', 'read:payroll', 'read:feeTypes', SIDEBAR_CONFIGURED_PERMISSION, 'sidebar:fees', 'sidebar:feeTypes']);
    const navigation = ids(createSidebarItems((key) => key, user));
    expect(navigation).toContain('/fees');
    expect(navigation).toContain('/fee-types');
    expect(navigation).not.toContain('/payroll');
    expect(PAGE_ACCESS.payroll(user)).toBe(true);
  });

  it('never grants page access from a sidebar permission and removes empty groups', () => {
    const user = viewer('accounting', [SIDEBAR_CONFIGURED_PERMISSION, 'sidebar:payroll']);
    const navigation = ids(createSidebarItems((key) => key, user));
    expect(navigation).not.toContain('/payroll');
    expect(navigation).not.toContain('financial');
    expect(PAGE_ACCESS.payroll(user)).toBe(false);
  });

  it('keeps school-wide restrictions and the protected admin wildcard', () => {
    expect(ids(createSidebarItems((key) => key, viewer('teacher', ['read:payroll', SIDEBAR_CONFIGURED_PERMISSION, 'sidebar:payroll'])))).not.toContain('/payroll');
    expect(ids(createSidebarItems((key) => key, viewer('admin', ['*:*'])))).toContain('/payroll');
  });

  it('can hide family entries and the inbox without changing family record access', () => {
    const user = viewer('parent', ['read:students', SIDEBAR_CONFIGURED_PERMISSION]);
    const navigation = ids(createSidebarItems((key) => key, user));
    expect(navigation).not.toContain('/students');
    expect(navigation).not.toContain('/notifications');
    expect(PAGE_ACCESS.students(user)).toBe(true);
  });
});
