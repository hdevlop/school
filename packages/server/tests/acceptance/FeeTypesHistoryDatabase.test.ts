import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { feeTypes } = await import('../../src/modules/financial/feeTypes/feeTypeSchema');
const { FeeTypeRepository } = await import('../../src/modules/financial/feeTypes/FeeTypeRepository');
const rollback = Symbol('rollback');

describe('fee type shared catalog on the marked PostgreSQL fixture', () => {
  it('keeps identity and filters global under different selected years', async () => {
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        const { repo, inYear } = await scopedHistoryRepository(FeeTypeRepository, tx);
        const id = 'history-fee-type-db';
        const name = 'History shared fee type DB';
        const countBefore = await repo.getCount();
        await tx.insert(feeTypes).values({ id, name, category: 'tuition', amount: '120',
          paymentType: 'oneTime', status: 'active' });
        const old = await inYear('history-year-2025', () => repo.getById(id));
        const current = await inYear('history-year-2026', () => repo.getById(id));
        expect(old?.id).toBe(id);
        expect(current?.id).toBe(id);
        expect((await inYear('history-year-2024', () => repo.getAll())).map((row) => row.id))
          .toContain(id);
        expect((await inYear('history-year-2025', () => repo.getByName(name)))?.id).toBe(id);
        expect((await inYear('history-year-2026', () => repo.getByStatus('active')))
          .map((row) => row.id)).toContain(id);
        expect((await inYear('history-year-2024', () => repo.getByCategory('tuition')))
          .map((row) => row.id)).toContain(id);
        expect(await inYear('history-year-2025', () => repo.getCount())).toBe(countBefore + 1);
        expect(await inYear('history-year-2026', () => repo.getCount())).toBe(countBefore + 1);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });
});
