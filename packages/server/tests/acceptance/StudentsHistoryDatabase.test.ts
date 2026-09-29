import { describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const url = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!url) throw new Error('History fixture env is required');
const target = new URL(url);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') {
  throw new Error('Expected local school_history_test');
}
process.env.DB_URL = url;
const { db } = await import('../../src/database/db');
const { staff } = await import('../../src/database/schema');
const { StudentRepository } = await import('../../src/modules/students/StudentRepository');
const rollback = Symbol('rollback');

describe('students on the marked PostgreSQL history fixture', () => {
  it('reads 7, 8 and 8 annual students, with one transferred student and the selected enrollment status', async () => {
    const { repo, inYear } = await scopedHistoryRepository(StudentRepository, db);
    await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
    for (const [id, expected] of [['history-year-2024', 7], ['history-year-2025', 8], ['history-year-2026', 8]] as const) {
      const rows = await inYear(id, () => repo.getAll());
      expect(rows).toHaveLength(expected);
      expect(new Set(rows.map((row) => row.id)).size).toBe(expected);
      expect((await inYear(id, () => repo.getCount())).count).toBe(expected);
    }
    const old = await inYear('history-year-2025', () => repo.getAll());
    expect(old.find((row) => row.id === 'history-student-05')?.sectionId).toBe('history-section-2025-b');
    expect(old.find((row) => row.id === 'history-student-04')?.status).toBe('graduated');
    expect(old.find((row) => row.id === 'history-student-08')).toBeUndefined();
  });
  it('uses half-open enrollment and placement intervals for transfers and exits', async () => {
    const { repo, inYear } = await scopedHistoryRepository(StudentRepository, db);
    const at = (onDate: string) => inYear('history-year-2025', () => repo.getAll({ onDate }));
    expect((await at('2026-01-14')).find((row) => row.id === 'history-student-05')?.sectionId).toBe('history-section-2025-a');
    expect((await at('2026-01-15')).find((row) => row.id === 'history-student-05')?.sectionId).toBe('history-section-2025-b');
    expect((await at('2026-03-01')).find((row) => row.id === 'history-student-07')).toBeUndefined();
  });
  it('denies an unknown role and confines a student to their own enrolled identity', async () => {
    const { repo, inYear } = await scopedHistoryRepository(StudentRepository, db);
    expect(await inYear('history-year-2026', () => repo.getAll(), { id: 'outsider', role: 'unknown' })).toEqual([]);
    const own = await inYear('history-year-2026', () => repo.getAll(), { id: 'history-student-08-user', role: 'student' });
    expect(own.map((row) => row.id)).toEqual(['history-student-08']);
  });
  it('checks the teacher against the actual annual or dated placement, not the current projection or an earlier placement', async () => {
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        await tx.update(staff).set({ userId: 'history-admin' }).where(eq(staff.id, 'history-staff-teacher'));
        const { repo, inYear } = await scopedHistoryRepository(StudentRepository, tx);
        const actor = { id: 'history-admin', role: 'teacher' };
        const rows = await inYear('history-year-2025', () => repo.getAll(), actor);
        expect(rows.some((row) => row.id === 'history-student-05')).toBe(false);
        expect((await inYear('history-year-2025', () => repo.getCount(), actor)).count).toBe(rows.length);
        const before = await inYear('history-year-2025', () => repo.getAll({ onDate: '2026-01-14' }), actor);
        const after = await inYear('history-year-2025', () => repo.getAll({ onDate: '2026-01-15' }), actor);
        expect(before.some((row) => row.id === 'history-student-05')).toBe(true);
        expect(after.some((row) => row.id === 'history-student-05')).toBe(false);
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
  });
  it('keeps concurrent selected years isolated on one container-resolved repository', async () => {
    const { repo, inYear } = await scopedHistoryRepository(StudentRepository, db);
    const [old, active] = await Promise.all([
      inYear('history-year-2025', async () => { await Bun.sleep(10); return repo.getAll(); }),
      inYear('history-year-2026', () => repo.getAll()),
    ]);
    expect(old.find((row) => row.id === 'history-student-05')?.classId).toBe('history-class-2025');
    expect(active.find((row) => row.id === 'history-student-05')?.classId).toBe('history-class-2026');
  });
});
