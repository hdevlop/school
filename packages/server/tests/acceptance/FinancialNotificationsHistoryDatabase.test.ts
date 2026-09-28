import { describe, expect, it } from 'bun:test';

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
const { NotificationRepository } = await import('../../src/modules/financial/notifications/NotificationRepository');
const rollback = Symbol('rollback');

describe('financial reminder sources on the marked PostgreSQL fixture', () => {
  it('groups debt by charged year, omits cancelled schedules and requires one check source year', async () => {
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        const repo = new NotificationRepository();
        repo.db = tx;
        const studentId = 'history-student-08';
        const typeId = 'history-fin-notif-db-type';
        const oldFee = 'history-fin-notif-db-old';
        const newFee = 'history-fin-notif-db-new';
        await tx.insert(feeTypes).values({ id: typeId, name: 'History reminder DB', category: 'tuition',
          amount: '100', paymentType: 'oneTime', status: 'active' });
        await tx.insert(fees).values([
          { id: oldFee, studentId, feeTypeId: typeId, academicYear: '2025-2026',
            effectiveDate: '2025-10-01', baseAmount: '100', grossAmount: '100', netAmount: '100' },
          { id: newFee, studentId, feeTypeId: typeId, academicYear: '2026-2027',
            effectiveDate: '2026-09-01', baseAmount: '100', grossAmount: '100', netAmount: '100' },
        ]);
        await tx.insert(feeInstallments).values([
          { id: 'history-fin-notif-db-old-active', feeId: oldFee, number: 1,
            dueDate: '2026-06-01', amount: '30' },
          { id: 'history-fin-notif-db-old-cancelled', feeId: oldFee, number: 2,
            dueDate: '2026-07-01', amount: '70', status: 'cancelled' },
          { id: 'history-fin-notif-db-new-active', feeId: newFee, number: 1,
            dueDate: '2026-09-01', amount: '100' },
        ]);
        const rows = (await repo.getStudentsWithOverdueInstallments('2026-09-27'))
          .filter((row) => row.studentId === studentId && [oldFee, newFee].includes(row.sourceFeeId));
        expect(rows.map((row) => [row.academicYear, row.totalUnpaid, row.installmentCount])
          .sort((a, b) => String(a[0]).localeCompare(String(b[0])))).toEqual([
            ['2025-2026', 30, 1], ['2026-2027', 100, 1],
          ]);
        await tx.insert(payments).values([
          { id: 'history-fin-notif-db-old-pay', studentId, amount: '30',
            paymentDate: '2026-09-20', paymentMethod: 'check', status: 'pending' },
          { id: 'history-fin-notif-db-new-pay', studentId, amount: '100',
            paymentDate: '2026-09-20', paymentMethod: 'check', status: 'pending' },
          { id: 'history-fin-notif-db-empty-pay', studentId, amount: '10',
            paymentDate: '2026-09-20', paymentMethod: 'check', status: 'pending' },
        ]);
        await tx.insert(paymentAllocations).values([
          { id: 'history-fin-notif-db-old-alloc', paymentId: 'history-fin-notif-db-old-pay',
            feeId: oldFee, installmentId: 'history-fin-notif-db-old-active', amount: '30', type: 'installment' },
          { id: 'history-fin-notif-db-new-alloc', paymentId: 'history-fin-notif-db-new-pay',
            feeId: newFee, installmentId: 'history-fin-notif-db-new-active', amount: '100', type: 'installment' },
        ]);
        expect((await repo.getUniqueFeeSourceForPayments(['history-fin-notif-db-old-pay']))?.academicYear)
          .toBe('2025-2026');
        expect(await repo.getUniqueFeeSourceForPayments([
          'history-fin-notif-db-old-pay', 'history-fin-notif-db-new-pay',
        ])).toBeNull();
        expect(await repo.getUniqueFeeSourceForPayments(['history-fin-notif-db-empty-pay']))
          .toBeNull();
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });
});
