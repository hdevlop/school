import { describe, expect, it, mock } from 'bun:test';
import { ClassRoutineService } from '../../src/modules/classRoutines/ClassRoutineService';

// A lesson saved without saying who teaches it takes the teacher assigned to
// the section for its subject; a deliberate "no teacher" (null) is kept, and a
// busy assigned teacher leaves the lesson without one instead of refusing it.
function harness({ assigned = 'assignment-ar' as string | null, busy = false } = {}) {
  const validated: Array<string | null | undefined> = [];
  const created = mock(async (row: any) => ({ id: 'entry', ...row }));
  const repository = {
    defaultAssignmentFor: mock(async () => assigned),
    createEntry: created,
  };
  const validator = {
    ensureSchedule: async () => ({ id: 'schedule', sectionId: 'cp-a' }),
    validateEntry: async (_scheduleId: string, data: { teacherAssignmentId?: string | null }) => {
      validated.push(data.teacherAssignmentId);
      if (busy && data.teacherAssignmentId) throw new Error('teacherConflict');
    },
  };
  const service = new ClassRoutineService(repository as never, validator as never);
  return { service, created, validated, repository };
}

const lesson = { dayOfWeek: 'monday', periodId: 'p1', subjectId: 'arabic' } as const;

describe('a new lesson\'s teacher', () => {
  it('takes the section\'s assigned teacher when none is given', async () => {
    const { service, created, repository } = harness();
    await service.addEntry('schedule', { ...lesson } as never);
    expect(repository.defaultAssignmentFor).toHaveBeenCalledWith('cp-a', 'arabic');
    expect(created).toHaveBeenCalledWith(expect.objectContaining({ teacherAssignmentId: 'assignment-ar' }));
  });

  it('keeps a deliberate "no teacher"', async () => {
    const { service, created, repository } = harness();
    await service.addEntry('schedule', { ...lesson, teacherAssignmentId: null } as never);
    expect(repository.defaultAssignmentFor).not.toHaveBeenCalled();
    expect(created).toHaveBeenCalledWith(expect.objectContaining({ teacherAssignmentId: null }));
  });

  it('keeps a chosen teacher', async () => {
    const { service, created } = harness();
    await service.addEntry('schedule', { ...lesson, teacherAssignmentId: 'assignment-other' } as never);
    expect(created).toHaveBeenCalledWith(expect.objectContaining({ teacherAssignmentId: 'assignment-other' }));
  });

  it('saves the lesson without a teacher when the assigned one is busy then', async () => {
    const { service, created, validated } = harness({ busy: true });
    await service.addEntry('schedule', { ...lesson } as never);
    expect(validated).toEqual(['assignment-ar', undefined]);
    expect(created).toHaveBeenCalledTimes(1);
    expect(created).toHaveBeenCalledWith(expect.objectContaining({ teacherAssignmentId: null }));
  });

  it('leaves the lesson without a teacher when nobody is assigned', async () => {
    const { service, created } = harness({ assigned: null });
    await service.addEntry('schedule', { ...lesson } as never);
    expect(created).toHaveBeenCalledWith(expect.objectContaining({ teacherAssignmentId: null }));
  });
});
