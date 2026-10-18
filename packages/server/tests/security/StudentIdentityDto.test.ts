import { describe, expect, it } from 'bun:test';
import { createStudentDto, updateStudentDto } from '../../src/modules/students/StudentDto';

const student = {
  name: 'Adam El Idrissi', studentCode: 'S-001', gender: 'M',
  classId: 'class-one', sectionId: 'section-one',
  enrollmentDate: '2026-10-01', yearEnrolledOn: '2026-10-01',
};

describe('student code identity', () => {
  it('refuses blank codes at both creation and profile update boundaries', () => {
    for (const studentCode of ['', ' ', '\t\n']) {
      expect(createStudentDto.safeParse({ ...student, studentCode }).success).toBe(false);
      expect(updateStudentDto.safeParse({ studentCode }).success).toBe(false);
    }
  });

  it('normalizes padding before uniqueness checks without requiring a code on unrelated edits', () => {
    expect(createStudentDto.parse({ ...student, studentCode: ' S-001 ' }).studentCode).toBe('S-001');
    expect(updateStudentDto.parse({ studentCode: ' S-001 ' }).studentCode).toBe('S-001');
    expect(updateStudentDto.parse({ name: 'Adam El Idrissi Saidi' })).toEqual({ name: 'Adam El Idrissi Saidi' });
  });
});
