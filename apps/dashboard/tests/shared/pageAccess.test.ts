import { describe, expect, it } from 'bun:test';
import { matchPermission } from 'najm-auth/client';
import { dashboardLandingPath, PAGE_ACCESS, type PageAccess, type PageViewer } from '@/shared/pageAccess';

const viewer = (role: string, permissions: string[]): PageViewer => ({
  role, can: (permission) => matchPermission(permissions, permission),
});

const pages = (who: PageViewer) => (Object.keys(PAGE_ACCESS) as PageAccess[]).filter((page) => PAGE_ACCESS[page](who));

describe('page access', () => {
  it('opens a page from the permission its routes ask for, for any school-wide role', () => {
    const accountant = viewer('accounting', ['read:staff', 'read:payroll', 'read:financial-operations', 'read:staff-attendance', 'read:vehicles']);
    expect(pages(accountant)).toEqual(expect.arrayContaining(['staff', 'payroll', 'financialOperations', 'staffAttendance', 'vehicles']));
    expect(pages(viewer('supervisor', ['read:fees']))).toContain('fees');
  });

  // Their routes read the whole school, so the server asks for a school-wide role too.
  it('keeps finance, staff and transport pages from a teacher granted their permission', () => {
    const teacher = viewer('teacher', ['read:fees', 'read:staff', 'read:payroll', 'read:vehicles']);
    for (const page of ['fees', 'staff', 'payroll', 'vehicles'] as const) expect(PAGE_ACCESS[page](teacher), page).toBe(false);
  });

  it('gives the principal everything but access control and appearance', () => {
    const principal = viewer('principal', ['read:students', 'read:staff', 'read:fees', 'read:payroll', 'read:cycles',
      'read:settings', 'read:financial-operations', 'read:staff-attendance', 'read:vehicles']);
    expect(pages(principal)).toEqual(expect.arrayContaining(['staff', 'fees', 'payroll', 'cycles', 'settings', 'publicPage', 'financialOperations']));
    expect(PAGE_ACCESS.accessControl(principal)).toBe(false);
    expect(PAGE_ACCESS.appearance(principal)).toBe(false);
    expect(PAGE_ACCESS.accessControl(viewer('principal', ['*:*']))).toBe(false);
  });

  it('opens the dashboard home to the supervisor', () => {
    expect(PAGE_ACCESS.dashboard(viewer('supervisor', []))).toBe(true);
  });

  it('keeps authenticated landing destinations inside the protected app', () => {
    for (const role of ['admin', 'principal', 'accounting', 'teacher', 'secretary', 'assistant', 'supervisor']) {
      expect(dashboardLandingPath(viewer(role, []))).toBe('/dashboard');
    }
    for (const role of ['parent', 'student']) {
      expect(dashboardLandingPath(viewer(role, ['read:students']))).toBe('/students');
      expect(dashboardLandingPath(viewer(role, []))).toBe('/notifications');
    }
    expect(dashboardLandingPath(viewer('driver', ['read:students']))).toBe('/notifications');
    expect(dashboardLandingPath(viewer('custom-role', []))).toBe('/notifications');
  });
});
