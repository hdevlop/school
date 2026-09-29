import { describe, expect, it } from 'bun:test';
import {
  routineDuties,
  routineEntries,
  routinePeriods,
  routineSchedules,
  rolloverRunItems,
  rolloverRuns,
  cleanerAssignments,
  securityAssignments,
  assistantAssignments,
  accountantAssignments,
  busAssistantAssignments,
  staffCredentials,
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
import { SeedService } from '../../src/modules/seed/SeedService';
import { TeacherRepository } from '../../src/modules/teachers/TeacherRepository';
import { StaffAssignmentRepository } from '../../src/modules/staff/StaffAssignmentRepository';
import { drizzle } from 'drizzle-orm/pg-proxy';

describe('seed reset foreign-key order', () => {
  it('clears teachers and their linked accounts without a selected academic year', async () => {
    const queries: { sql: string; params: unknown[] }[] = [];
    const repository = new TeacherRepository();
    repository.db = drizzle(async (sql, params) => {
      queries.push({ sql, params });
      if (sql.startsWith('select ')) {
        return { rows: [['teacher-account-old'], ['teacher-account-current'], [null]] };
      }
      if (sql.startsWith('delete from "teachers"')) {
        return { rows: [
          ['old-teacher', null, null, null, 'old-staff', null, null],
          ['current-teacher', null, null, null, 'current-staff', null, null],
          ['unlinked-teacher', null, null, null, 'unlinked-staff', null, null],
        ] };
      }
      return { rows: [] };
    }) as unknown as typeof repository.db;
    Object.defineProperty(repository, 'year', {
      get: () => { throw new Error('Resolved academic year is missing from the current operation'); },
    });

    const result = await repository.deleteAll();

    expect(result.deletedCount).toBe(3);
    expect(result.deletedTeachers.map((teacher) => teacher.id))
      .toEqual(['old-teacher', 'current-teacher', 'unlinked-teacher']);
    expect(queries).toHaveLength(3);
    expect(queries[0].sql).not.toContain('teacher_assignments');
    expect(queries[1].sql).toStartWith('delete from "teachers"');
    expect(queries[2].sql).toStartWith('delete from "users"');
    expect(queries[2].params).toEqual(['teacher-account-old', 'teacher-account-current']);
  });

  it('clears staff role links and credentials before their referenced records', async () => {
    const deleted: unknown[] = [];
    const repository = new StaffAssignmentRepository();
    repository.db = { delete: async (table: unknown) => { deleted.push(table); } } as unknown as typeof repository.db;

    await repository.clearForSeedReset();

    expect(deleted).toEqual([
      cleanerAssignments, securityAssignments, assistantAssignments,
      accountantAssignments, busAssistantAssignments, staffCredentials,
    ]);
  });

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
    expect(at('staffService.clearAssignmentsForSeedReset')).toBeGreaterThan(at('teacherService.clearForSeedReset'));
    expect(at('staffService.clearAssignmentsForSeedReset')).toBeLessThan(at('vehicleService.deleteAll'));
    expect(calls.at(-1)).toBe('academicYears.clearForSeedReset');
  });
});
