import { describe, expect, it } from 'bun:test';
import { AcademicSourceService } from '../../src/modules/academicSources/AcademicSourceService';
import { academicSourceContextIssue } from '../../src/modules/academicSources/academicSourceContext';
import { GradeService } from '../../src/modules/grades/GradeService';
import { AssessmentService } from '../../src/modules/assessments/AssessmentService';
import { ExamService } from '../../src/modules/exams/ExamService';
import { AssessmentValidator } from '../../src/modules/assessments/AssessmentValidator';
import { ExamValidator } from '../../src/modules/exams/ExamValidator';

const year = {
  id: 'year-1', label: '2025-2026', status: 'open',
  reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31',
};
const source = {
  assignmentSectionId: 'section-1', assignmentClassId: 'class-1',
  sectionClassId: 'class-1', classAcademicYear: year.label,
  sectionIds: ['section-1', 'section-2'],
  teacherId: 'teacher-1', subjectId: 'subject-1',
};
const sections = new Map([
  ['section-1', { id: 'section-1', academicYear: year.label }],
  ['section-2', { id: 'section-2', academicYear: year.label }],
]);

function gradeService(input: {
  years: Record<string, unknown>;
  sections: Record<string, unknown>;
  repository?: Record<string, unknown>;
  validator?: Record<string, unknown>;
  assessments?: Record<string, unknown>;
  exams?: Record<string, unknown>;
  enrollments?: Record<string, unknown>;
}) {
  return new GradeService(
    (input.repository ?? {}) as any,
    (input.validator ?? {}) as any,
    (input.assessments ?? {}) as any,
    input.years as any,
    (input.exams ?? {}) as any,
    new AcademicSourceService(input.years as any, input.sections as any),
    (input.enrollments ?? {}) as any,
  );
}

describe('academic source year context', () => {
  it('accepts a closed historical year by its registered calendar, regardless of present age', async () => {
    const historicalYear = {
      ...year, id: 'year-2000', label: '2000-2001', status: 'closed',
      reportingStartsOn: '2000-09-01', reportingEndsOn: '2001-08-31',
    };
    const sources = new AcademicSourceService(
      { requireLabel: async () => historicalYear } as any,
      { listYearContexts: async () => [{ id: 'section-2000', academicYear: historicalYear.label }] } as any,
    );
    await expect(sources.ensureTargetsValid(['section-2000'], '2000-10-01'))
      .resolves.toMatchObject(historicalYear);
    await expect(sources.ensureTargetsValid(['section-2000'], '2002-10-01'))
      .rejects.toThrow();

    const assessment = new AssessmentValidator(
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    );
    const exam = new ExamValidator(
      {} as any, {} as any, {} as any, {} as any, {} as any,
    );
    await expect(assessment.validate({ date: '2000-10-01' })).resolves.toMatchObject({ date: '2000-10-01' });
    await expect(exam.validate({ date: '2000-10-01' })).resolves.toMatchObject({ date: '2000-10-01' });
  });

  it('rejects mixed-year targets and dates outside the registered year', async () => {
    const validator = { requireLabel: async () => year };
    const service = new AcademicSourceService(validator as any, {
      listYearContexts: async (ids: string[]) => ids.map((id) => ({
        id, academicYear: id === 'section-2' ? '2026-2027' : year.label,
      })),
    } as any);
    await expect(service.ensureTargetsValid(['section-1', 'section-2'], '2025-10-31')).rejects.toThrow();

    const singleYear = new AcademicSourceService(validator as any, {
      listYearContexts: async (ids: string[]) => ids.map((id) => ({ id, academicYear: year.label })),
    } as any);
    await expect(singleYear.ensureTargetsValid(['section-1'], '2026-09-01')).rejects.toThrow();
    await expect(singleYear.ensureTargetsValid(['section-1', 'section-2'], '2025-10-31'))
      .resolves.toMatchObject(year);
  });

  it('rejects source and grade creation in a draft year before placement checks', async () => {
    const draft = { ...year, status: 'draft' };
    const draftYears = { requireLabel: async () => draft };
    const sectionContexts = { listYearContexts: async () => [...sections.values()] };
    await expect(new AcademicSourceService(draftYears as any, sectionContexts as any)
      .ensureTargetsValid(['section-1'], '2025-10-31')).rejects.toThrow();
    const service = gradeService({
      years: draftYears,
      sections: sectionContexts,
      assessments: { getSourceContext: async () => ({ ...source, date: '2025-10-31' }) },
      enrollments: { hasAnyForStudent: async () => { throw new Error('placement should not be checked'); } },
    });
    await expect(service.ensureCreateEligible(
      'student-1', 'section-1', { assessmentId: 'assessment-1' }, 'teacher-1', 'subject-1',
    )).rejects.toThrow();
  });

  it('checks every target section and the primary assignment class', () => {
    expect(academicSourceContextIssue(source, sections, year.label)).toBeNull();
    expect(academicSourceContextIssue(source, new Map([
      ...sections.entries(),
    ].map(([id, value]) => [id, id === 'section-2' ? { ...value, academicYear: '2026-2027' } : value])), year.label))
      .toBe('target-year-mismatch');
    expect(academicSourceContextIssue({ ...source, assignmentClassId: 'class-other' }, sections, year.label))
      .toBe('assignment-class-mismatch');
    expect(academicSourceContextIssue({ ...source, sectionIds: ['section-2'] }, sections, year.label))
      .toBe('assignment-section-not-targeted');
    expect(academicSourceContextIssue({ ...source, sectionIds: ['section-1', 'missing'] }, sections, year.label))
      .toBe('missing-target-section');
  });

  it('uses the source date for a new grade with dated enrollment history', async () => {
    const checkedDates: string[] = [];
    const service = gradeService({
      years: { requireLabel: async () => year },
      sections: { listYearContexts: async () => [...sections.values()] },
      assessments: { getSourceContext: async () => ({ ...source, date: '2025-10-31' }) },
      enrollments: {
        hasAnyForStudent: async () => true,
        isPlacedInSectionOnDate: async (_studentId: string, _sectionId: string, date: string) => {
          checkedDates.push(date);
          return date === '2025-10-31';
        },
      },
    });
    await expect(service.ensureCreateEligible(
      'student-1', 'section-2', { assessmentId: 'assessment-1' }, 'teacher-1', 'subject-1',
    ))
      .resolves.toEqual({ hasDatedEnrollment: true, academicYearId: year.id });
    expect(checkedDates).toEqual(['2025-10-31']);
    await expect(service.ensureCreateEligible(
      'student-1', 'section-other', { assessmentId: 'assessment-1' }, 'teacher-1', 'subject-1',
    ))
      .rejects.toThrow();
    await expect(service.ensureCreateEligible(
      'student-1', 'section-2', { assessmentId: 'assessment-1' }, 'teacher-other', 'subject-1',
    ))
      .rejects.toThrow();
  });

  it('rejects a grade when its stored source year contradicts the source assignment', async () => {
    const service = gradeService({
      years: { requireLabel: async () => year },
      sections: { listYearContexts: async () => [...sections.values()] },
      exams: { getSourceContext: async () => ({ ...source, date: '2025-10-31', academicYearId: 'year-other' }) },
      enrollments: { hasAnyForStudent: async () => false },
    });
    await expect(service.ensureCreateEligible(
      'student-1', 'section-1', { examId: 'exam-1' }, 'teacher-1', 'subject-1',
    )).rejects.toThrow();
  });
});

describe('academic source writes', () => {
  it('checks assessment targets before writing', async () => {
    let writes = 0;
    const service = new AssessmentService(
      { create: async () => { writes++; } } as any,
      {} as any,
      { ensureTargetsValid: async () => { throw new Error('mixed years'); } } as any,
    );
    await expect(service.create({ sectionIds: ['section-1', 'section-2'], date: '2025-10-31' } as any))
      .rejects.toThrow('mixed years');
    expect(writes).toBe(0);
  });

  it('stores the registered year on a new assessment', async () => {
    let inserted: Record<string, unknown> | null = null;
    const service = new AssessmentService(
      {
        getTeacherAssignment: async () => ({ id: 'assignment-1' }),
        create: async (data: Record<string, unknown>) => { inserted = data; return data; },
      } as any,
      { validate: async () => {}, ensureTeacherAssignmentExists: async () => {}, ensureSelectedYear: () => {} } as any,
      { ensureTargetsValid: async () => year } as any,
    );
    await service.create({
      title: 'Term assessment', date: '2025-10-31', sectionIds: ['section-1'],
      teacherId: 'teacher-1', subjectId: 'subject-1',
    } as any);
    expect(inserted).toMatchObject({ academicYearId: year.id, teacherAssignmentId: 'assignment-1' });
  });

  it('protects a graded exam from source date changes', async () => {
    let writes = 0;
    const service = new ExamService(
      { update: async () => { writes++; } } as any,
      {
        ensureExists: async () => ({ date: '2025-10-31', sectionIds: ['section-1'] }),
        ensureNotInUse: async () => { throw new Error('exam has grades'); },
      } as any,
      { ensureTargetsValid: async () => year } as any,
    );
    await expect(service.update('exam-1', { date: '2025-11-01' } as any))
      .rejects.toThrow('exam has grades');
    expect(writes).toBe(0);
  });

  it('allows a graded exam title edit when submitted context is unchanged', async () => {
    let writes = 0;
    const service = new ExamService(
      { update: async () => { writes++; } } as any,
      {
        ensureExists: async () => ({
          date: '2025-10-31', sectionIds: ['section-1'], academicYearId: year.id,
          teacher: { id: 'teacher-1' }, subject: { id: 'subject-1' },
        }),
        ensureNotInUse: async () => { throw new Error('exam has grades'); },
        validate: async () => {},
      } as any,
      { ensureTargetsValid: async () => year } as any,
    );
    await service.update('exam-1', {
      title: 'Revised title', date: '2025-10-31', sectionIds: ['section-1'],
      teacherId: 'teacher-1', subjectId: 'subject-1',
    } as any);
    expect(writes).toBe(1);
  });

  it('stores the source year on a new grade', async () => {
    let inserted: Record<string, unknown> | null = null;
    const allowed = async () => {};
    const service = gradeService({
      repository: { create: async (data: Record<string, unknown>) => { inserted = data; return data; } },
      validator: {
        ensureStudentExists: allowed, ensureSingleGradeSource: allowed,
        ensureAssessmentExists: allowed, ensureTeacherExists: allowed,
        ensureSectionExists: allowed, ensureSubjectExists: allowed,
        ensureGradeSourceOrTeacherProvided: allowed, ensureNoDuplicateGrade: allowed,
        ensureTeacherInSection: allowed, ensureTeacherAssignmentExists: allowed,
        ensureSelectedYear: () => {},
      },
      years: { requireLabel: async () => year },
      sections: { listYearContexts: async () => [...sections.values()] },
      assessments: { getSourceContext: async () => ({ ...source, date: '2025-10-31' }) },
      enrollments: { hasAnyForStudent: async () => true, isPlacedInSectionOnDate: async () => true },
    });
    await service.create({
      studentId: 'student-1', assessmentId: 'assessment-1', sectionId: 'section-1',
      subjectId: 'subject-1', teacherId: 'teacher-1', marksObtained: 12,
    } as any, { id: 'admin-1' });
    expect(inserted).toMatchObject({ academicYearId: year.id, studentId: 'student-1' });
  });
});
