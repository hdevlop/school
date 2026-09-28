import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { payslips } = await import('../../src/modules/financial/payroll/payrollSchema');
const { PayrollRepository } = await import('../../src/modules/financial/payroll/PayrollRepository');
const rollback = Symbol('rollback');

describe('payroll period year on the marked PostgreSQL fixture', () => {
  it('attributes by period month, preserves later cash date and guards writes', async () => {
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        const { repo, inYear } = await scopedHistoryRepository(PayrollRepository, tx);
        const staffId = 'history-staff-teacher';
        const oldId = 'history-payroll-db-old';
        const newId = 'history-payroll-db-new';
        await tx.insert(payslips).values([
          { id: oldId, staffId, staffName: 'History Teacher', staffRole: 'teacher',
            period: '2026-07', baseSalary: '100', grossAmount: '100', netAmount: '100',
            status: 'paid', paymentMethod: 'bankTransfer', paymentDate: '2026-09-10' },
          { id: newId, staffId, staffName: 'History Teacher', staffRole: 'teacher',
            period: '2026-09', baseSalary: '110', grossAmount: '110', netAmount: '110',
            status: 'pending' },
        ]);
        await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
        expect((await inYear('history-year-2025', () => repo.getAll())).map((row) => row.id)).toContain(oldId);
        expect((await inYear('history-year-2025', () => repo.getAll())).map((row) => row.id)).not.toContain(newId);
        expect((await inYear('history-year-2026', () => repo.getAll())).map((row) => row.id)).toContain(newId);
        expect((await inYear('history-year-2025', () => repo.getById(oldId)))?.paymentDate).toBe('2026-09-10');
        expect(await inYear('history-year-2026', () => repo.getById(oldId))).toBeNull();
        expect((await inYear('history-year-2025', () => repo.getByPeriod('2026-07')))
          .map((row) => row.id)).toEqual([oldId]);
        expect(await inYear('history-year-2026', () => repo.getByPeriod('2026-07'))).toEqual([]);
        expect((await inYear('history-year-2025', () => repo.getByStaff(staffId)))
          .map((row) => row.id)).toContain(oldId);
        expect((await inYear('history-year-2025', () => repo.getPeriodSummary('2026-07'))).totalNet)
          .toBe(100);
        expect((await inYear('history-year-2026', () => repo.getPeriodSummary('2026-07'))).count)
          .toBe(0);
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
