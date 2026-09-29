import { describe, expect, it } from 'bun:test';
import { AttendanceService } from '../../src/modules/attendance/AttendanceService';
import { attendanceValidator } from './fixtures/attendanceValidator';

describe('historical attendance correction', () => {
  it('allows an older date for administrators but retains the limit for other roles', async () => {
    const validator = attendanceValidator();
    await validator.validateAttendanceDate('2020-09-10', 'admin');
    await validator.validateAttendanceDate('2020-09-10', 'principal');
    await expect(validator.validateAttendanceDate('2020-09-10', 'teacher')).rejects.toThrow();
    await expect(validator.validateAttendanceDate('2020-09-10')).rejects.toThrow();
    await expect(validator.validateAttendanceDate('2099-09-10', 'admin')).rejects.toThrow();
  });

  it('passes the authenticated role through student, staff, and roster writes', async () => {
    const seen: Array<string | undefined> = [];
    const markYear = { id: 'year-1', label: '2020-2021', status: 'closed',
      reportingStartsOn: '2020-09-01', reportingEndsOn: '2021-08-31' };
    const service = new AttendanceService(
      {
        getAttendanceMode: async () => 'per_class',
        create: async (row: unknown) => row,
        upsertStaffRoster: async () => ({ savedCount: 1, ids: ['attendance-1'] }),
      } as any,
      attendanceValidator({}, {
        ensureSelectedYear: (id: string) => expect(id).toBe(markYear.id),
        validateStudentAttendance: async (_data: unknown, context: { user: { role?: string } }) => {
          seen.push(context.user.role);
          return null;
        },
        validateStaffAttendance: async (_data: unknown, role?: string) => { seen.push(role); },
        validateAttendanceDate: async (_date: string, role?: string) => { seen.push(role); },
        ensureStaffRosterEligible: async () => {},
      }),
      { requireLabel: async () => markYear, findForDate: async () => markYear, resolveRecord: async () => markYear } as any,
      { listYearContexts: async () => [{ id: 'sec1', academicYear: markYear.label }] } as any,
    );

    await service.mark({ type: 'student', studentId: 's1', sectionId: 'sec1',
      date: '2020-09-10', status: 'present' }, { id: 'u1', role: 'principal' });
    await service.mark({ type: 'staff', staffId: 'staff1',
      date: '2020-09-10', status: 'present' }, { id: 'u1', role: 'principal' });
    await service.upsertStaffRoster({ items: [{ staffId: 'staff1',
      date: '2020-09-10', status: 'present', notes: null }] }, { id: 'u1', role: 'admin' });

    expect(seen).toEqual(['principal', 'principal', 'admin']);
  });
});
