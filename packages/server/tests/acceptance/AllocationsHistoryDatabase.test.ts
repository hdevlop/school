import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { fees, feeInstallments } = await import('../../src/modules/financial/fees/feeSchema');
const { payments } = await import('../../src/modules/financial/payments/paymentSchema');
const { paymentAllocations } = await import('../../src/modules/financial/allocations/allocationSchema');
const { AllocationRepository } = await import('../../src/modules/financial/allocations/AllocationRepository');
const rollback = Symbol('rollback');

async function withMixedYearReceipt(run: (tx: typeof db) => Promise<void>) {
  try {
    await db.transaction(async (transaction) => {
      const tx = transaction as unknown as typeof db;
      await tx.insert(fees).values([
        { id: 'history-allocation-fee-2025', studentId: 'history-student-01',
          feeTypeId: 'history-fee-type', academicYear: '2025-2026',
          baseAmount: '100', grossAmount: '100', netAmount: '100' },
        { id: 'history-allocation-fee-2026', studentId: 'history-student-01',
          feeTypeId: 'history-fee-type', academicYear: '2026-2027',
          baseAmount: '100', grossAmount: '100', netAmount: '100' },
      ]);
      await tx.insert(feeInstallments).values([
        { id: 'history-allocation-installment-2025', feeId: 'history-allocation-fee-2025',
          number: 1, dueDate: '2026-06-01', amount: '100' },
        { id: 'history-allocation-installment-2026', feeId: 'history-allocation-fee-2026',
          number: 1, dueDate: '2027-06-01', amount: '100' },
      ]);
      await tx.insert(payments).values({ id: 'history-allocation-mixed-payment',
        studentId: 'history-student-01', amount: '150', paymentDate: '2026-10-01',
        paymentMethod: 'cash', status: 'completed' });
      await tx.insert(paymentAllocations).values([
        { id: 'history-allocation-2025', paymentId: 'history-allocation-mixed-payment',
          feeId: 'history-allocation-fee-2025', installmentId: 'history-allocation-installment-2025',
          amount: '75', type: 'installment' },
        { id: 'history-allocation-2026', paymentId: 'history-allocation-mixed-payment',
          feeId: 'history-allocation-fee-2026', installmentId: 'history-allocation-installment-2026',
          amount: '75', type: 'installment' },
      ]);
      await run(tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

describe('allocation year scope on the marked PostgreSQL fixture', () => {
  it('uses target fee years for each part of a mixed-year receipt', async () => {
    await withMixedYearReceipt(async (tx) => {
      const { repo, inYear } = await scopedHistoryRepository(AllocationRepository, tx);
      const oldId = 'history-allocation-2025';
      const newId = 'history-allocation-2026';
      const paymentId = 'history-allocation-mixed-payment';
      const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id).filter((id) => id.startsWith('history-allocation-'));

      await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
      expect(ids(await inYear('history-year-2025', () => repo.getAll()))).toEqual([oldId]);
      expect(ids(await inYear('history-year-2026', () => repo.getAll()))).toEqual([newId]);
      expect((await inYear('history-year-2025', () => repo.getById(oldId)))?.amount).toBe('75.00');
      expect(await inYear('history-year-2026', () => repo.getById(oldId))).toBeUndefined();
      expect(ids(await inYear('history-year-2025', () => repo.getByPaymentId(paymentId, 'selected')))).toEqual([oldId]);
      expect(ids(await inYear('history-year-2026', () => repo.getByPaymentId(paymentId, 'selected')))).toEqual([newId]);
      expect(ids(await repo.getByPaymentId(paymentId))).toEqual([oldId, newId]);
      expect(ids(await inYear('history-year-2025', () => repo.getByStudentId('history-student-01')))).toEqual([oldId]);
      expect(ids(await inYear('history-year-2026', () => repo.getByStudentId('history-student-01')))).toEqual([newId]);

      expect(await inYear('history-year-2026', () => repo.delete(oldId))).toBeUndefined();
      expect((await inYear('history-year-2025', () => repo.getById(oldId)))?.id).toBe(oldId);
      expect((await inYear('history-year-2025', () => repo.delete(oldId)))?.id).toBe(oldId);
      expect((await inYear('history-year-2026', () => repo.getById(newId)))?.id).toBe(newId);
    });
  });
});
