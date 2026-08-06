import { describe, expect, it } from 'bun:test';
import {
  attendanceDateFilterDto,
  createAttendanceDto,
  createAttendanceInputDto,
  upsertStaffAttendanceRosterDto,
} from '@server/modules/attendance/AttendanceDto';

describe('createAttendanceDto', () => {
  it('exposes a plain object schema for MCP callers', () => {
    const result = createAttendanceInputDto.safeParse({
      type: 'staff',
      staffId: 'staff_01',
      date: '2026-04-18',
      status: 'present',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        type: 'staff',
        staffId: 'staff_01',
        date: '2026-04-18',
        status: 'present',
      });
    }
  });

  it('parses staff attendance payloads', () => {
    const result = createAttendanceDto.safeParse({
      type: 'staff',
      staffId: 'staff_01',
      date: '2026-04-18',
      status: 'present',
      notes: 'Marked from MCP',
    });

    expect(result.success).toBe(true);
  });

  it('parses student attendance payloads', () => {
    const result = createAttendanceDto.safeParse({
      type: 'student',
      studentId: 'student_01',
      teacherId: 'teacher_01',
      subjectId: 'subject_01',
      sectionId: 'section_01',
      date: '2026-04-18',
      status: 'late',
    });

    expect(result.success).toBe(true);
  });

  it('rejects staff attendance without a staffId', () => {
    const result = createAttendanceDto.safeParse({
      type: 'staff',
      date: '2026-04-18',
      status: 'present',
    });

    expect(result.success).toBe(false);
  });

  it('rejects student attendance without section and subject context', () => {
    const result = createAttendanceDto.safeParse({
      type: 'student',
      studentId: 'student_01',
      teacherId: 'teacher_01',
      date: '2026-04-18',
      status: 'present',
    });

    expect(result.success).toBe(false);
  });

  it('parses attendance date filters for MCP callers', () => {
    const result = attendanceDateFilterDto.safeParse({
      date: '2026-04-18',
      type: 'staff',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        date: '2026-04-18',
        type: 'staff',
      });
    }
  });

  it('parses an object-shaped staff roster with simple attendance states', () => {
    const result = upsertStaffAttendanceRosterDto.safeParse({
      items: [{
        staffId: 'staff_01',
        date: '2026-04-18',
        status: 'late',
        notes: null,
      }],
    });

    expect(result.success).toBe(true);
  });

  it('rejects an empty staff roster', () => {
    expect(upsertStaffAttendanceRosterDto.safeParse({ items: [] }).success).toBe(false);
  });
});
