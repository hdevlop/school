import { describe, expect, it, mock } from 'bun:test';

mock.module('najm-i18n', () => ({
  I18n: () => () => undefined,
  t: (key: string) => key,
}));

const { AttendanceService } = await import('@server/modules/attendance/AttendanceService');

describe('AttendanceService staff roster upsert', () => {
  it('validates the roster once and delegates one atomic upsert', async () => {
    const attendanceRepository = {
      upsertStaffRoster: mock(() => Promise.resolve({
        savedCount: 2,
        ids: ['att_01', 'att_02'],
      })),
    };
    const attendanceValidator = {
      validateAttendanceDate: mock(() => Promise.resolve()),
      ensureStaffRosterEligible: mock(() => Promise.resolve()),
    };
    const service = new AttendanceService(
      attendanceRepository as any,
      attendanceValidator as any,
    );
    const items = [
      { staffId: 'staff_01', date: '2026-04-18', status: 'present' as const },
      { staffId: 'staff_02', date: '2026-04-18', status: 'absent' as const, notes: 'Medical leave' },
    ];

    const result = await service.upsertStaffRoster({ items }, { id: 'admin_01' });

    expect(attendanceValidator.validateAttendanceDate).toHaveBeenCalledWith('2026-04-18');
    expect(attendanceValidator.ensureStaffRosterEligible).toHaveBeenCalledWith(['staff_01', 'staff_02'], '2026-04-18');
    expect(attendanceRepository.upsertStaffRoster).toHaveBeenCalledWith(items, 'admin_01');
    expect(result.savedCount).toBe(2);
  });
});
