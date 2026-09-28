import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { grades } = await import('../../src/modules/grades/gradeSchema');
const { exams } = await import('../../src/modules/exams/examSchema');
const { GradeRepository } = await import('../../src/modules/grades/GradeRepository');
const { sql } = await import('drizzle-orm');
const rollback = Symbol('rollback');

// The fixture's assessments belong to 'history-teacher' (Mathematics, section A
// of each year). Every student stays in section A, except Omar (S05), who moves
// to section B on 15 January 2026.
const grade = (id: string, studentId: string, source: { assessmentId?: string; examId?: string }, yearId: string | null) => ({
  id, studentId, ...source, academicYearId: yearId, marksObtained: '14', status: 'graded' as const,
});
const cases = [
  grade('history-grade-2024', 'history-student-01', { assessmentId: 'history-assessment-2024' }, 'history-year-2024'),
  grade('history-grade-2025-adam', 'history-student-01', { assessmentId: 'history-assessment-2025' }, 'history-year-2025'),
  grade('history-grade-2025-omar', 'history-student-05', { assessmentId: 'history-assessment-2025' }, 'history-year-2025'),
  // No stored year: dated by its source, 10 November 2025.
  grade('history-grade-legacy-2025', 'history-student-01', { assessmentId: 'history-assessment-legacy-2025' }, null),
  // Omar in section B, 10 February 2026.
  grade('history-grade-2025-omar-feb', 'history-student-05', { examId: 'history-grade-exam-feb' }, 'history-year-2025'),
  grade('history-grade-2026', 'history-student-01', { assessmentId: 'history-assessment-2026' }, 'history-year-2026'),
];
const byYear: Record<string, string[]> = {
  'history-year-2024': ['history-grade-2024'],
  'history-year-2025': ['history-grade-2025-adam', 'history-grade-2025-omar', 'history-grade-2025-omar-feb',
    'history-grade-legacy-2025'],
  'history-year-2026': ['history-grade-2026'],
};

// Signs in the fixture teacher, and adds two teachers with no assessment or exam of
// their own: one teaching section B in 2025-2026, one section A in 2026-2027.
async function seedGrades(tx: typeof db) {
  await tx.insert(exams).values({
    id: 'history-grade-exam-feb', teacherAssignmentId: 'history-assignment-2025', academicYearId: 'history-year-2025',
    title: 'February exam', type: 'midterm', date: '2026-02-10', duration: 60, totalMarks: '20', passingMarks: '10',
    sectionIds: ['history-section-2025-a', 'history-section-2025-b'],
  });
  await tx.insert(grades).values(cases);
  await tx.execute(sql`insert into subjects (id, code, name)
    values ('history-subject-arabic', 'HISTORY-ARABIC', 'Arabic')`);
  for (const [key, section, klass] of [
    ['source', null, null],
    ['2025-b', 'history-section-2025-b', 'history-class-2025'],
    ['2026-a', 'history-section-2026-a', 'history-class-2026'],
  ] as const) {
    const userId = `history-grade-teacher-${key}-user`;
    await tx.execute(sql`insert into users (id, name, email, password, status)
      values (${userId}, ${`Teacher ${key}`}, ${`${userId}@history.example.test`}, 'unused-fixture-hash', 'active')`);
    if (!section) {
      await tx.execute(sql`update staff set user_id = ${userId} where id = 'history-staff-teacher'`);
      continue;
    }
    await tx.execute(sql`insert into staff (id, user_id, employee_code, name, role, hire_date)
      values (${`history-grade-staff-${key}`}, ${userId}, ${`HISTORY-GRADE-${key}`}, ${`Teacher ${key}`},
              'teacher', '2024-09-01')`);
    await tx.execute(sql`insert into teachers (id, staff_id)
      values (${`history-grade-teacher-${key}`}, ${`history-grade-staff-${key}`})`);
    await tx.execute(sql`insert into teacher_assignments (id, class_id, section_id, subject_id, teacher_id)
      values (${`history-grade-assignment-${key}`}, ${klass}, ${section}, 'history-subject-arabic',
              ${`history-grade-teacher-${key}`})`);
  }
}

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

describe('Grades selected-year repository on the marked PostgreSQL fixture', () => {
  it('reads each year\'s grades by stored year, else by source date, in lists, filters, detail and counts', async () => {
    await inRolledBackTransaction(async (tx) => {
      await seedGrades(tx);
      const { repo, inYear } = await scopedHistoryRepository(GradeRepository, tx);
      await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
      for (const [yearId, expected] of Object.entries(byYear)) {
        expect(ids(await inYear(yearId, () => repo.getAll()))).toEqual(expected);
        expect((await inYear(yearId, () => repo.getCount())).count).toBe(expected.length);
        for (const id of expected) expect((await inYear(yearId, () => repo.getById(id)))?.id).toBe(id);
      }
      expect(await inYear('history-year-2026', () => repo.getById('history-grade-2025-adam'))).toBeUndefined();
      expect(ids(await inYear('history-year-2025', () => repo.getAll({ studentId: 'history-student-05' }))))
        .toEqual(['history-grade-2025-omar', 'history-grade-2025-omar-feb']);
      expect(ids(await inYear('history-year-2025', () => repo.getByAssessment('history-assessment-2025'))))
        .toEqual(['history-grade-2025-adam', 'history-grade-2025-omar']);
      expect(await inYear('history-year-2026', () => repo.getByAssessment('history-assessment-2025'))).toEqual([]);
    });
  });

  it('shows a teacher the grades of their own sources and of students in a section they taught on the date', async () => {
    await inRolledBackTransaction(async (tx) => {
      await seedGrades(tx);
      const { repo, inYear } = await scopedHistoryRepository(GradeRepository, tx);
      const seen = async (yearId: string, userId: string) =>
        ids(await inYear(yearId, () => repo.getAll(), { id: userId, role: 'teacher' }));

      // The assessments' and exam's own teacher sees every grade of them.
      expect(await seen('history-year-2025', 'history-grade-teacher-source-user')).toEqual(byYear['history-year-2025']);
      // Section B in 2025-2026: Omar's February grade only; in October he sat in A.
      expect(await seen('history-year-2025', 'history-grade-teacher-2025-b-user')).toEqual(['history-grade-2025-omar-feb']);
      // Section A in 2026-2027: this year's grade of Adam, not his earlier years' ones,
      // although section A of 2026-2027 is his current section.
      expect(await seen('history-year-2026', 'history-grade-teacher-2026-a-user')).toEqual(['history-grade-2026']);
      expect(await seen('history-year-2025', 'history-grade-teacher-2026-a-user')).toEqual([]);
      expect(await seen('history-year-2025', 'history-unlinked-user')).toEqual([]);

      // Students and parents keep their own rules.
      expect(ids(await inYear('history-year-2025', () => repo.getAll(), { id: 'history-student-05-user', role: 'student' })))
        .toEqual(['history-grade-2025-omar', 'history-grade-2025-omar-feb']);
    });
  });

  it('limits updates and deletion to the selected year', async () => {
    await inRolledBackTransaction(async (tx) => {
      await seedGrades(tx);
      const { repo, inYear } = await scopedHistoryRepository(GradeRepository, tx);
      expect(await inYear('history-year-2026', () => repo.update('history-grade-2025-adam', { feedback: 'Wrong year' })))
        .toBeUndefined();
      expect(await inYear('history-year-2026', () => repo.delete('history-grade-legacy-2025'))).toBeUndefined();
      expect((await inYear('history-year-2026', () => repo.deleteBulk(['history-grade-2025-adam']))).deletedCount).toBe(0);
      expect((await inYear('history-year-2025', () => repo.update('history-grade-legacy-2025', { feedback: 'Corrected' })))
        ?.feedback).toBe('Corrected');
      expect((await inYear('history-year-2025', () => repo.deleteAll())).deletedCount).toBe(4);
      expect(ids(await tx.select().from(grades))).toEqual(['history-grade-2024', 'history-grade-2026']);
    });
    expect(await db.select().from(grades)).toEqual([]);
  });
});
