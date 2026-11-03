import { describe, expect, it } from 'bun:test';
import { matchPermission } from 'najm-auth/client';
import { dashboardLandingPath, PAGE_ACCESS, type PageAccess, type PageViewer } from '@/shared/pageAccess';

const viewer = (role: string, permissions: string[]): PageViewer => ({
  role, can: (permission) => matchPermission(permissions, permission),
});

const pages = (who: PageViewer) => (Object.keys(PAGE_ACCESS) as PageAccess[]).filter((page) => PAGE_ACCESS[page](who));

describe('page access', () => {
  it('separates insurance from students and timetables from classes', () => {
    expect(PAGE_ACCESS.insurance(viewer('secretary', ['read:students']))).toBe(false);
    expect(PAGE_ACCESS.insurance(viewer('secretary', ['read:insurance']))).toBe(true);
    expect(PAGE_ACCESS.students(viewer('secretary', ['read:insurance']))).toBe(false);
    expect(PAGE_ACCESS.students(viewer('floor_manager', ['read:students']))).toBe(true);
    // The register reads students through their ownership rules, so a
    // class-scoped role granted it sees its own classes' register.
    expect(PAGE_ACCESS.insurance(viewer('supervisor', ['read:insurance']))).toBe(true);
    expect(PAGE_ACCESS.classRoutines(viewer('floor_manager', ['read:classes']))).toBe(false);
    expect(PAGE_ACCESS.classRoutines(viewer('floor_manager', ['read:class-routines']))).toBe(true);
    expect(PAGE_ACCESS.classes(viewer('floor_manager', ['read:class-routines']))).toBe(false);
  });
  it('opens a page from the permission its routes ask for, for any school-wide role', () => {
    const accountant = viewer('accounting', ['read:staff', 'read:payroll', 'read:financial-operations', 'read:staff-attendance', 'read:vehicles']);
    expect(pages(accountant)).toEqual(expect.arrayContaining(['staff', 'payroll', 'financialOperations', 'staffAttendance', 'vehicles']));
    expect(pages(viewer('secretary', ['read:fees']))).toContain('fees');
  });

  // Their routes read the whole school, so the server asks for a school-wide
  // role too. A supervisor works over their assigned classes.
  it('keeps finance, staff and transport pages from a class-scoped role granted their permission', () => {
    for (const role of ['teacher', 'supervisor', 'floor_manager']) {
      const scoped = viewer(role, ['read:fees', 'read:staff', 'read:payroll', 'read:vehicles']);
      for (const page of ['fees', 'staff', 'payroll', 'vehicles'] as const) expect(PAGE_ACCESS[page](scoped), `${role} ${page}`).toBe(false);
    }
  });

  it('gives the principal everything but access control and appearance', () => {
    const principal = viewer('principal', ['read:students', 'read:staff', 'read:fees', 'read:payroll', 'read:cycles',
      'read:settings', 'read:financial-operations', 'read:staff-attendance', 'read:vehicles']);
    expect(pages(principal)).toEqual(expect.arrayContaining(['staff', 'fees', 'payroll', 'cycles', 'settings', 'publicPage', 'financialOperations']));
    expect(PAGE_ACCESS.accessControl(principal)).toBe(false);
    expect(PAGE_ACCESS.appearance(principal)).toBe(false);
    expect(PAGE_ACCESS.accessControl(viewer('principal', ['*:*']))).toBe(false);
  });

  // The roles screen grants the dashboard; the role only picks its layout.
  it('opens the dashboard with read:dashboard, for any role', () => {
    for (const role of ['admin', 'principal', 'supervisor', 'floor_manager', 'driver', 'custom-role']) {
      expect(PAGE_ACCESS.dashboard(viewer(role, ['read:dashboard'])), role).toBe(true);
      expect(PAGE_ACCESS.dashboard(viewer(role, ['read:students'])), role).toBe(false);
    }
    expect(PAGE_ACCESS.dashboard(viewer('admin', ['*:*']))).toBe(true);
  });

  it('keeps authenticated landing destinations inside the protected app', () => {
    for (const role of ['admin', 'principal', 'accounting', 'teacher', 'secretary', 'assistant', 'supervisor', 'floor_manager']) {
      expect(dashboardLandingPath(viewer(role, ['read:dashboard']))).toBe('/dashboard');
      // Revoked in the roles screen: the inbox is still a usable home.
      expect(dashboardLandingPath(viewer(role, []))).toBe('/notifications');
    }
    for (const role of ['parent', 'student']) {
      expect(dashboardLandingPath(viewer(role, ['read:students']))).toBe('/students');
      expect(dashboardLandingPath(viewer(role, []))).toBe('/notifications');
    }
    expect(dashboardLandingPath(viewer('driver', ['read:students']))).toBe('/notifications');
    expect(dashboardLandingPath(viewer('custom-role', ['read:dashboard']))).toBe('/dashboard');
    expect(dashboardLandingPath(viewer('custom-role', []))).toBe('/notifications');
  });
});
