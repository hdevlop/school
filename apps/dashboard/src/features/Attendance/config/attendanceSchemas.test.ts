import { describe, expect, it } from 'bun:test';
import { ATTENDANCE_STATUS_VALUES } from '@sms/contracts';

import { attendanceSchema } from './attendanceSchemas';

const valid = {
  studentId: 'st1',
  teacherId: 'tch1',
  subjectId: 'sub1',
  sectionId: 'sec1',
  date: '2026-01-05',
};

describe('attendanceSchema', () => {
  it('marks a student present unless told otherwise', () => {
    expect(attendanceSchema.parse(valid).status).toBe('present');
  });

  it('accepts every status the register can record', () => {
    for (const status of ATTENDANCE_STATUS_VALUES) {
      expect(attendanceSchema.safeParse({ ...valid, status }).success).toBe(true);
    }
    expect(attendanceSchema.safeParse({ ...valid, status: 'excused' }).success).toBe(false);
  });

  it('needs every party to the record', () => {
    for (const field of ['studentId', 'teacherId', 'subjectId', 'sectionId'] as const) {
      expect(attendanceSchema.safeParse({ ...valid, [field]: '' }).success).toBe(false);
    }
  });
});
