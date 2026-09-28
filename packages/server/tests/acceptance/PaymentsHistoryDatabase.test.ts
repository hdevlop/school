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
const { payments } = await import('../../src/modules/financial/payments/paymentSchema');
const { paymentAllocations } = await import('../../src/modules/financial/allocations/allocationSchema');
const { PaymentRepository } = await import('../../src/modules/financial/payments/PaymentRepository');
const { AllocationRepository } = await import('../../src/modules/financial/allocations/AllocationRepository');
const rollback = Symbol('rollback');

describe('payment receipt and fee-year portions on the marked PostgreSQL fixture', () => {
  it('shows one mixed receipt in both fee years, keeping cash date and exact portions', async () => {
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        const { repo, inYear } = await scopedHistoryRepository(PaymentRepository, tx);
        const allocations = new AllocationRepository();
        allocations.db = tx;
        const studentId = 'history-student-08';
        const typeId = 'history-payments-db-type';
        const oldFee = 'history-payments-db-old';
        const newFee = 'history-payments-db-new';
        const receiptId = 'history-payments-db-receipt';
        const checkId = 'history-payments-db-pending';
        const oldRevenueBefore = await allocations.getRevenueByAcademicYear('2025-2026');
        const newRevenueBefore = await allocations.getRevenueByAcademicYear('2026-2027');
        const oldSeptemberBefore = (await allocations.getMonthlyRevenue(2026, '2025-2026'))
          .find((row) => row.month === 9)?.total ?? 0;
        await tx.insert(feeTypes).values({ id: typeId, name: 'History payments DB', category: 'tuition',
          amount: '100', paymentType: 'oneTime', status: 'active' });
        await tx.insert(fees).values([
          { id: oldFee, studentId, feeTypeId: typeId, academicYear: '2025-2026',
            effectiveDate: '2025-10-01', baseAmount: '100', grossAmount: '100', netAmount: '100' },
          { id: newFee, studentId, feeTypeId: typeId, academicYear: '2026-2027',
            effectiveDate: '2026-09-01', baseAmount: '100', grossAmount: '100', netAmount: '100' },
        ]);
        await tx.insert(feeInstallments).values([
          { id: 'history-payments-db-old-inst', feeId: oldFee, number: 1, dueDate: '2026-06-01', amount: '100' },
          { id: 'history-payments-db-new-inst', feeId: newFee, number: 1, dueDate: '2026-09-01', amount: '100' },
        ]);
        await tx.insert(payments).values([
          { id: receiptId, studentId, amount: '51.00', paymentDate: '2026-09-10',
            paymentMethod: 'cash', status: 'completed', settledDate: '2026-09-10' },
          { id: checkId, studentId, amount: '15.00', paymentDate: '2026-09-11',
            paymentMethod: 'check', status: 'pending', checkNumber: 'history-payments-db-check',
            checkDueDate: '2026-09-30' },
        ]);
        await tx.insert(paymentAllocations).values([
          { id: 'history-payments-db-old-alloc', paymentId: receiptId, feeId: oldFee,
            installmentId: 'history-payments-db-old-inst', amount: '30.25', type: 'installment' },
          { id: 'history-payments-db-new-alloc', paymentId: receiptId, feeId: newFee,
            installmentId: 'history-payments-db-new-inst', amount: '20.75', type: 'installment' },
          { id: 'history-payments-db-pending-alloc', paymentId: checkId, feeId: oldFee,
            installmentId: 'history-payments-db-old-inst', amount: '15.00', type: 'installment' },
        ]);
        await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
        const oldRows = await inYear('history-year-2025', () => repo.getAll());
        const newRows = await inYear('history-year-2026', () => repo.getAll());
        expect(oldRows.filter((row) => row.id === receiptId)).toHaveLength(1);
        expect(newRows.filter((row) => row.id === receiptId)).toHaveLength(1);
        expect(oldRows.find((row) => row.id === receiptId)?.yearAllocatedAmount).toBe('30.25');
        expect(newRows.find((row) => row.id === receiptId)?.yearAllocatedAmount).toBe('20.75');
        expect(oldRows.find((row) => row.id === receiptId)?.amount).toBe('51.00');
        expect(oldRows.find((row) => row.id === receiptId)?.paymentDate).toBe('2026-09-10');
        expect(newRows.some((row) => row.id === checkId)).toBe(false);
        expect(oldRows.some((row) => row.id === checkId)).toBe(true);
        expect((await inYear('history-year-2026', () => repo.getById(receiptId)))?.id).toBe(receiptId);
        expect(Math.round(((await allocations.getRevenueByAcademicYear('2025-2026')) - oldRevenueBefore) * 100))
          .toBe(3025);
        expect(Math.round(((await allocations.getRevenueByAcademicYear('2026-2027')) - newRevenueBefore) * 100))
          .toBe(2075);
        const oldSeptemberAfter = (await allocations.getMonthlyRevenue(2026, '2025-2026'))
          .find((row) => row.month === 9)?.total ?? 0;
        expect(Math.round((oldSeptemberAfter - oldSeptemberBefore) * 100)).toBe(3025);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });
});
