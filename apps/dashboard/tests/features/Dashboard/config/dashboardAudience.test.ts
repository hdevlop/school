import { describe, expect, it } from 'bun:test';
import { matchPermission } from 'najm-auth/client';
import {
  canReadFinanceDashboard, FINANCE_DASHBOARD_ROLES, rowSpans, schoolDashboardCards,
  usesMonitorDashboard, usesSupervisorDashboard, usesTeacherDashboard,
} from '@/features/Dashboard/config/dashboardAudience';

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

describe('usesMonitorDashboard', () => {
  it('gives monitors their own home page', () => {
    expect(usesMonitorDashboard('monitor')).toBe(true);
    expect(usesMonitorDashboard('MONITOR')).toBe(true);
  });

  it('keeps every other role, and a missing one, off it', () => {
    for (const role of ['admin', 'teacher', 'supervisor', 'parent', '', null, undefined]) {
      expect(usesMonitorDashboard(role)).toBe(false);
    }
  });
});

describe('usesSupervisorDashboard', () => {
  it('gives supervisors their own home page', () => {
    expect(usesSupervisorDashboard('supervisor')).toBe(true);
    expect(usesSupervisorDashboard('SUPERVISOR')).toBe(true);
  });

  it('keeps every other role, and a missing one, off it', () => {
    for (const role of ['admin', 'teacher', 'monitor', 'principal', '', null, undefined]) {
      expect(usesSupervisorDashboard(role)).toBe(false);
    }
  });
});

describe('schoolDashboardCards', () => {
  const viewer = (isSchoolWide: boolean, permissions: string[]) => ({
    isSchoolWide, can: (permission: string) => matchPermission(permissions, permission),
  });

  // As the server's CanSchoolWide: a school-wide role holding the permission.
  it('shows each chart for the permission its route asks for', () => {
    expect(schoolDashboardCards(viewer(true, ['read:students']))).toEqual({
      studentsByGender: true, studentAttendance: false, staffAttendance: false,
    });
    expect(schoolDashboardCards(viewer(true, ['*:*']))).toEqual({
      studentsByGender: true, studentAttendance: true, staffAttendance: true,
    });
  });

  it('shows no chart to a role that is not school-wide', () => {
    expect(Object.values(schoolDashboardCards(viewer(false, ['*:*']))).some(Boolean)).toBe(false);
  });
});

describe('rowSpans', () => {
  it('keeps the widths of a full row', () => {
    expect(rowSpans({ gender: 2, attendance: 4, trend: 6 })).toEqual({
      gender: 'md:col-span-2', attendance: 'md:col-span-4', trend: 'md:col-span-6',
    });
  });

  // The layout a dashboard without finance always had.
  it('gives a left-out card its width, in proportion', () => {
    expect(rowSpans({ gender: 2, attendance: 4, trend: false })).toEqual({ gender: 'md:col-span-4', attendance: 'md:col-span-8' });
    expect(rowSpans({ staff: 4, calendar: 2 })).toEqual({ staff: 'md:col-span-8', calendar: 'md:col-span-4' });
    expect(rowSpans({ expenses: 2, staff: false, overdue: 4, calendar: 2 })).toEqual({
      expenses: 'md:col-span-3', overdue: 'md:col-span-6', calendar: 'md:col-span-3',
    });
  });

  it('always fills the twelve columns, and lays out nothing for an empty row', () => {
    const spans = rowSpans({ a: 1, b: 1, c: 1, d: 1, e: 1 });
    expect(Object.values(spans).reduce((sum, span) => sum + Number(span!.split('-').pop()), 0)).toBe(12);
    expect(rowSpans({ gender: false, attendance: false })).toEqual({});
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
