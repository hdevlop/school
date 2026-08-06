import { describe, expect, it, mock } from 'bun:test';

mock.module('najm-i18n', () => ({
  I18n: () => () => undefined,
  t: (key: string) => key,
}));

const { DisciplineValidator } = await import('@server/modules/discipline/DisciplineValidator');

const makeValidator = (overrides: Record<string, unknown> = {}) => {
  const repository = {
    getById: mock(() => Promise.resolve({ id: 'incident_01', status: 'open', reportedBy: 'teacher_01' })),
    getStudentSnapshot: mock(() => Promise.resolve({ id: 'student_01', status: 'active', classId: 'class_01', sectionId: 'section_01' })),
    isTeacherAssignedToSection: mock(() => Promise.resolve(true)),
    ...overrides,
  };
  const validator = new DisciplineValidator(repository as any);
  (validator as any).t = (key: string) => key;
  return { repository, validator };
};

describe('DisciplineValidator', () => {
  it('rejects a missing or inactive student', async () => {
    const missing = makeValidator({ getStudentSnapshot: mock(() => Promise.resolve(undefined)) }).validator;
    await expect(missing.ensureStudentReady('missing')).rejects.toThrow('studentNotFound');

    const inactive = makeValidator({
      getStudentSnapshot: mock(() => Promise.resolve({ id: 'student_01', status: 'inactive', classId: 'class_01', sectionId: 'section_01' })),
    }).validator;
    await expect(inactive.ensureStudentReady('student_01')).rejects.toThrow('studentInactive');
  });

  it('rejects a student without complete academic placement', async () => {
    const { validator } = makeValidator({
      getStudentSnapshot: mock(() => Promise.resolve({ id: 'student_01', status: 'active', classId: 'class_01', sectionId: null })),
    });
    await expect(validator.ensureStudentReady('student_01')).rejects.toThrow('studentAcademicPlacementRequired');
  });

  it('rejects a teacher who is not assigned to the student section', async () => {
    const { validator } = makeValidator({ isTeacherAssignedToSection: mock(() => Promise.resolve(false)) });
    await expect(validator.ensureTeacherMayReport({ id: 'teacher_01', role: 'teacher' }, 'section_01'))
      .rejects.toThrow('teacherStudentForbidden');
  });

  it('enforces teacher ownership and open status for edits', () => {
    const { validator } = makeValidator();
    expect(() => validator.ensureEditable({ status: 'open', reportedBy: 'teacher_02' }, { id: 'teacher_01', role: 'teacher' }))
      .toThrow('recordForbidden');
    expect(() => validator.ensureEditable({ status: 'resolved', reportedBy: 'teacher_01' }, { id: 'teacher_01', role: 'teacher' }))
      .toThrow('recordNotOpen');
  });

  it('rejects future incident timestamps beyond clock skew tolerance', () => {
    const { validator } = makeValidator();
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    expect(() => validator.ensureIncidentDate(future)).toThrow('futureIncidentDate');
  });

  it('requires resolved status before reopening', () => {
    const { validator } = makeValidator();
    expect(() => validator.ensureResolved({ status: 'open' })).toThrow('recordNotResolved');
  });
});
