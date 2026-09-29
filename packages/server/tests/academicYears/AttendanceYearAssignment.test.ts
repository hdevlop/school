import { describe, expect, it } from 'bun:test';
import { AttendanceService } from '../../src/modules/attendance/AttendanceService';
import { attendanceValidator } from './fixtures/attendanceValidator';

describe('attendance year assignment', () => {
  it('uses the section year for student marks and the reporting interval for staff marks', async () => {
    const year = { id: 'year-1', label: '2025-2026', status: 'closed',
      reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' };
    const service = new AttendanceService(
      {} as any,
      attendanceValidator(),
      {
        requireLabel: async () => year,
        findForDate: async (date: string) => date <= year.reportingEndsOn ? year : null,
      } as any,
      { listYearContexts: async (ids: string[]) => ids.map((id) => ({ id, academicYear: year.label })) } as any,
    );
    await expect(service.yearForStudentMark('section-1', '2026-06-01')).resolves.toBe(year.id);
    await expect(service.yearForStudentMark('section-1', '2026-09-01')).rejects.toThrow();
    await expect(service.yearForStaffMark('2026-07-01')).resolves.toBe(year.id);
    await expect(service.yearForStaffMark('2026-09-01')).rejects.toThrow();
  });
});
