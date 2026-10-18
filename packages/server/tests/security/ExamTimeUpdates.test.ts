import { describe, expect, it } from 'bun:test';
import { ExamValidator } from '../../src/modules/exams/ExamValidator';

function validator() {
  const instance = Object.create(ExamValidator.prototype) as ExamValidator;
  Object.assign(instance, {
    et: (key: string) => key,
    ensureExists: async () => ({ startTime: '09:00:00', endTime: '10:00:00', totalMarks: 20, passingMarks: 10 }),
  });
  return instance;
}

describe('exam partial time updates', () => {
  it('refuses an end at or before the stored start', async () => {
    for (const endTime of ['08:00', '09:00']) {
      await expect(validator().validate({ endTime }, 'owned-exam')).rejects.toThrow('endTimeBeforeStart');
    }
  });

  it('refuses a start at or after the stored end', async () => {
    for (const startTime of ['10:00', '11:00']) {
      await expect(validator().validate({ startTime }, 'owned-exam')).rejects.toThrow('endTimeBeforeStart');
    }
  });

  it('accepts valid single-field edits and an explicitly cleared optional time', async () => {
    await expect(validator().validate({ endTime: '11:00' }, 'owned-exam')).resolves.toEqual({ endTime: '11:00' });
    await expect(validator().validate({ startTime: '08:00' }, 'owned-exam')).resolves.toEqual({ startTime: '08:00' });
    await expect(validator().validate({ endTime: null }, 'owned-exam')).resolves.toEqual({ endTime: null });
    await expect(validator().validate({ title: 'New title' }, 'owned-exam')).resolves.toEqual({ title: 'New title' });
  });

  it('checks both values from the same edit instead of either previous value', async () => {
    await expect(validator().validate({ startTime: '11:00', endTime: '12:00' }, 'owned-exam')).resolves.toBeDefined();
    await expect(validator().validate({ startTime: '11:00', endTime: '10:00' }, 'owned-exam')).rejects.toThrow('endTimeBeforeStart');
  });
});
