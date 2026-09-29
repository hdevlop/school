import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;
// A controlled business day inside 2026-2027, independent of the machine clock.
process.env.APP_BUSINESS_DATE = '2026-09-27';

const { db } = await import('../../src/database/db');
const { feeTypes } = await import('../../src/modules/financial/feeTypes/feeTypeSchema');
const { fees, feeInstallments } = await import('../../src/modules/financial/fees/feeSchema');
const { payments } = await import('../../src/modules/financial/payments/paymentSchema');
const { paymentAllocations } = await import('../../src/modules/financial/allocations/allocationSchema');
const { expenses } = await import('../../src/modules/financial/expenses/expenseSchema');
const { attendance } = await import('../../src/database/schema');
const { FinanceDashboardRepository } = await import('../../src/modules/dashboard/finance/FinanceDashboardRepository');
const { AttendanceRepository } = await import('../../src/modules/attendance/AttendanceRepository');
const { StudentRepository } = await import('../../src/modules/students/StudentRepository');
const rollback = Symbol('rollback');

const OLD = 'history-year-2025';
const NEW = 'history-year-2026';
const OLDEST = 'history-year-2024';
const OMAR = 'history-student-05';
const cents = (value: number) => Math.round(value * 100);

type Finance = InstanceType<typeof FinanceDashboardRepository>;
type Row = { classId?: string | null; studentId?: string | null; category?: string; month?: string };

// Everything the finance dashboard shows for one year, read in that year.
async function financeFigures(repo: Finance, year: { reportingStartsOn: string; reportingEndsOn: string }, isActiveYear: boolean) {
  return {
    collection: await repo.getCollectionTotals(),
    aging: await repo.getAging(),
    overdue: await repo.getOverdue(100),
    detail: await repo.getAgingDetail(),
    byClass: await repo.getCollectionByClass(isActiveYear),
    recent: await repo.getRecentPayments(100),
    monthly: await repo.getMonthlyCash(),
    breakdown: await repo.getExpenseBreakdown(),
    cash: await repo.getCashTotals(year.reportingStartsOn, year.reportingEndsOn),
  };
}

const find = <T extends Row>(rows: T[], match: (row: T) => boolean) => rows.find(match);
const byClass = (id: string) => (row: Row) => row.classId === id;
const byStudent = (id: string) => (row: Row) => row.studentId === id;

describe('dashboard figures on the marked PostgreSQL fixture', () => {
  it("counts each year's enrolled students, not the current student rows", async () => {
    const { repo: students, inYear } = await scopedHistoryRepository(StudentRepository, db);
    expect((await inYear(OLDEST, () => students.getCount())).count).toBe(7);
    expect((await inYear(OLD, () => students.getCount())).count).toBe(8);
    expect((await inYear(NEW, () => students.getCount())).count).toBe(8);
  });

  it('charts each year of attendance in its own months, legacy rows by their date', async () => {
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        const { repo, inYear } = await scopedHistoryRepository(AttendanceRepository, tx);
        await expect(repo.getMonthlyStats('staff')).rejects.toThrow('Resolved academic year is missing');

        const month = (months: Array<{ month: string; late: number; present: number; total: number }>, key: string) =>
          months.find((row) => row.month === key) ?? { late: 0, present: 0, total: 0 };
        const read = (yearId: string) => inYear(yearId, () => repo.getMonthlyStats('staff'));
        const before = { oldest: await read(OLDEST), old: await read(OLD), current: await read(NEW) };

        await tx.insert(attendance).values([
          { id: 'history-dashboard-db-staff-late', type: 'staff', staffId: 'history-staff-teacher',
            academicYearId: OLD, date: '2026-02-10', status: 'late' },
          { id: 'history-dashboard-db-staff-legacy', type: 'staff', staffId: 'history-staff-teacher',
            academicYearId: null, date: '2025-12-15', status: 'present' },
        ]);
        const after = { oldest: await read(OLDEST), old: await read(OLD), current: await read(NEW) };

        expect(after.old.map((row) => row.month)).toEqual([
          '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02',
          '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08',
        ]);
        expect(month(after.old, '2026-02').late - month(before.old, '2026-02').late).toBe(1);
        expect(month(after.old, '2025-12').present - month(before.old, '2025-12').present).toBe(1);
        expect(after.oldest).toEqual(before.oldest);
        expect(after.current).toEqual(before.current);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });

  it('counts balances, collection and cash by fee year and cash date, from completed receipts only', async () => {
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        const { repo, inYear } = await scopedHistoryRepository(FinanceDashboardRepository, tx);
        await expect(repo.getAging()).rejects.toThrow('Resolved academic year is missing');

        const years = { oldest: { reportingStartsOn: '2024-09-01', reportingEndsOn: '2025-08-31' },
          old: { reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' },
          current: { reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' } };
        const read = async () => ({
          oldest: await inYear(OLDEST, () => financeFigures(repo, years.oldest, false)),
          old: await inYear(OLD, () => financeFigures(repo, years.old, false)),
          current: await inYear(NEW, () => financeFigures(repo, years.current, true)),
        });
        const before = await read();
        expect(find(before.old.overdue, byStudent(OMAR))).toBeUndefined();
        expect(find(before.current.overdue, byStudent(OMAR))).toBeUndefined();

        const typeId = 'history-dashboard-db-type';
        await tx.insert(feeTypes).values({ id: typeId, name: 'History dashboard DB', category: 'tuition',
          amount: '100', paymentType: 'oneTime', status: 'active' });
        await tx.insert(fees).values([
          { id: 'history-dashboard-db-old', studentId: OMAR, feeTypeId: typeId, academicYear: '2025-2026',
            effectiveDate: '2025-10-01', baseAmount: '140', grossAmount: '140', netAmount: '140' },
          { id: 'history-dashboard-db-new', studentId: OMAR, feeTypeId: typeId, academicYear: '2026-2027',
            effectiveDate: '2026-09-01', baseAmount: '200', grossAmount: '200', netAmount: '200' },
        ]);
        await tx.insert(feeInstallments).values([
          { id: 'history-dashboard-db-old-1', feeId: 'history-dashboard-db-old', number: 1, dueDate: '2026-06-01', amount: '100' },
          // Paid 10.00 before it was cancelled: neither owed nor collected any more.
          { id: 'history-dashboard-db-old-2', feeId: 'history-dashboard-db-old', number: 2, dueDate: '2026-07-01',
            amount: '40', paidAmount: '10', status: 'cancelled' },
          { id: 'history-dashboard-db-new-1', feeId: 'history-dashboard-db-new', number: 1, dueDate: '2026-09-01', amount: '100' },
          { id: 'history-dashboard-db-new-2', feeId: 'history-dashboard-db-new', number: 2, dueDate: '2026-10-01', amount: '100' },
        ]);
        await tx.insert(payments).values([
          { id: 'history-dashboard-db-march', studentId: OMAR, amount: '25.00', paymentDate: '2026-03-15',
            paymentMethod: 'cash', status: 'completed', settledDate: '2026-03-15' },
          { id: 'history-dashboard-db-mixed', studentId: OMAR, amount: '61.00', paymentDate: '2026-09-10',
            paymentMethod: 'cash', status: 'completed', settledDate: '2026-09-10' },
          { id: 'history-dashboard-db-today', studentId: OMAR, amount: '7.00', paymentDate: '2026-09-27',
            paymentMethod: 'cash', status: 'completed', settledDate: '2026-09-27' },
          { id: 'history-dashboard-db-check', studentId: OMAR, amount: '15.00', paymentDate: '2026-09-11',
            paymentMethod: 'check', status: 'pending', checkNumber: 'history-dashboard-db-check',
            checkDueDate: '2026-09-30' },
        ]);
        await tx.insert(paymentAllocations).values([
          { id: 'history-dashboard-db-a1', paymentId: 'history-dashboard-db-march', feeId: 'history-dashboard-db-old',
            installmentId: 'history-dashboard-db-old-1', amount: '25.00', type: 'installment' },
          { id: 'history-dashboard-db-a2', paymentId: 'history-dashboard-db-mixed', feeId: 'history-dashboard-db-old',
            installmentId: 'history-dashboard-db-old-1', amount: '30.25', type: 'installment' },
          { id: 'history-dashboard-db-a3', paymentId: 'history-dashboard-db-mixed', feeId: 'history-dashboard-db-new',
            installmentId: 'history-dashboard-db-new-1', amount: '20.75', type: 'installment' },
          { id: 'history-dashboard-db-a4', paymentId: 'history-dashboard-db-mixed', feeId: 'history-dashboard-db-old',
            installmentId: 'history-dashboard-db-old-2', amount: '10.00', type: 'installment' },
          { id: 'history-dashboard-db-a5', paymentId: 'history-dashboard-db-today', feeId: 'history-dashboard-db-new',
            installmentId: 'history-dashboard-db-new-2', amount: '7.00', type: 'installment' },
          { id: 'history-dashboard-db-a6', paymentId: 'history-dashboard-db-check', feeId: 'history-dashboard-db-old',
            installmentId: 'history-dashboard-db-old-1', amount: '15.00', type: 'installment' },
        ]);
        await tx.insert(expenses).values([
          { id: 'history-dashboard-db-paid', category: 'supplies', title: 'History dashboard paid supplies',
            amount: '12.50', expenseDate: '2026-03-20', status: 'paid', paymentMethod: 'cash', paymentDate: '2026-03-20' },
          { id: 'history-dashboard-db-rejected', category: 'supplies', title: 'History dashboard rejected supplies',
            amount: '99.00', expenseDate: '2026-03-21', status: 'rejected' },
        ]);
        const after = await read();

        // 2025-2026: installment 1 is owed; the cancelled one and the pending
        // check count for nothing. 100 - 25 - 30.25 = 44.75, 118 days late.
        expect(cents(after.old.collection.due - before.old.collection.due)).toBe(10000);
        expect(cents(after.old.collection.paid - before.old.collection.paid)).toBe(5525);
        expect(cents(after.old.aging.d60plus - before.old.aging.d60plus)).toBe(4475);
        for (const bucket of ['current', 'd1_30', 'd31_60'] as const) {
          expect(after.old.aging[bucket]).toBe(before.old.aging[bucket]);
        }
        expect(find(after.old.overdue, byStudent(OMAR))).toMatchObject({
          totalOverdue: 44.75, oldestDueDate: '2026-06-01', daysOverdue: 118,
        });
        expect(find(after.old.detail, byStudent(OMAR))).toMatchObject({ d60plus: 44.75, total: 44.75 });
        const oldClassBefore = find(before.old.byClass, byClass('history-class-2025'));
        const oldClassAfter = find(after.old.byClass, byClass('history-class-2025'))!;
        expect(cents(oldClassAfter.due - (oldClassBefore?.due ?? 0))).toBe(10000);
        expect(cents(oldClassAfter.paid - (oldClassBefore?.paid ?? 0))).toBe(5525);

        // Cash by date: the March receipt and the paid expense, not the
        // rejected one; September's receipts belong to 2026-2027.
        const oldRecent = after.old.recent.map((row) => row.paymentId);
        expect(oldRecent).toContain('history-dashboard-db-march');
        for (const id of ['history-dashboard-db-mixed', 'history-dashboard-db-today', 'history-dashboard-db-check']) {
          expect(oldRecent).not.toContain(id);
        }
        const march = (figures: typeof before.old) => figures.monthly.find((row) => row.month === '2026-03')!;
        expect(cents(march(after.old).income - march(before.old).income)).toBe(2500);
        expect(cents(march(after.old).expenses - march(before.old).expenses)).toBe(1250);
        expect(cents(after.old.cash.income - before.old.cash.income)).toBe(2500);
        expect(cents(after.old.cash.expenses - before.old.cash.expenses)).toBe(1250);
        const supplies = (figures: typeof before.old) => find(figures.breakdown, (row) => row.category === 'supplies');
        expect(cents(supplies(after.old)!.total - (supplies(before.old)?.total ?? 0))).toBe(1250);
        expect(supplies(after.old)!.count - (supplies(before.old)?.count ?? 0)).toBe(1);

        // 2026-2027: installment 1 is due and partly paid; installment 2 is
        // not due yet, so it is aging as current and outside the collection rate.
        expect(cents(after.current.collection.due - before.current.collection.due)).toBe(10000);
        expect(cents(after.current.collection.paid - before.current.collection.paid)).toBe(2075);
        expect(cents(after.current.aging.d1_30 - before.current.aging.d1_30)).toBe(7925);
        expect(cents(after.current.aging.current - before.current.aging.current)).toBe(9300);
        expect(find(after.current.overdue, byStudent(OMAR))).toMatchObject({
          totalOverdue: 79.25, oldestDueDate: '2026-09-01', daysOverdue: 26,
        });
        expect(find(after.current.detail, byStudent(OMAR))).toMatchObject({ current: 93, d1_30: 79.25, total: 172.25 });
        const newClassBefore = find(before.current.byClass, byClass('history-class-2026'));
        const newClassAfter = find(after.current.byClass, byClass('history-class-2026'))!;
        expect(cents(newClassAfter.due - (newClassBefore?.due ?? 0))).toBe(10000);
        expect(cents(newClassAfter.paid - (newClassBefore?.paid ?? 0))).toBe(2075);
        const currentRecent = after.current.recent.map((row) => row.paymentId);
        expect(currentRecent.indexOf('history-dashboard-db-today')).toBeGreaterThanOrEqual(0);
        expect(currentRecent.indexOf('history-dashboard-db-today'))
          .toBeLessThan(currentRecent.indexOf('history-dashboard-db-mixed'));
        expect(currentRecent).not.toContain('history-dashboard-db-march');
        expect(currentRecent).not.toContain('history-dashboard-db-check');
        const september = (figures: typeof before.current) => figures.monthly.find((row) => row.month === '2026-09')!;
        expect(cents(september(after.current).income - september(before.current).income)).toBe(6800);
        expect(cents(after.current.cash.income - before.current.cash.income)).toBe(6800);

        // 2024-2025 sees none of it.
        expect(after.oldest.collection).toEqual(before.oldest.collection);
        expect(after.oldest.aging).toEqual(before.oldest.aging);
        expect(after.oldest.cash).toEqual(before.oldest.cash);
        expect(after.oldest.byClass).toEqual(before.oldest.byClass);
        expect(after.oldest.recent).toEqual(before.oldest.recent);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });
});
