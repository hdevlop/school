import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';
import { describe, expect, it } from 'bun:test';
import { historyAlertCases, historyFixtureExpected, historyYears } from '../academicYears/fixtures/alertsHistoryManifest';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { AlertRepository } = await import('../../src/modules/alerts/AlertRepository');
const years = Object.fromEntries(historyYears.map((year) => [year.label, year.id]));
const shared = historyAlertCases.filter((item) => item.year === null).map((item) => item.id).sort();
const rollback = Symbol('rollback');

describe('Alerts selected-year repository on the marked PostgreSQL fixture', () => {
  it('returns the exact year-owned and shared IDs across list, detail, filters and counts', async () => {
    const { repo, inYear } = await scopedHistoryRepository(AlertRepository, db);
    await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
    await expect(repo.create({ type: 'system', academicYearId: null }))
      .rejects.toThrow('Resolved academic year is missing');
    await expect(repo.deleteAll()).rejects.toThrow('Resolved academic year is missing');
    for (const year of historyYears) {
      const expected = historyAlertCases.filter((item) => item.year === year.label).map((item) => item.id);
      const ids = (await inYear(year.id, () => repo.getAll())).map((item) => item.id).sort();
      expect(ids).toEqual([...expected, ...shared].sort());
      expect((await inYear(year.id, () => repo.getCount()))?.count).toBe(expected.length + shared.length);
      expect((await inYear(year.id, () => repo.getActiveAlerts())).map((item) => item.id).sort()).toEqual(ids);
      expect((await inYear(year.id, () => repo.getTypeCounts())).reduce((sum, item) => sum + item.count, 0)).toBe(ids.length);
      for (const id of expected) expect((await inYear(year.id, () => repo.getById(id)))?.id).toBe(id);
      for (const id of shared) expect((await inYear(year.id, () => repo.getById(id)))?.id).toBe(id);
      const other = historyAlertCases.find((item) => item.year && item.year !== year.label)!;
      expect(await inYear(year.id, () => repo.getById(other.id))).toBeUndefined();
    }
    expect((await inYear(years['2024-2025'], () => repo.getByStudentId('history-student-01')))
      .map((item) => item.id)).toEqual(['history-alert-2024-academic']);
    expect((await inYear(years['2025-2026'], () => repo.getByType('reminder')))
      .map((item) => item.id)).toEqual(['history-alert-2025-reminder']);
    expect((await inYear(years['2026-2027'], () => repo.getByType('reminder')))).toEqual([]);
    expect((await inYear(years['2025-2026'], () => repo.getStatusCounts())).find((row) => row.status === 'active')?.count)
      .toBe(historyFixtureExpected.alertsByYear['2025-2026'] + historyFixtureExpected.sharedAlerts);
  });

  it('shows a signed-in student their own alerts and the school-wide notices, and nobody else\'s', async () => {
    const { repo, inYear } = await scopedHistoryRepository(AlertRepository, db);
    const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id).sort();
    const student = (id: string) => ({ id: `${id}-user`, role: 'student' });
    // Every fixture alert is for 'all'; the ones naming no one reach every signed-in reader.
    const notices = ['history-alert-2026-announcement', ...shared].sort();
    expect(ids(await inYear(years['2026-2027'], () => repo.getAll(), student('history-student-01'))))
      .toEqual(['history-alert-2026-behavior', ...notices].sort());
    expect((await inYear(years['2026-2027'], () => repo.getCount(), student('history-student-01')))?.count).toBe(4);
    expect(ids(await inYear(years['2025-2026'], () => repo.getAll(), student('history-student-01')))).toEqual(shared);
    expect(ids(await inYear(years['2025-2026'], () => repo.getAll(), student('history-student-05'))))
      .toEqual(['history-alert-2025-attendance', ...shared].sort());
    expect(await inYear(years['2025-2026'], () => repo.getById('history-alert-2025-attendance'), student('history-student-01')))
      .toBeUndefined();
    for (const role of ['parent', 'teacher']) {
      expect(ids(await inYear(years['2026-2027'], () => repo.getAll(), { id: 'history-unlinked-user', role })))
        .toEqual(notices);
    }
    expect(await inYear(years['2026-2027'], () => repo.getAll(), { id: 'history-unlinked-user', role: 'custom-role' }))
      .toEqual([]);
  });

  it('keeps writes, duplicates and bulk deletion inside the selected year', async () => {
    try {
      await db.transaction(async (tx) => {
        const { repo, inYear } = await scopedHistoryRepository(AlertRepository, tx as unknown as typeof db);
        const old = years['2025-2026'];
        const current = years['2026-2027'];
        const id = 'history-alert-2025-attendance';
        expect(await inYear(current, () => repo.updateStatus(id, 'resolved'))).toBeUndefined();
        expect((await inYear(old, () => repo.getById(id)))?.status).toBe('active');
        expect((await inYear(old, () => repo.updateStatus(id, 'resolved')))?.status).toBe('resolved');
        expect(await inYear(current, () => repo.delete(id))).toBeUndefined();
        expect((await inYear(old, () => repo.updateStatus('history-alert-shared-system', 'resolved')))?.status).toBe('resolved');
        expect((await inYear(old, () => repo.deleteResolved())).deletedCount).toBe(1);
        expect((await inYear(old, () => repo.getById('history-alert-shared-system')))?.status).toBe('resolved');
        expect((await repo.checkDuplicateAlertInScope('academic', years['2024-2025'], 'history-student-01'))?.id)
          .toBe('history-alert-2024-academic');
        expect(await repo.checkDuplicateAlertInScope('academic', current, 'history-student-01')).toBeUndefined();
        const result = await inYear(old, () => repo.deleteAll());
        expect(result.deletedCount).toBe(historyFixtureExpected.alertsByYear['2025-2026'] - 1);
        expect((await inYear(old, () => repo.getAll())).map((item) => item.id).sort()).toEqual(shared);
        expect((await inYear(current, () => repo.getAll())).length).toBe(
          historyFixtureExpected.alertsByYear['2026-2027'] + historyFixtureExpected.sharedAlerts);
        await repo.clearForSeedReset();
        expect((await tx.select().from((await import('../../src/modules/alerts/alertSchema')).alerts)).length).toBe(0);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });

  it('keeps an overdue reminder source per charged fee year for the same student', async () => {
    const { fees, feeInstallments } = await import('../../src/modules/financial/fees/feeSchema');
    const { NotificationRepository } = await import('../../src/modules/financial/notifications/NotificationRepository');
    try {
      await db.transaction(async (tx) => {
        await tx.insert(fees).values({ id: 'history-fee-2026-aya-test', studentId: 'history-student-08',
          feeTypeId: 'history-fee-type', academicYear: '2026-2027',
          baseAmount: '20', grossAmount: '20', netAmount: '20' });
        await tx.insert(feeInstallments).values([
          { id: 'history-installment-2025-test', feeId: 'history-fee-2025-aya', number: 1,
            dueDate: '2026-06-01', amount: '10' },
          { id: 'history-installment-2026-test', feeId: 'history-fee-2026-aya-test', number: 1,
            dueDate: '2026-09-01', amount: '20' },
        ]);
        const repo = new NotificationRepository();
        repo.db = tx as unknown as typeof db;
        const rows = (await repo.getStudentsWithOverdueInstallments('2026-09-27'))
          .filter((row) => row.studentId === 'history-student-08')
          .sort((a, b) => a.academicYear.localeCompare(b.academicYear));
        expect(rows.map((row) => [row.academicYear, row.sourceFeeId, row.totalUnpaid])).toEqual([
          ['2025-2026', 'history-fee-2025-aya', 10],
          ['2026-2027', 'history-fee-2026-aya-test', 20],
        ]);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });
});
