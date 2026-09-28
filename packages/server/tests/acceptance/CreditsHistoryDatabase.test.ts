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
const { studentCreditLots } = await import('../../src/modules/financial/credits/creditSchema');
const { CreditRepository } = await import('../../src/modules/financial/credits/CreditRepository');
const { InstallmentRepository } = await import('../../src/modules/financial/installments/InstallmentRepository');
const rollback = Symbol('rollback');

describe('credit balance and target fee year on the marked PostgreSQL fixture', () => {
  it('keeps lots shared and locks only installments of the named target year', async () => {
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        await tx.insert(feeTypes).values({ id: 'history-credit-db-type', name: 'History credit database',
          category: 'tuition', amount: '100', paymentType: 'oneTime', status: 'active' });
        await tx.insert(fees).values([
          { id: 'history-credit-db-old-fee', studentId: 'history-student-01',
            feeTypeId: 'history-credit-db-type', academicYear: '2025-2026',
            baseAmount: '100', grossAmount: '100', netAmount: '100' },
          { id: 'history-credit-db-new-fee', studentId: 'history-student-01',
            feeTypeId: 'history-credit-db-type', academicYear: '2026-2027',
            baseAmount: '100', grossAmount: '100', netAmount: '100' },
        ]);
        await tx.insert(feeInstallments).values([
          { id: 'history-credit-db-old-inst', feeId: 'history-credit-db-old-fee',
            number: 1, dueDate: '2026-06-01', amount: '100' },
          { id: 'history-credit-db-new-inst', feeId: 'history-credit-db-new-fee',
            number: 1, dueDate: '2027-06-01', amount: '100' },
        ]);
        await tx.insert(payments).values({ id: 'history-credit-db-payment',
          studentId: 'history-student-01', amount: '100', paymentDate: '2026-10-01',
          paymentMethod: 'cash', status: 'completed' });
        await tx.insert(studentCreditLots).values({ id: 'history-credit-db-lot',
          studentId: 'history-student-01', sourcePaymentId: 'history-credit-db-payment',
          originalAmount: '100', remainingAmount: '100', status: 'available' });

        const installments = new InstallmentRepository();
        installments.db = tx;
        const credits = new CreditRepository();
        credits.db = tx;
        expect((await credits.listAvailableLotsForUpdate('history-student-01')).map((row) => row.id))
          .toContain('history-credit-db-lot');
        expect((await credits.listLotsForStudent('history-student-01')).map((row) => row.id))
          .toContain('history-credit-db-lot');
        expect((await installments.getByStudentForAutoAllocationForUpdate('history-student-01', '2025-2026'))
          .map((row) => row.id)).toEqual(['history-credit-db-old-inst']);
        expect((await installments.getByStudentForAutoAllocationForUpdate('history-student-01', '2026-2027'))
          .map((row) => row.id)).toEqual(['history-credit-db-new-inst']);
        expect((await installments.getByStudentForAutoAllocationForUpdate('history-student-01', '2024-2025'))
          .map((row) => row.id)).toEqual([]);
        expect((await installments.getByStudentForAutoAllocationForUpdate('history-student-01'))
          .map((row) => row.id)).toEqual(['history-credit-db-old-inst', 'history-credit-db-new-inst']);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });
});
