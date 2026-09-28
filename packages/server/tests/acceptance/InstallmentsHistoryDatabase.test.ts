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
const { fees, feeInstallments } = await import('../../src/modules/financial/fees/feeSchema');
const { InstallmentRepository } = await import('../../src/modules/financial/installments/InstallmentRepository');
const rollback = Symbol('rollback');

describe('installment charged year on the marked PostgreSQL fixture', () => {
  it('scopes ordinary reads and writes while source fee access remains all-year', async () => {
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        const { repo, inYear } = await scopedHistoryRepository(InstallmentRepository, tx);
        const studentId = 'history-student-08';
        const typeId = 'history-installment-db-type';
        const oldFee = 'history-installment-db-old-fee';
        const newFee = 'history-installment-db-new-fee';
        const oldId = 'history-installment-db-old';
        const newId = 'history-installment-db-new';
        await tx.insert(feeTypes).values({ id: typeId, name: 'History installment DB', category: 'tuition',
          amount: '100', paymentType: 'oneTime', status: 'active' });
        await tx.insert(fees).values([
          { id: oldFee, studentId, feeTypeId: typeId, academicYear: '2025-2026',
            effectiveDate: '2025-10-01', baseAmount: '100', grossAmount: '100', netAmount: '100' },
          { id: newFee, studentId, feeTypeId: typeId, academicYear: '2026-2027',
            effectiveDate: '2026-09-01', baseAmount: '100', grossAmount: '100', netAmount: '100' },
        ]);
        await tx.insert(feeInstallments).values([
          { id: oldId, feeId: oldFee, number: 1, dueDate: '2026-06-01', amount: '100' },
          { id: newId, feeId: newFee, number: 1, dueDate: '2026-09-01', amount: '100' },
        ]);
        await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
        expect((await inYear('history-year-2025', () => repo.getAll())).map((row) => row.id)).toContain(oldId);
        expect((await inYear('history-year-2025', () => repo.getAll())).map((row) => row.id)).not.toContain(newId);
        expect((await inYear('history-year-2026', () => repo.getAll())).map((row) => row.id)).toContain(newId);
        expect((await inYear('history-year-2025', () => repo.getByFeeId(oldFee))).map((row) => row.id)).toEqual([oldId]);
        expect(await inYear('history-year-2026', () => repo.getByFeeId(oldFee))).toEqual([]);
        expect((await inYear('history-year-2026', () => repo.getByIdAllYears(oldId)))?.id).toBe(oldId);
        expect(await inYear('history-year-2026', () => repo.getById(oldId))).toBeUndefined();
        expect((await inYear('history-year-2025', () => repo.getOverdue())).map((row) => row.id)).toContain(oldId);
        expect((await inYear('history-year-2026', () => repo.getPaid())).map((row) => row.id)).not.toContain(oldId);
        expect(await inYear('history-year-2026', () => repo.update(oldId, { amount: '80' }))).toBeUndefined();
        expect(await inYear('history-year-2026', () => repo.delete(oldId))).toBeUndefined();
        expect((await inYear('history-year-2025', () => repo.getById(oldId)))?.amount).toBe('100.00');
        expect((await inYear('history-year-2026', () => repo.getByFeeIdAllYears(oldFee))).map((row) => row.id)).toEqual([oldId]);
        const cancelled = await inYear('history-year-2026', () => repo.cancelFutureUnpaidByFeeId(oldFee, '2026-05-01'));
        expect(cancelled.map((row) => row.id)).toEqual([oldId]);
        expect((await inYear('history-year-2025', () => repo.getById(oldId)))?.status).toBe('cancelled');
        const resumed = await inYear('history-year-2026', () => repo.resumeCancelledByFeeId(oldFee, '2026-05-01'));
        expect(resumed.map((row) => row.id)).toEqual([oldId]);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });
});
