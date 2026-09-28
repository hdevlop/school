import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';
import { historyAttendanceCases, historyYears } from '../academicYears/fixtures/alertsHistoryManifest';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { AttendanceRepository } = await import('../../src/modules/attendance/AttendanceRepository');
const { attendance } = await import('../../src/modules/attendance/attendanceSchema');
const { eq } = await import('drizzle-orm');
const rollback = Symbol('rollback');

describe('Attendance selected-year repository on the marked PostgreSQL fixture', () => {
  it('reads annual and dated legacy marks with ownership, date and student filters', async () => {
    const { repo, inYear } = await scopedHistoryRepository(AttendanceRepository, db);
    await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
    await expect(repo.getById('history-attendance-2025')).rejects.toThrow('Resolved academic year is missing');
    for (const year of historyYears) {
      const expected = historyAttendanceCases.filter((item) => item.year === year.label
        || (item.year === null && item.date >= year.start && item.date <= year.end))
        .map((item) => item.id).sort();
      expect((await inYear(year.id, () => repo.getAll())).map((row) => row.id).sort()).toEqual(expected);
      for (const id of expected) expect((await inYear(year.id, () => repo.getById(id)))?.id).toBe(id);
      expect(await inYear(year.id, () => repo.getById('history-attendance-unresolved'))).toBeUndefined();
    }
    expect(await inYear('history-year-2026', () => repo.getById('history-attendance-2025'))).toBeUndefined();
    expect((await inYear('history-year-2025', () => repo.getByDate('2025-11-11'))).map((row) => row.id))
      .toEqual(['history-attendance-legacy-2025']);
    expect(await inYear('history-year-2026', () => repo.getByDate('2025-11-11'))).toEqual([]);
    expect((await inYear('history-year-2025', () => repo.getAll({ studentId: 'history-student-05' })))
      .map((row) => row.id)).toEqual(['history-attendance-2025']);
    expect((await inYear('history-year-2025', () => repo.getAll(),
      { id: 'history-student-05-user', role: 'student' })).map((row) => row.id))
      .toEqual(['history-attendance-2025']);
  });

  it('stamps creates, protects cross-year mutations, and attributes legacy staff marks', async () => {
    try {
      await db.transaction(async (tx) => {
        const { repo, inYear } = await scopedHistoryRepository(AttendanceRepository, tx as unknown as typeof db);
        const old = 'history-year-2025';
        const current = 'history-year-2026';
        const id = 'history-attendance-2025';
        expect(await inYear(current, () => repo.update(id, { status: 'absent' }))).toBeUndefined();
        expect(await inYear(current, () => repo.delete(id))).toBeUndefined();
        expect((await inYear(old, () => repo.update(id, { status: 'late' })))?.status).toBe('late');
        const created = await inYear(old, () => repo.create({
          type: 'student', studentId: 'history-student-01', sectionId: 'history-section-2025-a',
          date: '2025-12-11', status: 'present', academicYearId: current,
        }));
        expect(created?.academicYearId).toBe(old);
        expect(await inYear(current, () => repo.getById(created.id))).toBeUndefined();

        await tx.insert(attendance).values({ id: 'history-attendance-legacy-staff',
          type: 'staff', staffId: 'history-staff-teacher', academicYearId: null,
          date: '2025-12-12', status: 'present' });
        const saved = await inYear(old, () => repo.upsertStaffRoster([
          { staffId: 'history-staff-teacher', date: '2025-12-12', status: 'absent' },
        ], 'history-admin'));
        expect(saved.savedCount).toBe(1);
        const [updated] = await tx.select().from(attendance)
          .where(eq(attendance.id, 'history-attendance-legacy-staff'));
        expect(updated.academicYearId).toBe(old);
        expect(updated.status).toBe('absent');
        expect((await inYear(old, () => repo.deleteAll())).deletedCount).toBe(4);
        expect((await inYear(current, () => repo.getAll())).length).toBe(1);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
    const { repo, inYear } = await scopedHistoryRepository(AttendanceRepository, db);
    expect((await inYear('history-year-2025', () => repo.getAll())).length).toBe(2);
  });
});
