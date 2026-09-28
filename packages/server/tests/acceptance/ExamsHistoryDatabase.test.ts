import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { exams } = await import('../../src/modules/exams/examSchema');
const { ExamRepository } = await import('../../src/modules/exams/ExamRepository');
const { sql } = await import('drizzle-orm');
const rollback = Symbol('rollback');

// The fixture has one assignment per year, for section A. Every student stays in
// section A, except Omar (S05), who moves to section B on 15 January 2026.
const exam = (id: string, year: string, yearId: string | null, date: string,
  sectionIds = [`history-section-${year}-a`]) => ({
  id, date, sectionIds, academicYearId: yearId,
  teacherAssignmentId: `history-assignment-${year}`, title: `History exam ${id}`,
  type: 'midterm' as const, duration: 60, totalMarks: '20', passingMarks: '10',
});
const cases = [
  exam('history-exam-2024', '2024', 'history-year-2024', '2024-11-10'),
  exam('history-exam-2025-a', '2025', 'history-year-2025', '2025-12-01'),
  // After the transfer: one exam for section A alone, one for both sections.
  exam('history-exam-2025-feb-a', '2025', 'history-year-2025', '2026-02-01'),
  exam('history-exam-2025-feb-ab', '2025', 'history-year-2025', '2026-02-10',
    ['history-section-2025-a', 'history-section-2025-b']),
  // No stored year: dated into 2025-2026.
  exam('history-exam-legacy-2025', '2025', null, '2025-11-20'),
  exam('history-exam-2026', '2026', 'history-year-2026', '2026-10-15'),
];
const byYear: Record<string, string[]> = {
  'history-year-2024': ['history-exam-2024'],
  'history-year-2025': ['history-exam-2025-a', 'history-exam-2025-feb-a', 'history-exam-2025-feb-ab',
    'history-exam-legacy-2025'],
  'history-year-2026': ['history-exam-2026'],
};

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

describe('Exams selected-year repository on the marked PostgreSQL fixture', () => {
  it('reads each year\'s exams by stored year, else by date, in lists, filters, detail and counts', async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.insert(exams).values(cases);
      const { repo, inYear } = await scopedHistoryRepository(ExamRepository, tx);
      await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
      for (const [yearId, expected] of Object.entries(byYear)) {
        expect(ids(await inYear(yearId, () => repo.getAll()))).toEqual(expected);
        expect((await inYear(yearId, () => repo.getCount())).count).toBe(expected.length);
        for (const id of expected) expect((await inYear(yearId, () => repo.getById(id)))?.id).toBe(id);
      }
      expect(await inYear('history-year-2026', () => repo.getById('history-exam-2025-a'))).toBeUndefined();
      expect(ids(await inYear('history-year-2025', () => repo.getAll({ sectionId: 'history-section-2025-b' }))))
        .toEqual(['history-exam-2025-feb-ab']);
      expect(ids(await inYear('history-year-2025', () => repo.getByTeacherAssignment('history-assignment-2025'))))
        .toEqual(byYear['history-year-2025']);
      expect(await inYear('history-year-2025', () => repo.getAll(), { id: 'history-unlinked-user', role: 'teacher' }))
        .toEqual([]);
    });
  });

  it('shows students and parents the exams of the section they were placed in on the exam date', async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.insert(exams).values(cases);
      const { repo, inYear } = await scopedHistoryRepository(ExamRepository, tx);
      const seen = async (yearId: string, actor: { id: string; role: string }) =>
        ids(await inYear(yearId, () => repo.getAll(), actor));

      // Omar was in A for the December and legacy exams, and in B in February:
      // not February's section-A exam, although section A is where he sat in December.
      const omarExams = ['history-exam-2025-a', 'history-exam-2025-feb-ab', 'history-exam-legacy-2025'];
      const omar = { id: 'history-student-05-user', role: 'student' };
      expect(await seen('history-year-2025', omar)).toEqual(omarExams);
      // Adam stayed in A all year.
      const adam = { id: 'history-student-01-user', role: 'student' };
      expect(await seen('history-year-2025', adam)).toEqual(byYear['history-year-2025']);
      expect(await seen('history-year-2024', adam)).toEqual(['history-exam-2024']);
      // Hamza left on 1 March 2026 and Aya has no 2025-2026 enrollment.
      expect(await seen('history-year-2025', { id: 'history-student-08-user', role: 'student' })).toEqual([]);

      await tx.execute(sql`insert into users (id, name, email, password, status)
        values ('history-exam-parent-user', 'Parent of Omar', 'history-exam-parent@example.test',
                'unused-fixture-hash', 'active')`);
      await tx.execute(sql`insert into parents (id, user_id, name, relationship_type)
        values ('history-exam-parent', 'history-exam-parent-user', 'Parent of Omar', 'mother')`);
      await tx.execute(sql`insert into student_parents (id, student_id, parent_id)
        values ('history-exam-parent-link', 'history-student-05', 'history-exam-parent')`);
      const parent = { id: 'history-exam-parent-user', role: 'parent' };
      expect(await seen('history-year-2025', parent)).toEqual(omarExams);
      expect(await inYear('history-year-2025', () => repo.getById('history-exam-2025-feb-a'), parent)).toBeUndefined();
      expect(await seen('history-year-2025', { id: 'history-unlinked-user', role: 'parent' })).toEqual([]);

      // Staff asking for one student's exams get that student's, by the same placement rule.
      expect(ids(await inYear('history-year-2025', () => repo.getForStudent('history-student-05')))).toEqual(omarExams);
      expect(ids(await inYear('history-year-2025', () => repo.getForStudent('history-student-05', '2026-02-05'))))
        .toEqual(['history-exam-2025-feb-ab']);
      expect(await inYear('history-year-2026', () => repo.getForStudent('history-student-07'))).toEqual([]);
    });
  });

  it('stamps creates with the selected year and limits updates and deletion to it', async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.insert(exams).values(cases);
      const { repo, inYear } = await scopedHistoryRepository(ExamRepository, tx);
      const id = 'history-exam-2025-a';
      expect(await inYear('history-year-2026', () => repo.update(id, { title: 'Wrong year' }))).toBeUndefined();
      expect(await inYear('history-year-2026', () => repo.delete(id))).toBeUndefined();
      expect((await inYear('history-year-2026', () => repo.deleteBulk([id]))).deletedCount).toBe(0);
      expect((await inYear('history-year-2025', () => repo.update(id, { title: 'Corrected exam' })))?.title)
        .toBe('Corrected exam');
      const created = await inYear('history-year-2025', () => repo.create({
        ...exam('history-exam-new', '2025', 'history-year-2026', '2025-12-20'),
      }));
      expect(created?.academicYearId).toBe('history-year-2025');
      expect((await inYear('history-year-2025', () => repo.deleteAll())).deletedCount).toBe(5);
      expect(ids(await tx.select().from(exams))).toEqual(['history-exam-2024', 'history-exam-2026']);
    });
    expect(await db.select().from(exams)).toEqual([]);
  });
});
