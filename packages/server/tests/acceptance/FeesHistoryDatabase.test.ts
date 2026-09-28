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
const { FeeRepository } = await import('../../src/modules/financial/fees/FeeRepository');
const rollback = Symbol('rollback');

describe('fee year scope on the marked PostgreSQL fixture', () => {
  it('keeps charged-year rows, fee-only students and completed cross-year allocations exact', async () => {
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        const { repo, inYear } = await scopedHistoryRepository(FeeRepository, tx);
        const feeTypeId = 'history-fee-db-type';
        const oldId = 'history-fee-db-old';
        const currentId = 'history-fee-db-current';
        const studentId = 'history-student-08'; // No 2025-2026 enrollment.
        const oldBefore = await inYear('history-year-2025', () => repo.getAll(studentId));
        const currentBefore = await inYear('history-year-2026', () => repo.getAll(studentId));
        const allBefore = (await repo.getAllYears()).find((row) => row.student.id === studentId)!;
        const oldOverdueBefore = await inYear('history-year-2025', () => repo.getOverdueSummary());

        await tx.insert(feeTypes).values({ id: feeTypeId, name: 'History fee DB', category: 'tuition',
          amount: '100', paymentType: 'oneTime', status: 'active' });
        await tx.insert(fees).values([
          { id: oldId, studentId, feeTypeId, academicYear: '2025-2026', effectiveDate: '2025-10-01',
            baseAmount: '100', grossAmount: '100', netAmount: '100' },
          { id: currentId, studentId, feeTypeId, academicYear: '2026-2027', effectiveDate: '2026-09-01',
            baseAmount: '100', grossAmount: '100', netAmount: '100' },
        ]);
        await tx.insert(feeInstallments).values([
          { id: 'history-fee-db-old-inst', feeId: oldId, number: 1, dueDate: '2026-06-01', amount: '100' },
          { id: 'history-fee-db-current-inst', feeId: currentId, number: 1, dueDate: '2026-09-01', amount: '100' },
        ]);
        await tx.insert(payments).values({ id: 'history-fee-db-receipt', studentId, amount: '50',
          paymentDate: '2026-09-10', paymentMethod: 'cash', status: 'completed' });
        await tx.insert(paymentAllocations).values([
          { id: 'history-fee-db-old-allocation', paymentId: 'history-fee-db-receipt', feeId: oldId,
            installmentId: 'history-fee-db-old-inst', amount: '30', type: 'installment' },
          { id: 'history-fee-db-current-allocation', paymentId: 'history-fee-db-receipt', feeId: currentId,
            installmentId: 'history-fee-db-current-inst', amount: '20', type: 'installment' },
        ]);

        await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
        const old = (await inYear('history-year-2025', () => repo.getAll(studentId)))[0];
        const current = (await inYear('history-year-2026', () => repo.getAll(studentId)))[0];
        expect(old.enrollmentId).toBeNull();
        expect(old.class.id).toBeNull();
        expect(old.fees.map((fee) => fee.id)).toContain(oldId);
        expect(old.fees.map((fee) => fee.id)).not.toContain(currentId);
        expect(current.fees.map((fee) => fee.id)).toContain(currentId);
        expect(current.fees.map((fee) => fee.id)).not.toContain(oldId);
        expect(Number(old.totalPaid) - Number(oldBefore[0]?.totalPaid ?? 0)).toBe(30);
        expect(Number(current.totalPaid) - Number(currentBefore[0]?.totalPaid ?? 0)).toBe(20);
        const allAfter = (await repo.getAllYears()).find((row) => row.student.id === studentId)!;
        expect(Number(allAfter.totalPaid) - Number(allBefore.totalPaid)).toBe(50);
        expect(Number(allAfter.totalDue) - Number(allBefore.totalDue)).toBe(150);
        expect(Number((await repo.getByStudentAllYears(studentId))?.summary.totalPaid)
          - Number(allBefore.totalPaid)).toBe(50);
        expect((await inYear('history-year-2025', () => repo.getByStudent(studentId)))?.fees
          .map((fee) => fee.id)).toContain(oldId);
        expect((await inYear('history-year-2026', () => repo.getByStudent(studentId)))?.fees
          .map((fee) => fee.id)).not.toContain(oldId);
        expect((await inYear('history-year-2025', () => repo.getById(oldId)))?.id).toBe(oldId);
        expect(await inYear('history-year-2026', () => repo.getById(oldId))).toBeNull();
        expect((await inYear('history-year-2026', () => repo.getByIdAllYears(oldId)))?.id).toBe(oldId);
        expect((await inYear('history-year-2025', () => repo.getByIds([oldId, currentId])))
          .map((fee) => fee.id)).toEqual([oldId]);
        expect((await inYear('history-year-2025', () => repo.getOverdue()))
          .map((fee) => fee.id)).toContain(oldId);
        const oldOverdueAfter = await inYear('history-year-2025', () => repo.getOverdueSummary());
        expect(oldOverdueAfter.overdueCount - oldOverdueBefore.overdueCount).toBe(1);
        expect(Number(oldOverdueAfter.overdueAmount) - Number(oldOverdueBefore.overdueAmount)).toBe(70);
        expect(await inYear('history-year-2026', () => repo.update(oldId, { notes: 'wrong year' })))
          .toBeUndefined();
        expect(await inYear('history-year-2026', () => repo.delete(oldId))).toBeUndefined();
        expect((await inYear('history-year-2025', () => repo.getById(oldId)))?.notes).toBeNull();
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });
});
