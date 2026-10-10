import 'reflect-metadata';
import { expect, mock, test } from 'bun:test';
import { ClassService } from '../../src/modules/classes/ClassService';
import type { ClassRepository } from '../../src/modules/classes/ClassRepository';
import type { ClassValidator } from '../../src/modules/classes/ClassValidator';
import type { SettingsRepository } from '../../src/modules/settings/SettingsRepository';

test('class count reuses the validated selected-year roster and returns zero for a successful empty read', async () => {
  const validate = mock(async (_id: string) => undefined);
  const roster = mock(async (_id: string) => [{ id: 'a' }, { id: 'b' }]);
  const service = new ClassService({ getClassStudents: roster } as unknown as ClassRepository,
    { ensureInSelectedYear: validate } as unknown as ClassValidator, {} as SettingsRepository);
  expect(await service.getStudentCount('selected-class')).toEqual({ count: 2 });
  expect(validate).toHaveBeenCalledWith('selected-class');
  expect(roster).toHaveBeenCalledWith('selected-class');
  roster.mockResolvedValueOnce([]);
  expect(await service.getStudentCount('empty-class')).toEqual({ count: 0 });
});

test('an inaccessible or wrong-year class fails before counting its roster', async () => {
  const roster = mock(async () => []);
  const service = new ClassService({ getClassStudents: roster } as unknown as ClassRepository,
    { ensureInSelectedYear: async () => { throw new Error('Class unavailable in selected scope'); } } as unknown as ClassValidator,
    {} as SettingsRepository);
  await expect(service.getStudentCount('outside-class')).rejects.toThrow('Class unavailable in selected scope');
  expect(roster).not.toHaveBeenCalled();
});
