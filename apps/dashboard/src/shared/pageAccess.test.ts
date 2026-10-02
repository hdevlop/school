import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dashboardLandingPath, PAGE_ACCESS, pageViewer } from './pageAccess';
import { NAV_ACCESS } from './DashboardShell/navigationAccess';

const viewer = (role: string | undefined, permissions: string[] = []) =>
  pageViewer({ user: { role }, permissions });

describe('shared page access', () => {
  it('uses the same rules for server pages and sidebar links', () => {
    expect(NAV_ACCESS).toBe(PAGE_ACCESS);
  });

  it('keeps management screens admin-only even with wildcard permissions', () => {
    for (const access of ['accessControl', 'staff', 'payroll', 'financialOperations', 'vehicles', 'cycles', 'appearance'] as const) {
      expect(PAGE_ACCESS[access](viewer('admin', ['*:*']))).toBe(true);
      for (const role of ['principal', 'accounting', 'teacher', 'parent', 'student', 'driver', undefined]) {
        expect(PAGE_ACCESS[access](viewer(role, ['*:*']))).toBe(false);
      }
    }
  });

  it('admits finance roles and refuses academic/family accounts with finance grants', () => {
    for (const access of ['fees', 'expenses', 'feeTypes', 'reminders'] as const) {
      for (const role of ['admin', 'principal', 'accounting']) {
        expect(PAGE_ACCESS[access](viewer(role))).toBe(true);
      }
      for (const role of ['teacher', 'parent', 'student', 'accountant', undefined]) {
        expect(PAGE_ACCESS[access](viewer(role, ['*:*']))).toBe(false);
      }
    }
  });

  it('matches actual grants and Najm wildcard grants for shared academic pages', () => {
    for (const permissions of [['read:students'], ['read:*'], ['*:students'], ['*:*']]) {
      expect(PAGE_ACCESS.students(viewer('teacher', permissions))).toBe(true);
    }
    expect(PAGE_ACCESS.students(viewer('principal'))).toBe(false);
    expect(PAGE_ACCESS.students(viewer('teacher', ['update:students']))).toBe(false);
    expect(PAGE_ACCESS.students(viewer('parent', ['read:students']))).toBe(true);
    expect(PAGE_ACCESS.students(viewer('student', ['read:students']))).toBe(true);
  });

  it('takes session grants before user grants, including explicitly empty grants', () => {
    const user = { role: 'teacher', permissions: ['*:*'] };
    expect(PAGE_ACCESS.students(pageViewer({ user, permissions: [] }))).toBe(false);
    expect(PAGE_ACCESS.students(pageViewer({ user }))).toBe(true);
    expect(PAGE_ACCESS.students(pageViewer({ user: { role: 'teacher' } }))).toBe(false);
  });

  it('keeps settings with admin and principal', () => {
    expect(PAGE_ACCESS.settings(viewer('admin'))).toBe(true);
    expect(PAGE_ACCESS.settings(viewer('principal'))).toBe(true);
    expect(PAGE_ACCESS.settings(viewer('accounting', ['*:*']))).toBe(false);
  });

  it('preserves staff and family homes and gives non-staff a home without a redirect loop', () => {
    for (const role of ['admin', 'principal', 'accounting', 'teacher', 'secretary']) {
      expect(dashboardLandingPath(viewer(role))).toBe('/');
    }
    for (const role of ['parent', 'student']) {
      expect(dashboardLandingPath(viewer(role, ['read:students']))).toBe('/students');
      expect(dashboardLandingPath(viewer(role))).toBe('/notifications');
    }
    for (const role of ['driver', 'custom-role', undefined]) {
      expect(dashboardLandingPath(viewer(role))).toBe('/notifications');
    }
  });
});

// Coverage is deliberate: adding a page requires choosing its access rule,
// including old URLs and detail pages, instead of silently inheriting sign-in.
const dashboardRoot = fileURLToPath(new URL('../app/(dashboard)/', import.meta.url));
const expectedLayouts = {
  "aging": "fees",
  "alerts": "alerts",
  "announcements": "announcements",
  "assessments": "assessments",
  "attendance/staff": "staffAttendance",
  "attendance/students": "studentAttendance",
  "attendance/teachers": "staffAttendance",
  "behavior-rewards": "behaviorRewards",
  "calendar": "calendar",
  "class-routines": "classRoutines",
  "classes": "classes",
  "cycles": "cycles",
  "discipline": "discipline",
  "drivers": "staff",
  "exams": "exams",
  "expenses": "expenses",
  "fee-types": "feeTypes",
  "fees": "fees",
  "financial-operations": "financialOperations",
  "grades": "grades",
  "parents": "parents",
  "payroll": "payroll",
  "permissions": "accessControl",
  "reminders": "reminders",
  "reports": "fees",
  "roles": "accessControl",
  "sections": "sections",
  "staff": "staff",
  "students": "students",
  "students/[id]/fees": "fees",
  "subjects": "subjects",
  "teachers": "teachers",
  "transport": "vehicles",
  "users": "accessControl",
  "vehicles": "vehicles",
  "settings": "settings"
} as const;

function pagesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? pagesUnder(path) : entry.name === 'page.tsx' ? [path] : [];
  });
}

describe('server route guard coverage', () => {
  it('guards every restricted section before returning its children', () => {
    for (const [route, access] of Object.entries(expectedLayouts)) {
      const source = readFileSync(join(dashboardRoot, route, 'layout.tsx'), 'utf8');
      expect(source).not.toContain('use client');
      expect(source).toContain("from '@/shared/requirePageAccess'");
      expect(source).toContain(`await requirePageAccess('${access}')`);
      expect(source.indexOf('await requirePageAccess')).toBeLessThan(source.indexOf('return children'));
    }
  });

  it('covers every page, with sign-in-only exceptions named explicitly', () => {
    const sessionOnly = ['notifications', 'preferences'];
    const guardedPages = ['', 'academic-year-migration'];
    const pages = pagesUnder(dashboardRoot);
    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) {
      const route = relative(dashboardRoot, dirname(page)).replaceAll('\\', '/');
      if (sessionOnly.includes(route)) {
        expect(readFileSync(join(dashboardRoot, 'layout.tsx'), 'utf8')).toContain('await requireSession()');
      } else if (guardedPages.includes(route)) {
        const source = readFileSync(page, 'utf8');
        expect(source).not.toContain('use client');
        expect(source).toContain(`await requirePageAccess('${route ? 'settings' : 'dashboard'}')`);
      } else {
        expect(Object.keys(expectedLayouts).some((section) =>
          route === section || route.startsWith(section + '/'),
        )).toBe(true);
      }
    }
    // The fee subpage needs the finance guard in addition to the student guard.
    expect(expectedLayouts['students/[id]/fees']).toBe('fees');
  });
});
