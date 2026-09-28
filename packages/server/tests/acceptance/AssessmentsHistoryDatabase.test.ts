import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';
import { historyAssessmentCases, historyYears } from '../academicYears/fixtures/alertsHistoryManifest';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { AssessmentRepository } = await import('../../src/modules/assessments/AssessmentRepository');
const { sql } = await import('drizzle-orm');
const rollback = Symbol('rollback');

describe('Assessments selected-year repository on the marked PostgreSQL fixture', () => {
  it('reads annual and dated legacy rows in lists, detail, filters and counts', async () => {
    const { repo, inYear } = await scopedHistoryRepository(AssessmentRepository, db);
    await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
    await expect(repo.getById('history-assessment-2025')).rejects.toThrow('Resolved academic year is missing');
    for (const year of historyYears) {
      const expected = historyAssessmentCases.filter((item) => item.year === year.label
        || (item.year === null && item.date >= year.start && item.date <= year.end))
        .map((item) => item.id).sort();
      expect((await inYear(year.id, () => repo.getAll())).map((row) => row.id).sort()).toEqual(expected);
      expect((await inYear(year.id, () => repo.getCount())).count).toBe(expected.length);
      expect((await inYear(year.id, () => repo.getAll({ sectionId: `history-section-${year.label.slice(0, 4)}-a` })))
        .map((row) => row.id).sort()).toEqual(expected);
      for (const id of expected) expect((await inYear(year.id, () => repo.getById(id)))?.id).toBe(id);
      expect(await inYear(year.id, () => repo.getById('history-assessment-unresolved'))).toBeUndefined();
    }
    expect(await inYear('history-year-2026', () => repo.getById('history-assessment-2025'))).toBeUndefined();
    expect((await inYear('history-year-2025', () => repo.getByStatus('scheduled'))).length).toBe(2);
    expect((await inYear('history-year-2025', () => repo.getByType('quiz'))).length).toBe(2);
    expect((await inYear('history-year-2025', () => repo.getByTeacherAssignment('history-assignment-2025'))).length).toBe(2);
    expect(await inYear('history-year-2025', () => repo.getAll(), { id: 'history-unlinked-user', role: 'teacher' }))
      .toEqual([]);
  });

  it('stamps creates and limits updates and deletion to the selected year', async () => {
    try {
      await db.transaction(async (tx) => {
        const { repo, inYear } = await scopedHistoryRepository(AssessmentRepository, tx as unknown as typeof db);
        const old = 'history-year-2025';
        const current = 'history-year-2026';
        const id = 'history-assessment-2025';
        expect(await inYear(current, () => repo.update(id, { title: 'Wrong year' }))).toBeUndefined();
        expect(await inYear(current, () => repo.delete(id))).toBeUndefined();
        expect((await inYear(old, () => repo.update(id, { title: 'Corrected assessment' })))?.title)
          .toBe('Corrected assessment');
        const created = await inYear(old, () => repo.create({
          title: 'New past-year assessment', teacherAssignmentId: 'history-assignment-2025',
          type: 'quiz', date: '2025-12-10', totalMarks: '20', passingMarks: '10',
          sectionIds: ['history-section-2025-a'], academicYearId: current,
        }));
        expect(created?.academicYearId).toBe(old);
        expect(await inYear(current, () => repo.getById(created.id))).toBeUndefined();
        expect((await inYear(old, () => repo.deleteAll())).deletedCount).toBe(3);
        expect((await inYear(current, () => repo.getAll())).length).toBe(1);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
    const { repo, inYear } = await scopedHistoryRepository(AssessmentRepository, db);
    expect((await inYear('history-year-2025', () => repo.getAll())).length).toBe(2);
  });

  it('uses dated placement for student and parent ownership after a section transfer', async () => {
    const { repo, inYear } = await scopedHistoryRepository(AssessmentRepository, db);
    const transferred = { id: 'history-student-05-user', role: 'student' };
    expect((await inYear('history-year-2025', () => repo.getAll(), transferred)).map((row) => row.id).sort())
      .toEqual(['history-assessment-2025', 'history-assessment-legacy-2025']);
    expect(await inYear('history-year-2025', () => repo.getAll(),
      { id: 'history-student-08-user', role: 'student' })).toEqual([]);

    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`insert into users (id, name, email, password, status)
          values ('history-assessment-parent-user', 'Parent of Omar',
                  'history-assessment-parent@example.test', 'unused-fixture-hash', 'active')`);
        await tx.execute(sql`insert into parents (id, user_id, name, relationship_type)
          values ('history-assessment-parent', 'history-assessment-parent-user',
                  'Parent of Omar', 'father')`);
        await tx.execute(sql`insert into student_parents (id, student_id, parent_id)
          values ('history-assessment-parent-link', 'history-student-05', 'history-assessment-parent')`);
        const scoped = await scopedHistoryRepository(AssessmentRepository, tx as unknown as typeof db);
        expect((await scoped.inYear('history-year-2025', () => scoped.repo.getAll(),
          { id: 'history-assessment-parent-user', role: 'parent' })).map((row) => row.id).sort())
          .toEqual(['history-assessment-2025', 'history-assessment-legacy-2025']);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });

  it('shows a multi-section assessment to students in either targeted section on its date', async () => {
    try {
      await db.transaction(async (tx) => {
        const { repo, inYear } = await scopedHistoryRepository(AssessmentRepository, tx as unknown as typeof db);
        const created = await inYear('history-year-2025', () => repo.create({
          title: 'Assessment across A and B', teacherAssignmentId: 'history-assignment-2025',
          type: 'quiz', date: '2026-02-10', totalMarks: '20', passingMarks: '10',
          sectionIds: ['history-section-2025-a', 'history-section-2025-b'],
        }));
        expect((await inYear('history-year-2025', () => repo.getById(created.id),
          { id: 'history-student-05-user', role: 'student' }))?.id).toBe(created.id);
        expect((await inYear('history-year-2025', () => repo.getById(created.id),
          { id: 'history-student-01-user', role: 'student' }))?.id).toBe(created.id);
        expect(await inYear('history-year-2025', () => repo.getById(created.id),
          { id: 'history-student-08-user', role: 'student' })).toBeUndefined();
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });
});
