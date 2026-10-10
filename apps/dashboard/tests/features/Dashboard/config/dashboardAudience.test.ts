import { describe, expect, it } from 'bun:test';
import { canReadFinanceDashboard, FINANCE_DASHBOARD_ROLES, usesTeacherDashboard } from '@/features/Dashboard/config/dashboardAudience';

describe('usesTeacherDashboard', () => {
  it('gives teachers their own home page', () => {
    expect(usesTeacherDashboard('teacher')).toBe(true);
    expect(usesTeacherDashboard('TEACHER')).toBe(true);
  });

  it('keeps every other role, and a missing one, on the school dashboard', () => {
    for (const role of ['admin', 'principal', 'accounting', 'parent', 'student', '', null, undefined]) {
      expect(usesTeacherDashboard(role)).toBe(false);
    }
  });
});

describe('canReadFinanceDashboard', () => {
  it('admits the roles of the server finance guard', () => {
    expect([...FINANCE_DASHBOARD_ROLES].sort()).toEqual(['accounting', 'admin', 'principal']);
    for (const role of ['admin', 'principal', 'accounting', 'ADMIN']) {
      expect(canReadFinanceDashboard(role)).toBe(true);
    }
  });

  it('keeps finance widgets from every other role and a missing one', () => {
    for (const role of ['teacher', 'parent', 'student', 'secretary', 'driver', '', null, undefined]) {
      expect(canReadFinanceDashboard(role)).toBe(false);
    }
  });
});
