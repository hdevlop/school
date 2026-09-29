import { describe, expect, it } from 'bun:test';
import { AcademicYearValidator } from '../../src/modules/academicYears/AcademicYearValidator';
import { AttendanceService } from '../../src/modules/attendance/AttendanceService';
import { GradeService } from '../../src/modules/grades/GradeService';
import { yearRegistry } from './fixtures/yearRegistry';
import { attendanceValidator } from './fixtures/attendanceValidator';
import { gradeValidator } from './fixtures/gradeValidator';

const oldYear = { id: 'old-year', label: '2026-2027', status: 'closed',
  reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' };
const activeYear = { id: 'active-year', label: '2027-2028', status: 'active',
  reportingStartsOn: '2027-09-01', reportingEndsOn: '2028-08-31' };

describe('record year access', () => {
  it('refuses a teacher an old dated record while allowing an administrator', async () => {
    const years = new AcademicYearValidator(yearRegistry([oldYear, activeYear], { activeAcademicYearId: activeYear.id,
        currentAcademicYear: activeYear.label }) as any);
    await expect(years.resolveRecord(oldYear.id, '2027-08-31', 'teacher')).rejects.toThrow();
    expect((await years.resolveRecord(oldYear.id, '2027-08-31', 'admin'))?.id).toBe(oldYear.id);
    expect((await years.resolveRecord(undefined, '2027-09-01', 'teacher'))?.id).toBe(activeYear.id);
  });

  // A teacher works in the active year only (the year middleware refuses them
  // another), and the year-scoped read does not find an old year's grade there.
  it('does not update a grade the selected year does not hold', async () => {
    let updated = false;
    const grade = new GradeService(
      { update: async () => { updated = true; } } as any,
      { ensureExists: async () => { throw new Error('Grade not found'); } } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await expect(grade.update('grade-1', { feedback: 'changed' },
      { id: 'user-1', role: 'teacher' })).rejects.toThrow('Grade not found');
    expect(updated).toBe(false);
  });

  it('rejects a teacher who submits another teacher for grade creation', async () => {
    let studentChecked = false;
    const grade = new GradeService(
      { teacherIdForUser: async () => 'teacher-1' } as any,
      gradeValidator({ teacherIdForUser: async () => 'teacher-1' }, {
        ensureStudentExists: async () => { studentChecked = true; },
      }),
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await expect(grade.create({ studentId: 'student-1', sectionId: 'section-1',
      teacherId: 'teacher-2', subjectId: 'subject-1', assessmentId: 'assessment-1',
      marksObtained: 10, status: 'graded' }, { id: 'user-1', role: 'teacher' }))
      .rejects.toThrow('A teacher can grade only their own assessment or exam');
    expect(studentChecked).toBe(false);
  });

  it('lets a teacher correct only grades sourced from their own assignment', async () => {
    let updates = 0;
    let sourceTeacherId = 'teacher-2';
    const repository = { teacherIdForUser: async () => 'teacher-1',
      update: async () => { updates++; } };
    const grade = new GradeService(
      repository as any,
      gradeValidator(repository, { ensureExists: async () => ({ id: 'grade-1', academicYearId: activeYear.id,
        assessment: { date: '2027-10-01' }, teacher: { id: sourceTeacherId } }) }),
      {} as any,
      { resolveRecord: async () => activeYear } as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await expect(grade.update('grade-1', { feedback: 'changed' },
      { id: 'user-1', role: 'teacher' })).rejects.toThrow('A teacher can grade only their own assessment or exam');
    expect(updates).toBe(0);
    sourceTeacherId = 'teacher-1';
    await grade.update('grade-1', { feedback: 'changed' }, { id: 'user-1', role: 'teacher' });
    expect(updates).toBe(1);
  });

  it('checks the year before validating an old teacher attendance mark', async () => {
    let validated = false;
    const attendance = new AttendanceService(
      { create: async () => { throw new Error('created'); } } as any,
      attendanceValidator({}, {
        ensureSelectedYear: () => {}, validateStudentAttendance: async () => { validated = true; },
      }),
      { resolveRecord: async () => { throw new Error('Other school years are restricted'); },
        requireLabel: async () => oldYear } as any,
      { listYearContexts: async () => [{ id: 'section-1', academicYear: oldYear.label }] } as any,
    );
    await expect(attendance.mark({ type: 'student', studentId: 'student-1', sectionId: 'section-1',
      date: '2027-08-31', status: 'present' }, { id: 'user-1', role: 'teacher' }))
      .rejects.toThrow('Other school years are restricted');
    expect(validated).toBe(false);
  });

  it('resolves a teacher from the authenticated user for an active section mark', async () => {
    let validatedTeacherId: string | undefined;
    const repository = {
      teacherIdForUser: async (userId: string) => userId === 'user-1' ? 'teacher-1' : null,
      isTeacherInSection: async (teacherId: string, sectionId: string) =>
        teacherId === 'teacher-1' && sectionId === 'section-1',
      getAttendanceMode: async () => 'per_class',
      create: async (row: unknown) => row,
    };
    const attendance = new AttendanceService(
      repository as any,
      attendanceValidator(repository, { ensureSelectedYear: () => {}, validateStudentAttendance: async (_data: unknown, context: any) => {
        validatedTeacherId = context.user.teacherId;
        return 'assignment-1';
      } }),
      { resolveRecord: async () => activeYear, requireLabel: async () => activeYear } as any,
      { listYearContexts: async () => [{ id: 'section-1', academicYear: activeYear.label }] } as any,
    );
    const result = await attendance.mark({ type: 'student', studentId: 'student-1',
      sectionId: 'section-1', date: '2027-09-01', status: 'present' },
      { id: 'user-1', role: 'teacher' });
    expect(validatedTeacherId).toBe('teacher-1');
    expect(result.academicYearId).toBe(activeYear.id);
  });
});
