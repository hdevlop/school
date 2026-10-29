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
  it('groups assessments, planning and exams under Evaluations with independent access checks', () => {
    for (const role of ['admin', 'teacher', 'parent', 'student']) {
      const user = viewer(role, ['read:assessments', 'read:exams']);
      const menu = createSidebarItems((key) => key, user);
      expect(menu.find(item => item.id === 'evaluations')?.children?.map(item => item.href))
        .toEqual(['/assessments', '/exam-planning', '/exams']);
      expect(menu.find(item => item.id === '/assessments')).toBeUndefined();
    }
    const examsOnly = createSidebarItems((key) => key, viewer('teacher', ['read:exams']));
    expect(examsOnly.find(item => item.id === 'evaluations')?.children?.map(item => item.href)).toEqual(['/exam-planning', '/exams']);
    expect(createSidebarItems((key) => key, viewer('teacher', [])).find(item => item.id === 'evaluations')).toBeUndefined();
  });

  it('keeps exam planning visibility tied to the Exams sidebar choice', () => {
    const base = ['read:assessments', 'read:exams', SIDEBAR_CONFIGURED_PERMISSION];
    const examsOnly = ids(createSidebarItems((key) => key, viewer('teacher', [...base, 'sidebar:exams'])));
    expect(examsOnly).toContain('/exam-planning');
    const assessmentsOnly = ids(createSidebarItems((key) => key, viewer('teacher', [...base, 'sidebar:assessments'])));
    expect(assessmentsOnly).not.toContain('/exam-planning');
    expect(assessmentsOnly).not.toContain('/exams');
  });
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
