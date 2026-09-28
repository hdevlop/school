import { describe, expect, it } from 'bun:test';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { RolloverRepository } = await import('../../src/modules/financial/rollover/RolloverRepository');
const rollback = Symbol('rollback');

describe('rollover source roster on the marked PostgreSQL fixture', () => {
  it('uses the source-year enrollment and placement instead of the current class', async () => {
    try {
      await db.transaction(async (transaction) => {
        const repo = new RolloverRepository();
        repo.db = transaction as unknown as typeof db;
        const source = await repo.getActiveStudents('2025-2026');
        expect(source.map((row) => row.id)).toContain('history-student-01');
        expect(source.map((row) => row.id)).not.toContain('history-student-08');
        const target = await repo.getActiveStudents('2026-2027');
        expect(target.map((row) => row.id)).toContain('history-student-08');
        expect(source.find((row) => row.id === 'history-student-01')?.enrollmentDate)
          .toBe('2025-09-01');
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });
});
