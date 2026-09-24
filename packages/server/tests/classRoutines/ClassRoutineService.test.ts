import { describe, expect, it } from 'bun:test';
import { ClassRoutineService } from '../../src/modules/classRoutines/ClassRoutineService';

const groups = [
  { kind: 'fixed' as const, label: 'التعبير الكتابي' },
  { kind: 'alternative' as const, options: ['مشروع الوحدة', 'الاجتماعيات'] as [string, string] },
];

const build = () => {
  const current = {
    id: 'entry-1', scheduleId: 'schedule-1', dayOfWeek: 'friday' as const, periodId: 'h1',
    teacherAssignmentId: 'assignment-1', roomNumber: null, notes: null,
    contentGroups: groups, version: 3,
  };
  const writes: unknown[] = [];
  const repository = {
    updateEntryIfVersion: async (_id: string, version: number, data: any) => {
      writes.push({ version, data });
      return { ...current, ...data, version: version + 1 };
    },
    deleteEntryIfVersion: async (_id: string, version: number) => {
      writes.push({ deletedAtVersion: version });
      return current;
    },
  };
  const validator = {
    ensureEntry: async () => current,
    ensureSchedule: async () => ({ id: 'schedule-1' }),
    validateEntry: async () => ({}),
  };
  const service = new ClassRoutineService(repository as any, validator as any);
  return { service, writes };
};

describe('routine nested-content updates', () => {
  it('preserves groups on a parent-only update and advances the entry version', async () => {
    const { service, writes } = build();
    const updated = await service.updateEntry('schedule-1', 'entry-1', { roomNumber: 'B2' });
    expect(updated.contentGroups).toEqual(groups);
    expect(updated.version).toBe(4);
    expect(writes).toEqual([{ version: 3, data: { roomNumber: 'B2' } }]);
  });

  it('keeps room inheritance when the override is cleared', async () => {
    const { service, writes } = build();
    await service.updateEntry('schedule-1', 'entry-1', { roomNumber: '' });
    expect(writes).toEqual([{ version: 3, data: { roomNumber: null } }]);
  });

  it('requires the current version for replacing or deleting nested content', async () => {
    const { service, writes } = build();
    await expect(service.updateEntry('schedule-1', 'entry-1', { contentGroups: [] })).rejects.toThrow();
    await expect(service.updateEntry('schedule-1', 'entry-1', { contentGroups: [], expectedVersion: 2 })).rejects.toThrow();
    await expect(service.deleteEntry('schedule-1', 'entry-1')).rejects.toThrow();
    expect(writes).toHaveLength(0);
    await service.deleteEntry('schedule-1', 'entry-1', 3);
    expect(writes).toEqual([{ deletedAtVersion: 3 }]);
  });
});
