import { describe, expect, it } from 'bun:test';
import {
  routineDuties,
  routineEntries,
  routinePeriods,
  routineSchedules,
  rolloverRunItems,
  rolloverRuns,
} from '../../src/database/schema';
import { ClassRoutineRepository } from '../../src/modules/classRoutines/ClassRoutineRepository';
import { RolloverRepository } from '../../src/modules/financial/rollover/RolloverRepository';

describe('seed reset foreign-key order', () => {
  it('clears routine children before periods, schedules, and sections', async () => {
    const deleted: unknown[] = [];
    const repository = new ClassRoutineRepository();
    repository.db = { delete: async (table: unknown) => { deleted.push(table); } } as unknown as typeof repository.db;

    await repository.clearForSeedReset();

    expect(deleted).toEqual([routineEntries, routineDuties, routinePeriods, routineSchedules]);
  });

  it('clears rollover items before their runs and referenced students or fee types', async () => {
    const deleted: unknown[] = [];
    const repository = new RolloverRepository();
    repository.db = { delete: async (table: unknown) => { deleted.push(table); } } as unknown as typeof repository.db;

    await repository.clearForSeedReset();

    expect(deleted).toEqual([rolloverRunItems, rolloverRuns]);
  });
});
