import { describe, expect, it } from 'bun:test';
import { AcademicSourceService } from '../../src/modules/academicSources/AcademicSourceService';
import { createGradeDto, updateGradeDto } from '../../src/modules/grades/GradeDto';
import { GradeService } from '../../src/modules/grades/GradeService';

const year = {
  id: 'year-1', label: '2025-2026', status: 'open',
  reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31',
};

function gradeService(teacherIdForUser = async () => 'teacher-1', ensureSelectedYear = (_yearId: string) => {}) {
  let inserted: Record<string, unknown> | null = null;
  const source = {
    id: 'exam-1', academicYearId: year.id, date: '2025-10-15',
    sectionIds: ['section-1'], assignmentSectionId: 'section-1',
    assignmentClassId: 'class-1', sectionClassId: 'class-1',
    classAcademicYear: year.label, teacherId: 'teacher-1', subjectId: 'subject-1',
  };
  const allowed = async () => {};
  const service = new GradeService(
    { teacherIdForUser, create: async (data: Record<string, unknown>) => { inserted = data; return data; } } as any,
    {
      ensureStudentExists: allowed, ensureSingleGradeSource: allowed,
      ensureExamExists: allowed, ensureNoDuplicateGrade: allowed,
      ensureTeacherAssignmentExists: allowed, ensureSelectedYear,
    } as any,
    {} as any,
    { requireLabel: async () => year } as any,
    { getSourceContext: async () => source } as any,
    new AcademicSourceService(
      {} as any,
      { listYearContexts: async () => [{ id: 'section-1', academicYear: year.label }] } as any,
    ),
    { hasAnyForStudent: async () => true, isPlacedInSectionOnDate: async () => true } as any,
  );
  return { service, inserted: () => inserted };
}

describe('grade write contract', () => {
  it('accepts a minimal create request and derives the only target section', async () => {
    const request = createGradeDto.parse({
      studentId: 'student-1', examId: 'exam-1', marksObtained: 16,
    });
    const { service, inserted } = gradeService();
    await service.create(request, { id: 'admin-1' });
    expect(inserted()).toMatchObject({
      studentId: 'student-1', examId: 'exam-1', academicYearId: year.id,
      marksObtained: 16,
    });
    expect(inserted()).not.toHaveProperty('teacherId');
    expect(inserted()).not.toHaveProperty('subjectId');
    expect(inserted()).not.toHaveProperty('sectionId');
  });

  it("refuses a grade whose source's year is not the selected one, before writing", async () => {
    const { service, inserted } = gradeService(undefined, (yearId) => {
      throw new Error(`Grade source year ${yearId} is not the selected year`);
    });
    await expect(service.create({ studentId: 'student-1', examId: 'exam-1', marksObtained: 16, status: 'graded' },
      { id: 'admin-1' })).rejects.toThrow('Grade source year year-1 is not the selected year');
    expect(inserted()).toBeNull();
  });

  it('rejects client IDs that disagree with the linked source', async () => {
    const { service, inserted } = gradeService();
    await expect(service.create({
      studentId: 'student-1', examId: 'exam-1', teacherId: 'teacher-other',
      marksObtained: 16, status: 'graded',
    }, { id: 'admin-1' })).rejects.toThrow('must match the source assignment');
    expect(inserted()).toBeNull();
  });

  it('checks a teacher against the source when the request omits teacherId', async () => {
    const { service, inserted } = gradeService(async () => 'teacher-other');
    await expect(service.create({
      studentId: 'student-1', examId: 'exam-1', marksObtained: 16, status: 'graded',
    }, { id: 'user-1', role: 'teacher' })).rejects.toThrow('only their own assessment or exam');
    expect(inserted()).toBeNull();
  });

  it('accepts only editable fields in a grade update', () => {
    expect(updateGradeDto.safeParse({ marksObtained: 17, feedback: 'Improved' }).success).toBe(true);
    expect(updateGradeDto.parse({ feedback: 'Improved' })).toEqual({ feedback: 'Improved' });
    expect(updateGradeDto.safeParse({ studentId: 'student-other' }).success).toBe(false);
    expect(updateGradeDto.safeParse({ examId: 'exam-other' }).success).toBe(false);
  });
});
