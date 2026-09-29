import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { count } = await import('drizzle-orm');
const { db } = await import('../../src/database/db');
const { settings } = await import('../../src/modules/settings/settingSchema');
const { academicYears } = await import('../../src/modules/academicYears/AcademicYearSchema');
const { SettingsRepository } = await import('../../src/modules/settings/SettingsRepository');
const { SettingsService } = await import('../../src/modules/settings/SettingsService');
const { SettingsValidator } = await import('../../src/modules/settings/SettingsValidator');
const { updateSettingsDto, createSettingsDto } = await import('../../src/modules/settings/SettingsDto');
const { AcademicYearRepository } = await import('../../src/modules/academicYears/AcademicYearRepository');
const rollback = Symbol('rollback');

type Tx = typeof db;

async function settingsService(tx: Tx) {
  const { repo, inYear } = await scopedHistoryRepository(SettingsRepository, tx);
  const years = new AcademicYearRepository();
  years.db = tx;
  const validator = new SettingsValidator(repo);
  Object.defineProperty(validator, 't', { value: (key: string) => `settings.errors.${key}`, configurable: true });
  return { service: new SettingsService(repo, validator, years), repo, years, inYear };
}

async function inRollback(run: (tx: Tx) => Promise<void>) {
  try {
    await db.transaction(async (transaction) => {
      await run(transaction as unknown as Tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

// The refusal's message; `expect(...).rejects` inside an open transaction
// stalled the fixture connection.
async function refusal(pending: Promise<unknown>) {
  try {
    await pending;
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('Expected a refusal');
}

const withoutEdit = ({ schoolName: _name, updatedAt: _updated, ...row }: Record<string, unknown>) => row;

describe('settings on the marked PostgreSQL fixture', () => {
  it('are the same shared row under every selected year', async () => {
    await inRollback(async (tx) => {
      const { repo, inYear } = await settingsService(tx);
      const old = await inYear('history-year-2024', () => repo.getPublicSettings());
      const previous = await inYear('history-year-2025', () => repo.getPublicSettings());
      const current = await inYear('history-year-2026', () => repo.getPublicSettings());
      expect(old).toEqual(current);
      expect(previous).toEqual(current);
      expect(current.activeAcademicYearId).toBe('history-year-2026');
      expect(current.currentAcademicYear).toBe('2026-2027');
    });
  });

  // An update named one field and reset every other one to its default.
  it('changes only the fields an update names', async () => {
    await inRollback(async (tx) => {
      const { service, repo } = await settingsService(tx);
      const before = await repo.getAdminSettings();
      // Make the stored values differ from every default an update could fill.
      await tx.update(settings).set({ timeZone: 'Africa/Casablanca', currency: 'MAD', language: 'fr',
        maintenanceMode: true, autoBackup: false, smsNotifications: true, maxClassSize: 28 });
      const edited = await repo.getAdminSettings();
      await service.update(updateSettingsDto.parse({ schoolName: 'History settings rename' }));
      const after = await repo.getAdminSettings();
      expect(after.schoolName).toBe('History settings rename');
      expect(withoutEdit(after)).toEqual(withoutEdit(edited));
      expect(after.id).toBe(before.id);
    });
  });

  it('refuses a second installation and a pointer move, leaving the active year', async () => {
    await inRollback(async (tx) => {
      const { service, years } = await settingsService(tx);
      const [yearsBefore] = await tx.select({ count: count() }).from(academicYears);
      const second = createSettingsDto.parse({ schoolName: 'Second school', schoolPhone: '212600000000',
        schoolEmail: '', currentAcademicYear: '2027-2028' });
      expect(await refusal(service.create(second))).toBe('settings.errors.alreadyExists');
      expect(await refusal(service.update(updateSettingsDto.parse({ currentAcademicYear: '2025-2026' }))))
        .toBe('Activate the registered year through academic-year operations');
      const [settingsRows] = await tx.select({ count: count() }).from(settings);
      const [yearsAfter] = await tx.select({ count: count() }).from(academicYears);
      expect(settingsRows.count).toBe(1);
      expect(yearsAfter.count).toBe(yearsBefore.count);
      expect(await years.findByLabel('2027-2028')).toBeNull();
      const pointer = await years.findWithActivePointer();
      expect([pointer?.activeAcademicYearId, pointer?.currentAcademicYear, pointer?.year?.id])
        .toEqual(['history-year-2026', '2026-2027', 'history-year-2026']);
    });
  });
});
