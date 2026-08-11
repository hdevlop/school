import { describe, expect, it, mock } from 'bun:test';

// mock.module is process-global, so a partial stub here also reaches every later
// test file. najm-auth imports I18nService from this module, so the real exports
// have to survive; only the two used below are replaced.
const najmI18n = await import('najm-i18n');

mock.module('najm-i18n', () => ({
  ...najmI18n,
  I18n: () => () => undefined,
  t: (key: string) => key,
}));

const { BehaviorRewardValidator, isBehaviorRewardDateInFuture } = await import(
  '@server/modules/behaviorRewards/BehaviorRewardValidator'
);

const makeValidator = (overrides: Record<string, unknown> = {}) => {
  const repository = {
    getById: mock(() => Promise.resolve({ id: 'reward_01', awardedBy: 'teacher_01' })),
    getStudentAcademicContext: mock(() => Promise.resolve({
      id: 'student_01', status: 'active', classId: 'class_01', sectionId: 'section_01',
    })),
    isTeacherAssignedToStudent: mock(() => Promise.resolve(true)),
    ...overrides,
  };
  const validator = new BehaviorRewardValidator(repository as any);
  (validator as any).bt = (key: string) => key;
  return { repository, validator };
};

describe('BehaviorRewardValidator', () => {
  it('rejects a missing or inactive student', async () => {
    const missing = makeValidator({
      getStudentAcademicContext: mock(() => Promise.resolve(undefined)),
    }).validator;
    await expect(missing.ensureStudentEligible('missing', { id: 'admin_01', role: 'admin' }))
      .rejects.toThrow('studentNotFound');

    const inactive = makeValidator({
      getStudentAcademicContext: mock(() => Promise.resolve({
        id: 'student_01', status: 'inactive', classId: 'class_01', sectionId: 'section_01',
      })),
    }).validator;
    await expect(inactive.ensureStudentEligible('student_01', { id: 'admin_01', role: 'admin' }))
      .rejects.toThrow('studentInactive');
  });

  it('rejects a student without complete academic placement', async () => {
    const { validator } = makeValidator({
      getStudentAcademicContext: mock(() => Promise.resolve({
        id: 'student_01', status: 'active', classId: 'class_01', sectionId: null,
      })),
    });
    await expect(validator.ensureStudentEligible('student_01', { id: 'admin_01', role: 'admin' }))
      .rejects.toThrow('studentAcademicContextMissing');
  });

  it('rejects a teacher who is not assigned to the student', async () => {
    const { validator } = makeValidator({
      isTeacherAssignedToStudent: mock(() => Promise.resolve(false)),
    });
    await expect(validator.ensureStudentEligible('student_01', { id: 'teacher_01', role: 'teacher' }))
      .rejects.toThrow('studentNotAssigned');
  });

  it('allows teachers to update only records they awarded', () => {
    const { validator } = makeValidator();
    expect(() => validator.ensureTeacherOwns(
      { awardedBy: 'teacher_02' }, { id: 'teacher_01', role: 'teacher' },
    )).toThrow('notOwner');
    expect(() => validator.ensureTeacherOwns(
      { awardedBy: 'teacher_01' }, { id: 'teacher_01', role: 'teacher' },
    )).not.toThrow();
  });

  it('allows only administrators to delete', () => {
    const { validator } = makeValidator();
    expect(() => validator.ensureAdmin({ id: 'teacher_01', role: 'teacher' }))
      .toThrow('deleteAdminOnly');
    expect(() => validator.ensureAdmin({ id: 'admin_01', role: 'admin' })).not.toThrow();
  });

  it('rejects unsupported student and parent actors', async () => {
    const { validator } = makeValidator();
    await expect(validator.ensureStudentEligible('student_01', { id: 'student_01', role: 'student' }))
      .rejects.toThrow('forbidden');
  });

  it('accepts clock skew and rejects dates beyond it', () => {
    const now = new Date('2026-07-13T10:00:00.000Z');
    expect(isBehaviorRewardDateInFuture('2026-07-13T10:05:00.000Z', now)).toBe(false);
    expect(isBehaviorRewardDateInFuture('2026-07-13T10:05:01.000Z', now)).toBe(true);

    const { validator } = makeValidator();
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    expect(() => validator.ensureBehaviorDate(future)).toThrow('futureBehaviorDate');
  });
});
