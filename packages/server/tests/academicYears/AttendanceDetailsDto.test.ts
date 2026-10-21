import { describe, expect, it } from 'bun:test';
import { createAttendanceDto, staffAttendanceRosterItemDto, updateAttendanceDto } from '../../src/modules/attendance/AttendanceDto';

describe('staff arrival-time validation', () => {
  const item = { staffId: 'staff-1', date: '2026-10-21', status: 'late', notes: 'Traffic' };
  it('accepts HH:MM, omitted and explicitly cleared values', () => {
    for (const arrivalTime of [undefined, null, '00:00', '09:15', '23:59']) {
      expect(staffAttendanceRosterItemDto.safeParse({ ...item, arrivalTime }).success).toBe(true);
      expect(updateAttendanceDto.safeParse({ arrivalTime }).success).toBe(true);
      expect(createAttendanceDto.safeParse({ ...item, type: 'staff', arrivalTime }).success).toBe(true);
    }
  });
  it('refuses impossible or ambiguous times with the same translated message key', () => {
    for (const arrivalTime of ['24:00', '09:60', '9:15', '09:15:00', 'bad']) {
      const result = staffAttendanceRosterItemDto.safeParse({ ...item, arrivalTime });
      expect(result.success).toBe(false);
      expect(result.error!.issues[0].message).toBe('validationMessages.arrivalTimeInvalid');
    }
  });
});
