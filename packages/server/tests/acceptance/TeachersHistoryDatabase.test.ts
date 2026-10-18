import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { TeacherRepository } = await import('../../src/modules/teachers/TeacherRepository');
const rollback = Symbol('rollback');

async function rolledBack(run: (tx: typeof db) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await run(tx as unknown as typeof db);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

describe('teacher identity and assignment years on the marked PostgreSQL fixture', () => {
  it('clears teachers and only their linked users without resolving a year, then rolls back', async () => {
    const { teachers, staff, users, routineEntries, attendance, grades, assessments, exams } =
      await import('../../src/database/schema');
    const { eq } = await import('drizzle-orm');
    await rolledBack(async (tx) => {
      const { repo } = await scopedHistoryRepository(TeacherRepository, tx);
      // The reset clears assignment dependants before it reaches Teachers.
      for (const table of [routineEntries, attendance, grades, assessments, exams]) {
        await tx.delete(table);
      }
      const before = await tx.select({ id: teachers.id, userId: staff.userId }).from(teachers)
        .innerJoin(staff, eq(teachers.staffId, staff.id));
      expect(before.length).toBeGreaterThan(0);
      const teacherUserIds = new Set(before.map((teacher) => teacher.userId).filter(Boolean));
      const unrelatedUserIds = (await tx.select({ id: users.id }).from(users))
        .map((user) => user.id).filter((id) => !teacherUserIds.has(id)).sort();

      const result = await repo.deleteAll();

      expect(result.deletedCount).toBe(before.length);
      expect(await tx.select({ id: teachers.id }).from(teachers)).toEqual([]);
      expect((await tx.select({ id: users.id }).from(users)).map((user) => user.id).sort())
        .toEqual(unrelatedUserIds);
    });
  });

  it('keeps identity shared and returns only selected-year assignments and rosters', async () => {
    await rolledBack(async (tx) => {
      const { repo, inYear } = await scopedHistoryRepository(TeacherRepository, tx);
      await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
      for (const year of ['2024', '2025', '2026']) {
        const teacher = await inYear(`history-year-${year}`, () => repo.getById('history-teacher'));
        expect(teacher?.id).toBe('history-teacher');
        expect(teacher?.assignments).toHaveLength(1);
        expect(teacher?.assignments[0]?.classId).toBe(`history-class-${year}`);
        expect((await inYear(`history-year-${year}`, () => repo.getClasses('history-teacher')))
          .map((row) => row.id)).toEqual([`history-class-${year}`]);
        expect((await inYear(`history-year-${year}`, () => repo.getStudents('history-teacher'))).length)
          .toBeGreaterThan(0);
      }
      expect(await inYear('history-year-2025', () => repo.getById('history-teacher'),
        { id: 'history-student-01-user', role: 'student' })).toBeNull();
    });
  });

  it('cannot read or remove another year assignment through the selected year', async () => {
    await rolledBack(async (tx) => {
      const { repo, inYear } = await scopedHistoryRepository(TeacherRepository, tx);
      expect(await inYear('history-year-2026', () => repo.getTeacherAssignmentById('history-assignment-2025')))
        .toBeUndefined();
      expect(await inYear('history-year-2026', () => repo.findAssignment(
        'history-teacher', 'history-section-2025-a', 'history-subject-math'))).toBeUndefined();
      expect(await inYear('history-year-2026', () => repo.deleteAssignment(
        'history-teacher', 'history-section-2025-a', 'history-subject-math'))).toBeUndefined();
      expect(await inYear('history-year-2026', () => repo.deleteAssignmentsForClass(
        'history-teacher', 'history-class-2025'))).toEqual([]);
      expect((await inYear('history-year-2025', () => repo.getTeacherAssignmentById('history-assignment-2025')))?.id)
        .toBe('history-assignment-2025');
    });
  });

  it('round-trips different subjects in the same class without inventing assignments', async () => {
    const { sections, subjects, teacherAssignments } = await import('../../src/database/schema');
    const { TeacherService } = await import('../../src/modules/teachers/TeacherService');
    await rolledBack(async (tx) => {
      const { repo, inYear } = await scopedHistoryRepository(TeacherRepository, tx);
      await tx.insert(sections).values({
        id: 'history-pair-section', name: 'Pair regression', classId: 'history-class-2026',
      });
      await tx.insert(subjects).values({
        id: 'history-pair-subject', code: 'PAIR-REGRESSION', name: 'Pair regression',
      });
      await tx.insert(teacherAssignments).values({
        id: 'history-pair-assignment', teacherId: 'history-teacher',
        classId: 'history-class-2026', sectionId: 'history-pair-section', subjectId: 'history-pair-subject',
      });

      await inYear('history-year-2026', async () => {
        const pairs = (rows: Awaited<ReturnType<typeof repo.getClasses>>) =>
          rows.map((row) => `${row.id}/${row.section.id}/${row.subject.id}`).sort();
        const before = pairs(await repo.getClasses('history-teacher'));
        expect(before.length).toBeGreaterThan(1);
        const teacher = await repo.getById('history-teacher');
        const expanded = teacher!.assignments.flatMap((line) => line.sectionIds.flatMap((sectionId) =>
          line.subjectIds.map((subjectId) => `${line.classId}/${sectionId}/${subjectId}`))).sort();
        expect(expanded).toEqual(before);

        // Exercise the exact list the browser resubmits through the real
        // repository-backed replacement operation, not a mocked SQL result.
        const replace = (TeacherService.prototype as any).replaceTeacherAssignments;
        await replace.call({ teacherRepository: repo }, 'history-teacher', teacher!.assignments);
        expect(pairs(await repo.getClasses('history-teacher'))).toEqual(before);
      });
    });
  });
});
