import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';
import { getBusinessDate } from '../../src/shared/businessDate';
import { formatDateOnly } from '../../src/modules/financial/utils/dateOnly';

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
  it('limits student totals and receipt metrics to the selected payment schedule', async () => {
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        const { repo, inYear } = await scopedHistoryRepository(FeeRepository, tx);
        const studentId = 'history-student-08';
        const read = async (schedule?: 'monthly' | 'annually') =>
          (await inYear('history-year-2026', () => repo.getAll(studentId, schedule)))[0];
        const beforeMonthly = await read('monthly');
        const beforeAnnual = await read('annually');
        const beforeAll = await read();
        const today = formatDateOnly(getBusinessDate())!;
        const yesterday = getBusinessDate();
        yesterday.setDate(yesterday.getDate() - 1);
        await tx.insert(feeTypes).values([
          { id: 'schedule-type-monthly', name: 'Schedule filter monthly', category: 'tuition',
            amount: '1200', paymentType: 'recurring', status: 'active' },
          { id: 'schedule-type-annual', name: 'Schedule filter annual', category: 'tuition',
            amount: '500', paymentType: 'recurring', status: 'active' },
        ]);
        await tx.insert(fees).values([
          { id: 'schedule-monthly', studentId, feeTypeId: 'schedule-type-monthly', schedule: 'monthly',
            academicYear: '2026-2027', baseAmount: '1200', grossAmount: '1200', netAmount: '1200' },
          { id: 'schedule-annual', studentId, feeTypeId: 'schedule-type-annual', schedule: 'annually',
            academicYear: '2026-2027', baseAmount: '500', grossAmount: '500', netAmount: '500' },
          { id: 'schedule-old-monthly', studentId, feeTypeId: 'schedule-type-monthly', schedule: 'monthly',
            academicYear: '2025-2026', baseAmount: '900', grossAmount: '900', netAmount: '900' },
        ]);
        await tx.insert(payments).values({ id: 'schedule-receipt', studentId, amount: '150',
          paymentDate: today, paymentMethod: 'cash', status: 'completed' });
        await tx.insert(feeInstallments).values([
          { id: 'schedule-month-inst', feeId: 'schedule-monthly', number: 1,
            dueDate: formatDateOnly(yesterday)!, amount: '1200' },
          { id: 'schedule-annual-inst', feeId: 'schedule-annual', number: 1,
            dueDate: formatDateOnly(yesterday)!, amount: '500' },
        ]);
        await tx.insert(paymentAllocations).values([
          { id: 'schedule-alloc-monthly', paymentId: 'schedule-receipt', feeId: 'schedule-monthly',
            installmentId: 'schedule-month-inst', amount: '100', type: 'installment' },
          { id: 'schedule-alloc-annual', paymentId: 'schedule-receipt', feeId: 'schedule-annual',
            installmentId: 'schedule-annual-inst', amount: '50', type: 'installment' },
        ]);

        const monthly = await read('monthly');
        const annual = await read('annually');
        const all = await read();
        for (const [row, before, net, paid] of [
          [monthly, beforeMonthly, 1200, 100],
          [annual, beforeAnnual, 500, 50],
          [all, beforeAll, 1700, 150],
        ] as const) {
          expect(Number(row.netAmount) - Number(before?.netAmount ?? 0)).toBe(net);
          expect(Number(row.totalPaid) - Number(before?.totalPaid ?? 0)).toBe(paid);
          expect(Number(row.totalDue) - Number(before?.totalDue ?? 0)).toBe(net - paid);
          expect(Number(row.collectedCashToDate) - Number(before?.collectedCashToDate ?? 0)).toBe(paid);
          expect(Number(row.overdueAmount) - Number(before?.overdueAmount ?? 0)).toBe(net - paid);
        }
        expect(monthly.fees.map((fee) => fee.id)).toContain('schedule-monthly');
        expect(monthly.fees.map((fee) => fee.id)).not.toContain('schedule-annual');
        expect(monthly.fees.map((fee) => fee.id)).not.toContain('schedule-old-monthly');
        expect(annual.fees.map((fee) => fee.id)).not.toContain('schedule-monthly');
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });

  it('counts collected money and overdue installment balances only through today', async () => {
    const day = (offset: number) => {
      const date = getBusinessDate();
      date.setDate(date.getDate() + offset);
      return formatDateOnly(date)!;
    };
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        const { repo, inYear } = await scopedHistoryRepository(FeeRepository, tx);
        const studentId = 'history-student-08';
        const feeId = 'history-fee-asof';
        const read = async () => (await inYear('history-year-2026', () => repo.getAll(studentId)))[0];
        const before = await read();
        await tx.insert(feeTypes).values({ id: 'history-type-asof', name: 'As-of-date fee',
          category: 'tuition', amount: '1300', paymentType: 'recurring', status: 'active' });
        await tx.insert(fees).values({ id: feeId, studentId, feeTypeId: 'history-type-asof',
          academicYear: '2026-2027', baseAmount: '1300', grossAmount: '1300', netAmount: '1300' });
        await tx.insert(feeInstallments).values([
          { id: 'asof-past', feeId, number: 1, dueDate: day(-1), amount: '400', status: 'partiallyPaid' },
          { id: 'asof-today', feeId, number: 2, dueDate: day(0), amount: '200' },
          { id: 'asof-future', feeId, number: 3, dueDate: day(1), amount: '500' },
          { id: 'asof-cancelled', feeId, number: 4, dueDate: day(-1), amount: '100', status: 'cancelled' },
          { id: 'asof-paid', feeId, number: 5, dueDate: day(-1), amount: '100', status: 'paid' },
        ]);
        const receipts = [
          { id: 'asof-received', status: 'completed' as const, paymentMethod: 'cash' as const, amount: '100', paymentDate: day(0), installmentId: 'asof-past' },
          { id: 'asof-advance', status: 'completed' as const, paymentMethod: 'bankTransfer' as const, amount: '70', paymentDate: day(-1), installmentId: 'asof-future' },
          { id: 'asof-full', status: 'completed' as const, paymentMethod: 'check' as const, amount: '100', paymentDate: day(-1), installmentId: 'asof-paid' },
          { id: 'asof-credit-card', status: 'completed' as const, paymentMethod: 'creditCard' as const, amount: '20', paymentDate: day(0), installmentId: 'asof-today' },
          { id: 'asof-debit-card', status: 'completed' as const, paymentMethod: 'debitCard' as const, amount: '30', paymentDate: day(0), installmentId: 'asof-today' },
          { id: 'asof-online', status: 'completed' as const, paymentMethod: 'online' as const, amount: '15', paymentDate: day(0), installmentId: 'asof-today' },
          { id: 'asof-mobile', status: 'completed' as const, paymentMethod: 'mobilePayment' as const, amount: '25', paymentDate: day(0), installmentId: 'asof-today' },
          { id: 'asof-future-online', status: 'completed' as const, paymentMethod: 'online' as const, amount: '45', paymentDate: day(1), installmentId: 'asof-today' },
          { id: 'asof-pending-mobile', status: 'pending' as const, paymentMethod: 'mobilePayment' as const, amount: '10', paymentDate: day(-1), installmentId: 'asof-today' },
          { id: 'asof-voided-mobile', status: 'voided' as const, paymentMethod: 'mobilePayment' as const, amount: '12', paymentDate: day(-1), installmentId: 'asof-today' },
          { id: 'asof-future-card', status: 'completed' as const, paymentMethod: 'creditCard' as const, amount: '40', paymentDate: day(1), installmentId: 'asof-today' },
          { id: 'asof-voided-card', status: 'voided' as const, paymentMethod: 'debitCard' as const, amount: '10', paymentDate: day(-1), installmentId: 'asof-today' },
          { id: 'asof-dated-future', status: 'completed' as const, paymentMethod: 'cash' as const, amount: '50', paymentDate: day(1), installmentId: 'asof-past' },
          { id: 'asof-pending', status: 'pending' as const, paymentMethod: 'check' as const, amount: '30', paymentDate: day(-1), installmentId: 'asof-past' },
          { id: 'asof-voided', status: 'voided' as const, paymentMethod: 'bankTransfer' as const, amount: '20', paymentDate: day(-1), installmentId: 'asof-past' },
          { id: 'asof-deposited', status: 'deposited' as const, paymentMethod: 'check' as const, amount: '60', paymentDate: day(-1), installmentId: 'asof-past' },
          { id: 'asof-settles-future', status: 'completed' as const, paymentMethod: 'check' as const, amount: '40', paymentDate: day(-1),
            settledDate: day(1), installmentId: 'asof-past' },
        ];
        await tx.insert(payments).values(receipts.map(({ installmentId: _, ...receipt }) => ({
          ...receipt, studentId,
        })));
        await tx.insert(paymentAllocations).values(receipts.map((receipt) => ({
          id: `alloc-${receipt.id}`, paymentId: receipt.id, feeId,
          installmentId: receipt.installmentId, amount: receipt.amount, type: 'installment',
        })));

        const after = await read();
        expect(Number(after.collectedToDate) - Number(before?.collectedToDate ?? 0)).toBe(360);
        expect(Number(after.collectedCashToDate) - Number(before?.collectedCashToDate ?? 0)).toBe(100);
        expect(Number(after.collectedCheckToDate) - Number(before?.collectedCheckToDate ?? 0)).toBe(100);
        expect(Number(after.collectedBankTransferToDate) - Number(before?.collectedBankTransferToDate ?? 0)).toBe(70);
        expect(Number(after.collectedTpeToDate) - Number(before?.collectedTpeToDate ?? 0)).toBe(50);
        expect(Number(after.collectedOnlineToDate) - Number(before?.collectedOnlineToDate ?? 0)).toBe(15);
        expect(Number(after.collectedMobilePaymentToDate) - Number(before?.collectedMobilePaymentToDate ?? 0)).toBe(25);
        const methodFields = ['collectedCashToDate', 'collectedCheckToDate', 'collectedBankTransferToDate',
          'collectedTpeToDate', 'collectedOnlineToDate', 'collectedMobilePaymentToDate'] as const;
        expect(methodFields.reduce((total, field) => total + Number(after[field]) - Number(before?.[field] ?? 0), 0)).toBe(360);
        expect(Number(after.overdueAmount) - Number(before?.overdueAmount ?? 0)).toBe(300);
        // The existing annual balance still includes the future-dated completed receipts.
        expect(Number(after.totalPaid) - Number(before?.totalPaid ?? 0)).toBe(535);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });

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
