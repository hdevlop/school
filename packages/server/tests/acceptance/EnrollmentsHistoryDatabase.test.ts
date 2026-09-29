import { describe, expect, it } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const url = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!url) throw new Error('History fixture env is required');
const target = new URL(url);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') {
  throw new Error('Expected local school_history_test');
}
process.env.DB_URL = url;
const { db } = await import('../../src/database/db');
const { studentEnrollmentPlacements: placements, studentEnrollments: enrollments, students } = await import('../../src/database/schema');
const { StudentEnrollmentRepository } = await import('../../src/modules/studentEnrollments/StudentEnrollmentRepository');
const rollback = Symbol('rollback');
const id = 'history-enrollment-02-2025';

async function transaction(run: (tx: typeof db) => Promise<void>) {
  try { await db.transaction(async (tx) => { await run(tx as unknown as typeof db); throw rollback; }); }
  catch (error) { if (error !== rollback) throw error; }
}

describe('enrollment corrections on the marked PostgreSQL fixture', () => {
  it('scopes ordinary detail to the selected year while retaining explicit cross-year rosters', async () => {
    const { repo, inYear } = await scopedHistoryRepository(StudentEnrollmentRepository, db);
    await expect(repo.getById(id)).rejects.toThrow('Resolved academic year is missing');
    expect(await inYear('history-year-2026', () => repo.getById(id))).toBeNull();
    expect((await inYear('history-year-2025', () => repo.getById(id)))?.id).toBe(id);
    expect(await repo.listAnnualRoster('history-year-2024')).toHaveLength(7);
  });
  it('permits a same-transaction date and section correction with final integrity and no projection change', async () => {
    await transaction(async (tx) => {
      const [before] = await tx.select().from(students).where(eq(students.id, 'history-student-02'));
      await tx.update(placements).set({ sectionId: 'history-section-2025-b', validFrom: '2025-09-02' })
        .where(eq(placements.id, 'history-placement-02-2025-a'));
      await tx.update(enrollments).set({ enrolledOn: '2025-09-02' }).where(eq(enrollments.id, id));
      await tx.execute(sql`SET CONSTRAINTS ALL IMMEDIATE`);
      const [after] = await tx.select().from(students).where(eq(students.id, before.id));
      expect(after).toEqual(before);
    });
  });
  it('rejects a cross-year section and overlapping placements in PostgreSQL', async () => {
    await expect(transaction(async (tx) => {
      await tx.update(placements).set({ sectionId: 'history-section-2026-a' })
        .where(eq(placements.id, 'history-placement-02-2025-a'));
      await tx.execute(sql`SET CONSTRAINTS ALL IMMEDIATE`);
    })).rejects.toThrow();
    await expect(transaction(async (tx) => {
      await tx.update(placements).set({ validTo: '2026-01-16' })
        .where(eq(placements.id, 'history-placement-05-2025-a'));
      await tx.execute(sql`SET CONSTRAINTS ALL IMMEDIATE`);
    })).rejects.toThrow();
  });
  it('detects a correction that strands an attendance record or grade source', async () => {
    await transaction(async (tx) => {
      const { repo, inYear } = await scopedHistoryRepository(StudentEnrollmentRepository, tx);
      expect(await inYear('history-year-2025', () => repo.hasInvalidDatedRecords('history-student-05'))).toBe(false);
      await tx.update(placements).set({ sectionId: 'history-section-2025-b' })
        .where(eq(placements.id, 'history-placement-05-2025-a'));
      expect(await inYear('history-year-2025', () => repo.hasInvalidDatedRecords('history-student-05'))).toBe(true);
    });
  });
});
