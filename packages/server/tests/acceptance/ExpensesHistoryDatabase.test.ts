import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { expenses } = await import('../../src/modules/financial/expenses/expenseSchema');
const { ExpenseRepository } = await import('../../src/modules/financial/expenses/ExpenseRepository');
const rollback = Symbol('rollback');

describe('expense date year scope on the marked PostgreSQL fixture', () => {
  it('keeps expense dates in their reporting year and protects reads and writes', async () => {
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        const { repo, inYear } = await scopedHistoryRepository(ExpenseRepository, tx);
        const old = 'history-expense-db-old';
        const current = 'history-expense-db-current';
        const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id)
          .filter((id) => id.startsWith('history-expense-db-'));
        const oldBefore = await inYear('history-year-2025', () => repo.getSummary());
        const currentBefore = await inYear('history-year-2026', () => repo.getSummary());
        const oldPaidBefore = await inYear('history-year-2025', () =>
          repo.getTotalExpensesByDateRange('2026-07-01', '2026-09-30'));

        await tx.insert(expenses).values([
          { id: old, category: 'supplies', title: 'History July supplies', amount: '31',
            expenseDate: '2026-07-10', paymentDate: '2026-09-12', status: 'paid',
            invoiceNumber: 'history-expense-db-old-invoice' },
          { id: current, category: 'supplies', title: 'History September supplies', amount: '47',
            expenseDate: '2026-09-12', status: 'pending',
            invoiceNumber: 'history-expense-db-current-invoice' },
        ]);

        await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
        expect(ids(await inYear('history-year-2025', () => repo.getAll()))).toEqual([old]);
        expect(ids(await inYear('history-year-2026', () => repo.getAll()))).toEqual([current]);
        expect(ids(await inYear('history-year-2025', () => repo.getByIds([old, current])))).toEqual([old]);
        expect(await inYear('history-year-2026', () => repo.getById(old))).toBeUndefined();
        expect((await inYear('history-year-2025', () => repo.getById(old)))?.paymentDate)
          .toBe('2026-09-12');
        expect(ids(await inYear('history-year-2025', () => repo.getByDateRange('2026-07-01', '2026-09-30'))))
          .toEqual([old]);
        expect(ids(await inYear('history-year-2026', () => repo.getPendingApprovals()))).toEqual([current]);
        expect((await inYear('history-year-2025', () => repo.getByInvoiceNumber('history-expense-db-current-invoice')))?.id)
          .toBe(current); // Global uniqueness must still see other years.

        const oldAfter = await inYear('history-year-2025', () => repo.getSummary());
        const currentAfter = await inYear('history-year-2026', () => repo.getSummary());
        expect(oldAfter.totalCount - oldBefore.totalCount).toBe(1);
        expect(oldAfter.totalApproved - oldBefore.totalApproved).toBe(31);
        expect((await inYear('history-year-2025', () => repo.getCount())).count - oldBefore.totalCount)
          .toBe(1);
        const oldPaidAfter = await inYear('history-year-2025', () =>
          repo.getTotalExpensesByDateRange('2026-07-01', '2026-09-30'));
        expect(oldPaidAfter.total - oldPaidBefore.total).toBe(31);
        expect(oldPaidAfter.count - oldPaidBefore.count).toBe(1);
        expect(currentAfter.totalCount - currentBefore.totalCount).toBe(1);
        expect(currentAfter.totalPending - currentBefore.totalPending).toBe(47);
        expect(await inYear('history-year-2026', () => repo.update(old, { title: 'wrong year' })))
          .toBeUndefined();
        expect(await inYear('history-year-2026', () => repo.approve(old, 'history-admin')))
          .toBeUndefined();
        expect(await inYear('history-year-2026', () => repo.delete(old))).toBeUndefined();
        expect((await inYear('history-year-2025', () => repo.getById(old)))?.title)
          .toBe('History July supplies');
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });
});
