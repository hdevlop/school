import { describe, expect, it } from 'bun:test';
import { matchPermission } from 'najm-auth/client';
import { classesInSchoolOrder, gradeTrendRows, registrarQuickActions, subjectsByAverage } from '@/features/Dashboard/config/registrarDashboard';
import { usesRegistrarDashboard } from '@/features/Dashboard/config/dashboardAudience';
import { PAGE_ACCESS, dashboardLandingPath, isSchoolWideRole } from '@/shared/pageAccess';

const viewer = (permissions: string[]) => ({ role: 'registrar', can: (permission: string) => matchPermission(permissions, permission) });
const average = (name: string, value: number) => ({ id: name, name, average: value, graded: 1 });

describe('registrar dashboard', () => {
  it('selects the registrar layout only for that role', () => {
    expect(usesRegistrarDashboard('registrar')).toBe(true);
    expect(usesRegistrarDashboard('REGISTRAR')).toBe(true);
    for (const role of ['admin', 'secretary', 'supervisor', 'teacher', null, undefined]) {
      expect(usesRegistrarDashboard(role)).toBe(false);
    }
  });

  it('opens the dashboard by permission and reads the whole school', () => {
    expect(isSchoolWideRole('registrar')).toBe(true);
    expect(dashboardLandingPath(viewer(['read:dashboard']))).toBe('/dashboard');
    expect(dashboardLandingPath(viewer([]))).toBe('/notifications');
  });

  // Being school-wide widens what a permission reaches; it grants no page.
  it('opens no conduct, attendance or finance page from its seeded permissions', () => {
    const seeded = viewer(['read:dashboard', 'create:students', 'read:students', 'update:students', 'read:teachers', 'read:classes', 'read:sections', 'read:subjects', 'read:grades', 'read:exams', 'read:assessments']);
    for (const page of ['discipline', 'behaviorRewards', 'studentAttendance', 'staffAttendance', 'fees', 'parents'] as const) {
      expect(PAGE_ACCESS[page](seeded)).toBe(false);
    }
    expect(PAGE_ACCESS.grades(seeded)).toBe(true);
  });

  it('keeps revoked destinations out of quick actions while retaining personal notifications', () => {
    expect(registrarQuickActions(viewer([])).map(({ href }) => href)).toEqual(['/notifications']);
    expect(registrarQuickActions(viewer(['read:students', 'read:grades'])).map(({ href }) => href))
      .toEqual(['/students', '/grades', '/notifications']);
    expect(registrarQuickActions(viewer(['read:*'])).map(({ href }) => href))
      .toEqual(['/students', '/grades', '/assessments', '/exams', '/classes', '/notifications']);
  });

  it('shows school months only, and leaves a month with no grades or still to come as a gap', () => {
    const rows = gradeTrendRows([
      { month: '2026-09', average: 70, graded: 3 },
      { month: '2026-10', average: null, graded: 0 },
      { month: '2026-11', average: 65, graded: 2 },
      { month: '2026-12', average: 90, graded: 1 },
      { month: '2027-07', average: 80, graded: 1 },
      { month: '2027-08', average: 80, graded: 1 },
    ], '2026-11-04');
    expect(rows.map(({ month, average: value }) => [month, value])).toEqual([
      ['2026-09', 70], ['2026-10', null], ['2026-11', 65], ['2026-12', null],
    ]);
  });

  it('orders classes by school level and subjects by their average', () => {
    expect(classesInSchoolOrder([average('CM2', 50), average('CP', 90), average('CE1', 70)]).map(({ name }) => name)).toEqual(['CP', 'CE1', 'CM2']);
    expect(subjectsByAverage([average('Arts', 60), average('Maths', 80), average('Bio', 60)]).map(({ name }) => name)).toEqual(['Maths', 'Arts', 'Bio']);
  });
});
