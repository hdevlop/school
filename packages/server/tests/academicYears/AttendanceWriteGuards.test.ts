import { describe, expect, it } from 'bun:test';
import { AttendanceService } from '../../src/modules/attendance/AttendanceService';
import { attendanceValidator } from './fixtures/attendanceValidator';

const year = { id: 'year-1', label: '2025-2026', status: 'closed',
  reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' };
const mark = { type: 'student' as const, studentId: 'student-1', sectionId: 'section-1',
  date: '2025-10-01', status: 'present' as const };
const rosterItem = { staffId: 'staff-1', date: mark.date, status: 'present' as const, notes: null };

function service(repository: Record<string, unknown>) {
  return new AttendanceService(
    repository as any,
    attendanceValidator(repository, {
      ensureSelectedYear: () => {},
      validateAttendanceDate: async () => {},
      validateStudentAttendance: async () => null,
      ensureStaffRosterEligible: async () => {},
    }),
    { requireLabel: async () => year, findForDate: async () => year, resolveRecord: async () => year } as any,
    { listYearContexts: async () => [{ id: mark.sectionId, academicYear: year.label }] } as any,
  );
}

describe('attendance write guards', () => {
  it.each([
    { teacherId: null, submittedTeacherId: undefined, assigned: true },
    { teacherId: 'teacher-1', submittedTeacherId: 'teacher-2', assigned: true },
    { teacherId: 'teacher-1', submittedTeacherId: undefined, assigned: false },
  ])('rejects an unauthorized teacher mark before writing: %j', async (context) => {
    let writes = 0;
    const attendance = service({
      teacherIdForUser: async () => context.teacherId,
      isTeacherInSection: async () => context.assigned,
      create: async () => { writes++; },
    });
    await expect(attendance.mark({ ...mark, teacherId: context.submittedTeacherId },
      { id: 'user-1', role: 'teacher' })).rejects.toMatchObject({ status: 403, message: 'notAuthorizedForSection' });
    expect(writes).toBe(0);
  });

  it('rejects a duplicate daily mark before writing', async () => {
    let writes = 0;
    const attendance = service({
      getAttendanceMode: async () => 'daily',
      findSameDayForStudentInSection: async () => ({ id: 'attendance-1' }),
      create: async () => { writes++; },
    });
    await expect(attendance.mark(mark, { id: 'admin-1', role: 'admin' }))
      .rejects.toMatchObject({ status: 409, message: 'dailyAlreadyMarked' });
    expect(writes).toBe(0);
  });

  it('keeps the missing daily correction error', async () => {
    const attendance = service({ findSameDayForStudentInSection: async () => undefined });
    await expect(attendance.updateStatus(mark, { id: 'admin-1', role: 'admin' }))
      .rejects.toMatchObject({ status: 404, message: 'noRecordToday' });
  });

  it.each([
    { role: 'teacher', assigned: false, oldStatus: 'absent', status: 'present' as const, error: 403 },
    { role: 'teacher', assigned: true, oldStatus: 'present', status: 'absent' as const, error: 400 },
    { role: 'teacher', assigned: true, oldStatus: 'absent', status: 'late' as const, error: null },
    { role: 'admin', assigned: false, oldStatus: 'present', status: 'absent' as const, error: null },
    { role: 'principal', assigned: false, oldStatus: 'late', status: 'absent' as const, error: null },
  ])('preserves correction access, transitions and history: %j', async (context) => {
    const record = { id: 'attendance-1', ...mark, status: context.oldStatus };
    const changes: unknown[] = [];
    const repository = {
      teacherIdForUser: async () => 'teacher-1',
      isTeacherInSection: async () => context.assigned,
      findSameDayForStudentInSection: async () => record,
      getById: async () => record,
      update: async (_id: string, data: unknown) => { changes.push(data); },
      createHistory: async (history: unknown) => { changes.push(history); },
    };
    const operation = service(repository).updateStatus({ ...mark, status: context.status, note: 'Corrected' },
      { id: 'user-1', role: context.role });
    if (context.error) {
      await expect(operation).rejects.toMatchObject({ status: context.error,
        message: context.error === 403 ? 'notAuthorizedForSection' : 'invalidTransition' });
      expect(changes).toEqual([]);
    } else {
      await operation;
      expect(changes).toEqual([
        { status: context.status, lastUpdatedBy: 'user-1' },
        { attendanceId: record.id, oldStatus: context.oldStatus, newStatus: context.status,
          note: 'Corrected', changedBy: 'user-1' },
      ]);
    }
  });

  it.each([
    { items: [rosterItem, rosterItem], message: 'duplicateStaffInRoster' },
    { items: [rosterItem, { ...rosterItem, staffId: 'staff-2', date: '2025-10-02' }], message: 'mixedRosterDates' },
  ])('rejects an inconsistent staff roster before writing: $message', async ({ items, message }) => {
    let writes = 0;
    const attendance = service({ upsertStaffRoster: async () => { writes++; } });
    await expect(attendance.upsertStaffRoster({ items: [...items] }, { id: 'admin-1', role: 'admin' }))
      .rejects.toMatchObject({ status: 400, message });
    expect(writes).toBe(0);
  });

  it('rejects a partial roster save from an academic-year conflict', async () => {
    const attendance = service({ upsertStaffRoster: async () => ({ savedCount: 0, ids: [] }) });
    await expect(attendance.upsertStaffRoster({ items: [rosterItem] }, { id: 'admin-1', role: 'admin' }))
      .rejects.toMatchObject({ status: 409, message: 'staffRecordOtherYear' });
  });

  it('rejects a staff mark by a teacher', async () => {
    await expect(service({}).mark({ type: 'staff', ...rosterItem, notes: undefined },
      { id: 'user-1', role: 'teacher' }))
      .rejects.toMatchObject({ status: 403, message: 'staffRequiresAdmin' });
  });

  it('rejects a teacher updating staff attendance', async () => {
    const attendance = service({
      getById: async () => ({ id: 'attendance-1', type: 'staff', academicYearId: year.id, date: mark.date }),
      teacherIdForUser: async () => 'teacher-1',
    });
    await expect(attendance.update('attendance-1', { status: 'present' }, { id: 'user-1', role: 'teacher' }))
      .rejects.toMatchObject({ status: 403, message: 'notAuthorizedForSection' });
  });
});
