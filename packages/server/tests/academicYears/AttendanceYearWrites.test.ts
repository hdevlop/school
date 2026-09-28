import { describe, expect, it } from 'bun:test';
import { AttendanceService } from '../../src/modules/attendance/AttendanceService';

const year = { id: 'year-1', label: '2025-2026', status: 'open',
  reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' };

describe('normal attendance year writes', () => {
  it('stores the resolved registered year for student and staff marks', async () => {
    const created: Array<Record<string, unknown>> = [];
    const service = new AttendanceService(
      {
        getAttendanceMode: async () => 'per_class',
        create: async (row: Record<string, unknown>) => { created.push(row); return row; },
      } as any,
      {
        ensureSelectedYear: (id: string) => expect(id).toBe(year.id),
        validateStudentAttendance: async () => 'assignment-1',
        validateStaffAttendance: async () => {},
      } as any,
      {
        resolveRecord: async () => year,
        requireLabel: async (label: string) => { expect(label).toBe(year.label); return year; },
        findForDate: async (date: string) => { expect(date).toBe('2025-10-01'); return year; },
      } as any,
      {
        listYearContexts: async (ids: string[]) => {
          expect(ids).toEqual(['section-1']);
          return [{ id: 'section-1', academicYear: year.label }];
        },
      } as any,
    );

    await service.mark({ type: 'student', studentId: 'student-1', sectionId: 'section-1',
      date: '2025-10-01', status: 'present' }, { id: 'admin-1', role: 'admin' });
    await service.mark({ type: 'staff', staffId: 'staff-1',
      date: '2025-10-01', status: 'present' }, { id: 'admin-1', role: 'admin' });

    expect(created).toHaveLength(2);
    expect(created.map((row) => row.academicYearId)).toEqual(['year-1', 'year-1']);
    expect(created[0].sectionId).toBe('section-1');
    expect(created[1].staffId).toBe('staff-1');
  });
});
