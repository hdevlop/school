import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';
import { withEnglishMessages } from '../support/englishMessages';
const raw = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!raw) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(raw);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = raw;
const { eq } = await import('drizzle-orm');
const { db } = await import('../../src/database/db');
const { routineSchedules, routinePeriods, routineEntries, routineDuties, staff, settings } = await import('../../src/database/schema');
const { SettingsRepository } = await import('../../src/modules/settings/SettingsRepository');
const { SettingsService } = await import('../../src/modules/settings/SettingsService');
const { SettingsValidator } = await import('../../src/modules/settings/SettingsValidator');
const rollback = Symbol('rollback');

describe('school-wide teaching days on PostgreSQL', () => {
  it('updates only active-year live routines and preserves lessons, duties, history and archived snapshots', async () => {
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        await tx.insert(routineSchedules).values([
          { id: 'td-current', sectionId: 'history-section-2026-a', academicYear: '2026-2027', name: 'Teaching days current', status: 'published' },
          { id: 'td-old', sectionId: 'history-section-2025-a', academicYear: '2025-2026', name: 'Teaching days past', status: 'published', activeDays: ['tuesday'] },
          { id: 'td-archive', sectionId: 'history-section-2026-a', academicYear: '2026-2027', name: 'Teaching days archive', status: 'archived', activeDays: ['sunday'] },
        ]);
        await tx.insert(routinePeriods).values({ id: 'td-period', scheduleId: 'td-current', name: 'P1', startTime: '08:00', endTime: '09:00', sortOrder: 1 });
        await tx.insert(routineEntries).values({ id: 'td-entry', scheduleId: 'td-current', dayOfWeek: 'monday', periodId: 'td-period', subjectId: 'history-subject-math', teacherAssignmentId: 'history-assignment-2026' });
        const [supervisor] = await tx.select({ id: staff.id }).from(staff).limit(1);
        if (!supervisor) throw new Error('Fixture staff required');
        await tx.insert(routineDuties).values({ id: 'td-duty', scheduleId: 'td-current', dayOfWeek: 'friday', periodId: 'td-period', staffId: supervisor.id });
        const { repo, inYear } = await scopedHistoryRepository(SettingsRepository, tx);
        const service = new SettingsService(repo, withEnglishMessages(new SettingsValidator(repo)), {} as any);
        const beforeLessons = await tx.select().from(routineEntries).where(eq(routineEntries.id, 'td-entry'));
        const beforeDuties = await tx.select().from(routineDuties).where(eq(routineDuties.id, 'td-duty'));
        const beforeSettings = await repo.getAdminSettings();
        for (const teachingDays of [['friday'], ['monday']] as Array<Array<'monday' | 'friday'>>) {
          let refused = false;
          try { await inYear('history-year-2025', () => service.update({ teachingDays })); }
          catch (error) { refused = /lessons and supervision/.test((error as Error).message); }
          expect(refused).toBe(true);
          expect(await repo.getAdminSettings()).toEqual(beforeSettings);
        }
        await inYear('history-year-2025', () => service.update({ teachingDays: ['monday', 'friday'] }));
        const [current] = await tx.select().from(routineSchedules).where(eq(routineSchedules.id, 'td-current'));
        expect(current.activeDays).toEqual(['monday', 'friday']);
        for (const [id, days] of [['td-old', ['tuesday']], ['td-archive', ['sunday']]] as const) {
          const [row] = await tx.select().from(routineSchedules).where(eq(routineSchedules.id, id));
          expect(row.activeDays).toEqual([...days]);
        }
        expect(await tx.select().from(routineEntries).where(eq(routineEntries.id, 'td-entry'))).toEqual(beforeLessons);
        expect(await tx.select().from(routineDuties).where(eq(routineDuties.id, 'td-duty'))).toEqual(beforeDuties);
        const [saved] = await tx.select({ days: settings.teachingDays }).from(settings).where(eq(settings.id, beforeSettings.id));
        expect(saved.days).toEqual(['monday', 'friday']);
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
  });
});
