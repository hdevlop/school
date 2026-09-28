import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { classes, sections, routineSchedules, routinePeriods, routineEntries } = await import('../../src/database/schema');
const { ClassRepository } = await import('../../src/modules/classes/ClassRepository');
const { SectionRepository } = await import('../../src/modules/sections/SectionRepository');
const { ClassRoutineRepository } = await import('../../src/modules/classRoutines/ClassRoutineRepository');
const { sql } = await import('drizzle-orm');
const rollback = Symbol('rollback');

async function inRolledBackTransaction(run: (tx: typeof db) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await run(tx as unknown as typeof db);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id).sort();
// Placed in 2025-2026: everyone but Aya (S08) and Nour (S10). Omar (S05)
// moved from section A to B on 15 January 2026.
const placed2025 = ['01', '02', '03', '04', '05', '06', '07', '09'].map((n) => `history-student-${n}`);
const years = ['2024', '2025', '2026'];

describe('Classes and sections selected-year repositories on the marked PostgreSQL fixture', () => {
  it("reads each year's classes, and a class's students and counts from that year's placements", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { repo, inYear } = await scopedHistoryRepository(ClassRepository, tx);
      await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
      for (const year of years) {
        expect(ids(await inYear(`history-year-${year}`, () => repo.getAll()))).toEqual([`history-class-${year}`]);
      }
      expect((await inYear('history-year-2025', () => repo.getInSelectedYear('history-class-2025')))?.id)
        .toBe('history-class-2025');
      expect(await inYear('history-year-2026', () => repo.getInSelectedYear('history-class-2025'))).toBeUndefined();
      // Other modules still find any year's class by reference.
      expect((await inYear('history-year-2026', () => repo.getById('history-class-2025')))?.id)
        .toBe('history-class-2025');

      expect(ids(await inYear('history-year-2025', () => repo.getClassStudents('history-class-2025'))))
        .toEqual(placed2025);
      expect(await inYear('history-year-2025', () => repo.getAnalytics('history-class-2025')))
        .toEqual({ totalSections: 2, totalStudents: 8 });

      // The teacher of section A each year sees that year's class only.
      await tx.execute(sql`update staff set user_id = 'history-principal' where id = 'history-staff-teacher'`);
      const teacher = { id: 'history-principal', role: 'teacher' };
      for (const year of years) {
        expect(ids(await inYear(`history-year-${year}`, () => repo.getAll(), teacher))).toEqual([`history-class-${year}`]);
      }
      expect(await inYear('history-year-2025', () => repo.getAll(), { id: 'history-student-01-user', role: 'custom-role' }))
        .toEqual([]);
    });
  });

  it('creates a class in the selected year and changes only that year\'s classes', async () => {
    await inRolledBackTransaction(async (tx) => {
      const { repo, inYear } = await scopedHistoryRepository(ClassRepository, tx);
      const created = await inYear('history-year-2024', () => repo.create({ id: 'history-class-new', name: 'History new', level: 'Middle' }));
      expect(created.academicYear).toBe('2024-2025');
      expect(await inYear('history-year-2025', () => repo.update('history-class-new', { name: 'Wrong year' }))).toBeUndefined();
      expect(await inYear('history-year-2025', () => repo.delete('history-class-new'))).toBeUndefined();
      expect((await inYear('history-year-2024', () => repo.update('history-class-new', { name: 'Corrected' })))?.name)
        .toBe('Corrected');
      expect((await inYear('history-year-2024', () => repo.delete('history-class-new')))?.id).toBe('history-class-new');
      expect(await tx.select().from(classes).where(sql`${classes.id} = 'history-class-new'`)).toEqual([]);
    });
  });

  it("reads each year's sections and their students from that year's placements", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { repo, inYear } = await scopedHistoryRepository(SectionRepository, tx);
      await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
      for (const year of years) {
        expect(ids(await inYear(`history-year-${year}`, () => repo.getAll())))
          .toEqual([`history-section-${year}-a`, `history-section-${year}-b`]);
      }
      expect(await inYear('history-year-2026', () => repo.getInSelectedYear('history-section-2025-b'))).toBeUndefined();
      expect(ids(await inYear('history-year-2025', () => repo.getStudents('history-section-2025-b'))))
        .toEqual(['history-student-05']);
      expect(ids(await inYear('history-year-2025', () => repo.getStudents('history-section-2025-a')))).toEqual(placed2025);
      expect(await inYear('history-year-2025', () => repo.getAnalytics('history-section-2025-b')))
        .toMatchObject({ totalStudents: 1, activeStudents: 1 });

      // A past section has no current students, but its placements still hold it.
      expect(await repo.checkHasStudents('history-section-2024-a')).toBe(true);

      expect(await inYear('history-year-2026', () => repo.update('history-section-2025-b', { roomNumber: '99' })))
        .toBeUndefined();
      expect((await inYear('history-year-2025', () => repo.update('history-section-2025-b', { roomNumber: '12' })))?.roomNumber)
        .toBe('12');
      await tx.insert(sections).values({ id: 'history-section-2025-c', classId: 'history-class-2025', name: 'C' });
      expect(await inYear('history-year-2026', () => repo.delete('history-section-2025-c'))).toBeUndefined();
      expect((await inYear('history-year-2025', () => repo.delete('history-section-2025-c')))?.id).toBe('history-section-2025-c');
    });
  });
});

describe('Class routines selected-year repository on the marked PostgreSQL fixture', () => {
  it("reads, creates and changes only the selected year's timetables", async () => {
    await inRolledBackTransaction(async (tx) => {
      const schedule = (year: string) => ({
        id: `hist-rt-${year}`, sectionId: `history-section-${year}-a`,
        academicYear: `${year}-${Number(year) + 1}`, name: `Routine ${year}`, status: 'published' as const,
      });
      await tx.insert(routineSchedules).values([schedule('2024'), schedule('2025')]);
      for (const year of ['2024', '2025']) {
        await tx.insert(routinePeriods).values({
          id: `hist-rp-${year}`, scheduleId: `hist-rt-${year}`, name: 'P1', startTime: '08:00', endTime: '09:00', sortOrder: 1,
        });
        await tx.insert(routineEntries).values({
          id: `hist-re-${year}`, scheduleId: `hist-rt-${year}`, dayOfWeek: 'monday', periodId: `hist-rp-${year}`,
          teacherAssignmentId: `history-assignment-${year}`,
        });
      }
      const { repo, inYear } = await scopedHistoryRepository(ClassRoutineRepository, tx);
      await expect(repo.list()).rejects.toThrow('Resolved academic year is missing');

      expect(ids(await inYear('history-year-2025', () => repo.list()))).toEqual(['hist-rt-2025']);
      expect(ids(await inYear('history-year-2024', () => repo.list({ sectionId: 'history-section-2024-a' }))))
        .toEqual(['hist-rt-2024']);
      expect(await inYear('history-year-2025', () => repo.list({ sectionId: 'history-section-2024-a' }))).toEqual([]);
      expect(await inYear('history-year-2026', () => repo.getSchedule('hist-rt-2025'))).toBeUndefined();
      expect((await inYear('history-year-2025', () => repo.getPublishedForSection('history-section-2025-a')))?.id)
        .toBe('hist-rt-2025');
      expect(await inYear('history-year-2026', () => repo.getPublishedForSection('history-section-2025-a'))).toBeUndefined();
      expect(await inYear('history-year-2025', () => repo.getTeacherScheduleIdsInSelectedYear('history-teacher')))
        .toEqual(['hist-rt-2025']);
      // The teacher dashboard names its year itself.
      expect(await repo.getTeacherScheduleIds('history-teacher', '2024-2025')).toEqual(['hist-rt-2024']);

      expect(await inYear('history-year-2026', () => repo.updateSchedule('hist-rt-2025', { name: 'Wrong year' })))
        .toBeUndefined();
      expect(await inYear('history-year-2026', () => repo.deleteSchedule('hist-rt-2025'))).toBeUndefined();
      expect((await inYear('history-year-2025', () => repo.updateSchedule('hist-rt-2025', { name: 'Corrected' })))?.name)
        .toBe('Corrected');

      const created = await inYear('history-year-2025', () => repo.createSchedule({
        id: 'hist-rt-new', sectionId: 'history-section-2025-b', name: 'Section B', status: 'draft',
      }));
      expect(created.academicYear).toBe('2025-2026');
    });
    expect(await db.select().from(routineSchedules).where(sql`${routineSchedules.id} like 'hist-rt-%'`)).toEqual([]);
  });
});
