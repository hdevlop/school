import { describe, expect, it } from 'bun:test';
import { matchPermission } from 'najm-auth/client';
import { SIDEBAR_CONFIGURED_PERMISSION, SIDEBAR_ORDER_IDS, sidebarKeyForItem } from '@sms/contracts/access-control';
import { createNavigationItems, createSidebarItems } from '@/shared/schoolNavigation';
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
  it('shows insurance through its own permission and sidebar choice', () => {
    expect(ids(createSidebarItems((key) => key, viewer('secretary', ['read:students'])))).not.toContain('/insurance');
    expect(ids(createSidebarItems((key) => key, viewer('secretary', ['read:insurance'])))).toContain('/insurance');
    // The register reads students through their ownership rules, so a
    // teacher granted it in the roles screen sees their own classes'.
    expect(ids(createSidebarItems((key) => key, viewer('teacher', ['read:insurance'])))).toContain('/insurance');
    expect(ids(createSidebarItems((key) => key, viewer('teacher', ['read:students'])))).not.toContain('/insurance');
    const base = ['read:insurance', 'read:students', 'read:parents', SIDEBAR_CONFIGURED_PERMISSION];
    expect(ids(createSidebarItems((key) => key, viewer('secretary', [...base, 'sidebar:insurance'])))).toContain('/insurance');
    expect(ids(createSidebarItems((key) => key, viewer('secretary', [...base, 'sidebar:students'])))).not.toContain('/insurance');
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

describe('saved sidebar order', () => {
  // The roles screen saves the order of every item it shows; the API accepts
  // only SIDEBAR_ORDER_IDS, so an item missing there makes every save fail.
  const everyId = (role: string) => ids(createNavigationItems((key) => key, viewer(role, ['*']), true) as ReturnType<typeof createSidebarItems>);

  it('accepts every menu item the dashboard can show', () => {
    const accepted = new Set<string>(SIDEBAR_ORDER_IDS);
    for (const role of ['admin', 'teacher', 'parent', 'student', 'secretary']) {
      expect(everyId(role).filter((id) => !accepted.has(id)), role).toEqual([]);
    }
  });

  it('puts every Massar page under the Massar sidebar choice', () => {
    const massarPages = everyId('admin').filter((id) => id.startsWith('/massar'));
    expect(massarPages).toEqual(expect.arrayContaining(['/massar', '/massar-settings']));
    for (const id of massarPages) expect(sidebarKeyForItem(id), id).toBe('massar');
  });
});
