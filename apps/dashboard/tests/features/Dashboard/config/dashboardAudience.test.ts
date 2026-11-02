import { describe, expect, it } from 'bun:test';
import { canReadFinanceDashboard, FINANCE_DASHBOARD_ROLES, usesFloorManagerDashboard, usesTeacherDashboard } from '@/features/Dashboard/config/dashboardAudience';

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

describe('usesFloorManagerDashboard', () => {
  it('gives floor managers their own home page', () => {
    expect(usesFloorManagerDashboard('floor_manager')).toBe(true);
    expect(usesFloorManagerDashboard('FLOOR_MANAGER')).toBe(true);
  });

  it('keeps every other role, and a missing one, off it', () => {
    for (const role of ['admin', 'teacher', 'supervisor', 'parent', '', null, undefined]) {
      expect(usesFloorManagerDashboard(role)).toBe(false);
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
