import { beforeAll, describe, expect, it, mock } from 'bun:test';

mock.module('najm-i18n', () => ({
  I18n: () => () => undefined,
  t: (key: string) => key,
}));

const {
  isAttendanceDateTooOld,
  isFutureAttendanceDate,
} = await import('@server/modules/attendance/AttendanceValidator');

describe('AttendanceValidator date helpers', () => {
  const now = new Date('2026-04-18T01:00:00+01:00');

  it('accepts the same calendar day for YYYY-MM-DD input', () => {
    expect(isFutureAttendanceDate('2026-04-18', now)).toBe(false);
  });

  it('rejects the next calendar day as future', () => {
    expect(isFutureAttendanceDate('2026-04-19', now)).toBe(true);
  });

  it('keeps the 30-day boundary date within range', () => {
    expect(isAttendanceDateTooOld('2026-03-19', 30, now)).toBe(false);
  });

  it('rejects dates older than the allowed window', () => {
    expect(isAttendanceDateTooOld('2026-03-18', 30, now)).toBe(true);
  });
});

describe('AttendanceValidator student duplicate protection', () => {
  let source = '';

  beforeAll(async () => {
    source = await Bun.file(
      new URL('../../src/modules/attendance/AttendanceValidator.ts', import.meta.url),
    ).text();
  });

  it('checks duplicate student attendance in the student validation path', () => {
    expect(source).toContain('const teacherAssignment = await this.attendanceRepository.getTeacherAssignment(');
    // per_class mode enforces the duplicate guard via the resolved teacherAssignmentId.
    expect(source).toContain('await this.ensureNoDuplicateAttendance(studentId, teacherAssignmentId, date);');
  });
});
