import { describe, expect, it } from 'bun:test';
import {
  routineDuties,
  routineEntries,
  routinePeriods,
  routineSchedules,
  rolloverRunItems,
  rolloverRuns,
  studentEnrollmentPlacements,
  studentEnrollments,
  academicYearMigrationIssues,
  academicYearTransitionRuns,
} from '../../src/database/schema';
import { ClassRoutineRepository } from '../../src/modules/classRoutines/ClassRoutineRepository';
import { RolloverRepository } from '../../src/modules/financial/rollover/RolloverRepository';
import { StudentEnrollmentRepository } from '../../src/modules/studentEnrollments/StudentEnrollmentRepository';
import { AcademicYearTransitionRepository } from '../../src/modules/academicYearTransitions/AcademicYearTransitionRepository';
import { AcademicYearMigrationIssueRepository } from '../../src/modules/academicYearMigrationIssues/AcademicYearMigrationIssueRepository';
import { SeedService } from '../../src/modules/SeedService';

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

  it('clears placements before enrollments and referenced students', async () => {
    const deleted: unknown[] = [];
    const repository = new StudentEnrollmentRepository();
    repository.db = { delete: async (table: unknown) => { deleted.push(table); } } as unknown as typeof repository.db;

    await repository.clearForSeedReset();

    expect(deleted).toEqual([studentEnrollmentPlacements, studentEnrollments]);
  });

  it('clears the year workflows only from their own tables', async () => {
    for (const [Repository, table] of [
      [AcademicYearTransitionRepository, academicYearTransitionRuns],
      [AcademicYearMigrationIssueRepository, academicYearMigrationIssues],
    ] as const) {
      const deleted: unknown[] = [];
      const repository = new Repository();
      repository.db = { delete: async (value: unknown) => { deleted.push(value); } } as unknown as typeof repository.db;

      await repository.clearForSeedReset();

      expect(deleted).toEqual([table]);
    }
  });

  it('clears the year workflows before enrollments and the year registry last', async () => {
    const calls: string[] = [];
    const recorder = new Proxy({}, {
      get: (_service, field) => new Proxy({}, {
        get: (_method, method) => async () => { calls.push(`${String(field)}.${String(method)}`); },
      }),
    });

    await SeedService.prototype.clearAllData.call(recorder);

    const at = (call: string) => calls.indexOf(call);
    expect(at('yearTransitions.clearForSeedReset')).toBeGreaterThan(-1);
    expect(at('yearTransitions.clearForSeedReset')).toBeLessThan(at('studentEnrollmentService.clearForSeedReset'));
    expect(at('migrationIssues.clearForSeedReset')).toBeGreaterThan(-1);
    expect(at('migrationIssues.clearForSeedReset')).toBeLessThan(at('studentEnrollmentService.clearForSeedReset'));
    expect(calls.at(-1)).toBe('academicYears.clearForSeedReset');
  });
});
