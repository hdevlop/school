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
  cycles,
} from '../../src/database/schema';
import { ClassRoutineRepository } from '../../src/modules/classRoutines/ClassRoutineRepository';
import { RolloverRepository } from '../../src/modules/financial/rollover/RolloverRepository';
import { StudentEnrollmentRepository } from '../../src/modules/studentEnrollments/StudentEnrollmentRepository';
import { AcademicYearTransitionRepository } from '../../src/modules/academicYearTransitions/AcademicYearTransitionRepository';
import { AcademicYearMigrationIssueRepository } from '../../src/modules/academicYearMigrationIssues/AcademicYearMigrationIssueRepository';
import { SeedService } from '../../src/modules/seed/SeedService';
import { FeeTypeService } from '../../src/modules/financial/feeTypes/FeeTypeService';
import { feeTypeData } from '@sms/contracts/fixtures';
import legacyServerFeeTypes from '../../src/modules/seed-data/school/feeTypes.json';
import { TeacherRepository } from '../../src/modules/teachers/TeacherRepository';
import { StaffAssignmentRepository } from '../../src/modules/staff/StaffAssignmentRepository';
import { CycleRepository } from '../../src/modules/cycles/CycleRepository';
import { ExamPlanningRepository } from '../../src/modules/examPlanning/ExamPlanningRepository';
import { drizzle } from 'drizzle-orm/pg-proxy';

describe('seed reset foreign-key order', () => {
  it('deletes exam planning across all years without resolving a year or ownership', async () => {
    const queries: string[] = [];
    const repository = new ExamPlanningRepository();
    repository.db = drizzle(async (sql) => {
      queries.push(sql);
      return { rows: [] };
    }) as unknown as typeof repository.db;
    for (const property of ['year', 'ownedWhere']) {
      Object.defineProperty(repository, property, {
        get: () => { throw new Error('Seed cleanup must not resolve request scope'); },
      });
    }

    await repository.clearForSeedReset();

    expect(queries).toEqual(['delete from "exam_planning"']);
  });

  it('clears all cycles without needing a selected year after their dependents are gone', async () => {
    const deleted: unknown[] = [];
    const repository = new CycleRepository();
    repository.db = { delete: async (table: unknown) => { deleted.push(table); } } as unknown as typeof repository.db;

    await repository.clearForSeedReset();

    expect(deleted).toEqual([cycles]);
  });

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
    expect(at('examPlanningRepository.clearForSeedReset')).toBeGreaterThan(-1);
    expect(at('examPlanningRepository.clearForSeedReset')).toBeLessThan(at('academicYears.clearForSeedReset'));
    expect(at('staffService.clearAssignmentsForSeedReset')).toBeGreaterThan(at('teacherService.clearForSeedReset'));
    expect(at('staffService.clearAssignmentsForSeedReset')).toBeLessThan(at('vehicleService.deleteAll'));
    expect(calls.at(-1)).toBe('academicYears.clearForSeedReset');
  });

  it('keeps classes, sections, subjects and fee types', async () => {
    const calls: string[] = [];
    const recorder = new Proxy({}, {
      get: (_service, field) => new Proxy({}, {
        get: (_method, method) => async () => { calls.push(`${String(field)}.${String(method)}`); },
      }),
    });

    await SeedService.prototype.clearAllData.call(recorder);

    expect(calls.filter(call => /^(classService|sectionService|subjectService|feeTypeService)\./.test(call))).toEqual([]);
  });
});

describe('default fee type seed', () => {
  const requestedIds = new Set(['FT00', 'FT01', 'FT02', 'FT03', 'FT09', 'FT10', 'FT11']);
  const requestedTypes = feeTypeData.filter(type => requestedIds.has(type.id));

  function seedHarness(initial: Array<{ id: string; name: string; [key: string]: unknown }> = []) {
    const records = structuredClone(initial);
    const created: Record<string, unknown>[] = [];
    const normalize = (name: string) => name.trim().toLowerCase();
    const service = new FeeTypeService({
      create: async (data: any) => { records.push(data); created.push(data); return data; },
      getAll: async () => records,
    } as any, {
      isExists: async (id: string) => records.some(record => record.id === id),
      isNameExists: async (name: string) => records.some(record => normalize(record.name) === normalize(name)),
      validate: async () => true,
    } as any, {} as any);
    return { service, records, created };
  }

  it('keeps both seed entry points aligned with the seven requested defaults', () => {
    expect(legacyServerFeeTypes).toEqual(feeTypeData);
    expect(requestedTypes).toHaveLength(7);
    expect(requestedTypes.map(type => [type.name, type.amount, type.paymentType])).toEqual([
      ['Frais de scolarité', 1100, 'recurring'],
      ['Frais Inscription', 1100, 'oneTime'],
      ['Frais de transport 2 voyage', 400, 'recurring'],
      ['Frais Restaurant', 400, 'recurring'],
      ['Frais de transport 1 voyage', 300, 'recurring'],
      ['Frais garde entre 17h30-18h00', 200, 'recurring'],
      ['Garde Vendredi', 100, 'recurring'],
    ]);
    for (const type of requestedTypes) {
      expect(Object.keys(type.labels ?? {}).sort()).toEqual(['ar', 'en', 'es', 'fr']);
      expect(type.labels?.fr).toBe(type.name);
    }
  });

  it('adds each missing default once and keeps alias metadata out of stored records', async () => {
    const { service, created, records } = seedHarness();
    expect(await service.seedDemoFeeTypes(feeTypeData as any)).toHaveLength(feeTypeData.length);
    expect(await service.seedDemoFeeTypes(feeTypeData as any)).toEqual([]);
    expect(created).toHaveLength(feeTypeData.length);
    expect(new Set(records.map(record => record.id)).size).toBe(feeTypeData.length);
    expect(created.some(record => 'aliases' in record)).toBe(false);
  });

  it('reuses an existing daily meal in any supported language without changing its price or id', async () => {
    const dailyMeal = feeTypeData.find(type => type.id === 'FT12');
    expect(dailyMeal).toBeDefined();
    for (const name of Object.values(dailyMeal!.labels!)) {
      const existing = [{ id: 'existing-meal', name, amount: 40, status: 'inactive' }];
      const { service, created, records } = seedHarness(existing);
      expect(await service.seedDemoFeeTypes([dailyMeal] as any)).toEqual([]);
      expect(created).toEqual([]);
      expect(records).toEqual(existing);
      expect((await service.resolveSeedFeeTypeIds([dailyMeal] as any)).get('FT12')).toBe('existing-meal');
    }
  });

  it('reuses the seven live French names with different ids without changing their prices', async () => {
    const existing = requestedTypes.map((type, index) => ({ ...type, id: `live-${index}`, amount: 1234, status: 'inactive' }));
    const { service, created, records } = seedHarness(existing);
    expect(await service.seedDemoFeeTypes(requestedTypes as any)).toEqual([]);
    expect(created).toEqual([]);
    expect(records).toEqual(existing);
    const ids = await service.resolveSeedFeeTypeIds(requestedTypes as any);
    expect([...ids.values()]).toEqual(existing.map(record => record.id));
  });

  it('recognizes stable ids, legacy English names and translations without merging distinct services', async () => {
    const existing = [
      { id: 'FT00', name: 'School-specific tuition' },
      { id: 'legacy-registration', name: 'Registration Fee' },
      { id: 'legacy-transport', name: ' transport fee ' },
      { id: 'legacy-cafeteria', name: 'Cafeteria Fee' },
      { id: 'spanish-one-trip', name: 'Cuota de transporte — un trayecto' },
      { id: 'arabic-childcare', name: 'رسوم الحضانة من 17:30 إلى 18:00' },
      { id: 'french-friday', name: 'Garde Vendredi' },
    ];
    const { service, created, records } = seedHarness(existing);
    expect(await service.seedDemoFeeTypes(requestedTypes as any)).toEqual([]);
    expect(created).toEqual([]);
    expect(records).toEqual(existing);
    const ids = await service.resolveSeedFeeTypeIds(requestedTypes as any);
    expect(ids.get('FT09')).toBe('spanish-one-trip');
    expect(ids.get('FT10')).toBe('arabic-childcare');
    const missingOneTrip = seedHarness(existing.filter(record => record.id !== 'spanish-one-trip'));
    await expect(missingOneTrip.service.resolveSeedFeeTypeIds(requestedTypes as any)).rejects.toThrow('was not created');
    expect((await missingOneTrip.service.seedDemoFeeTypes(requestedTypes as any)).map(record => record.id)).toEqual(['FT09']);
  });

  it('keeps a fee type the school already has, by id or by name', async () => {
    const created: string[] = [];
    const service = {
      feeTypeValidator: {
        isExists: async (id: string) => id === 'FT00',
        isNameExists: async (name: string) => name === 'Registration Fee',
        validate: async () => true,
      },
      feeTypeRepository: {
        create: async (data: { id: string }) => { created.push(data.id); return data; },
      },
    };

    const result = await FeeTypeService.prototype.seedDemoFeeTypes.call(service, [
      { id: 'FT00', name: 'Tuition Fee' },
      { id: 'FT01', name: 'Registration Fee' },
      { id: 'FT02', name: 'Transport Fee' },
    ] as any);

    expect(created).toEqual(['FT02']);
    expect(result).toHaveLength(1);
  });
});
