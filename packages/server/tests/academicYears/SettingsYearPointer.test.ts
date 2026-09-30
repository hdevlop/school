import { describe, expect, it } from 'bun:test';
import { updateSettingsDto } from '../../src/modules/settings/SettingsDto';
import { SettingsService } from '../../src/modules/settings/SettingsService';
import { SettingsValidator } from '../../src/modules/settings/SettingsValidator';
import { withEnglishMessages } from '../support/englishMessages';

function validator() {
  const settingsValidator = withEnglishMessages(new SettingsValidator({ getById: async () => ({ id: 'settings-1' }) } as any));
  return settingsValidator;
}

function service(current: object | null, writes: object[] = [], years: object[] = []) {
  return new SettingsService(
    {
      getAdminSettings: async () => (current ? { id: 'settings-1', ...current } : undefined),
      update: async (_id: string, data: object) => { writes.push(data); return data; },
      create: async (data: object) => { writes.push(data); return data; },
    } as any,
    validator(),
    {
      findByLabel: async () => null,
      create: async (year: { label: string }) => { years.push(year); return { id: `year-${year.label}`, ...year }; },
    } as any,
  );
}

describe('Settings edits and the active year', () => {
  it('never moves the active year: activation owns it', async () => {
    const writes: object[] = [];
    await expect(service({ currentAcademicYear: '2025-2026' }, writes).update({ currentAcademicYear: '2026-2027' }))
      .rejects.toThrow('Activate the registered year through academic-year operations');
    expect(writes).toEqual([]);
  });

  it('never rewrites the registered calendar months', async () => {
    const writes: object[] = [];
    const settings = service({ currentAcademicYear: '2025-2026', startMonth: 'september', endMonth: 'june' }, writes);
    await expect(settings.update({ startMonth: 'august' })).rejects.toThrow('reviewed correction');
    await expect(settings.update({ endMonth: 'july' })).rejects.toThrow('reviewed correction');
    expect(writes).toEqual([]);
  });

  it('saves other edits, including an unchanged year and months', async () => {
    const writes: object[] = [];
    await service({ currentAcademicYear: '2025-2026', startMonth: 'september', endMonth: 'june' }, writes)
      .update({ currentAcademicYear: '2025-2026', startMonth: 'september', schoolName: 'Al Amal' } as any);
    expect(writes).toEqual([{ currentAcademicYear: '2025-2026', startMonth: 'september', schoolName: 'Al Amal' }]);
  });

  // The update DTO filled every default a request left out, so naming one
  // field reset the time zone, currency and the rest, and a school whose
  // year starts in August could save nothing.
  it('changes only the fields a request names', () => {
    expect(updateSettingsDto.parse({ schoolName: 'Al Amal' })).toEqual({ schoolName: 'Al Amal' });
    expect(updateSettingsDto.parse({ schoolName: 'Al Amal', activeAcademicYearId: 'year-x' } as any))
      .toEqual({ schoolName: 'Al Amal' });
  });

  // The newest settings row holds the active year, so a second one switched
  // the year without activation, and registered an open year on the way.
  it('refuses a second installation instead of switching the active year', async () => {
    const writes: object[] = [];
    const years: object[] = [];
    await expect(service({ currentAcademicYear: '2025-2026' }, writes, years)
      .create({ schoolName: 'Al Amal', schoolPhone: '212600000000', schoolEmail: '', currentAcademicYear: '2027-2028' } as any))
      .rejects.toThrow('School settings already exist');
    expect(writes).toEqual([]);
    expect(years).toEqual([]);
  });

  it('installs once, with defaults and the registered active year', async () => {
    const writes: Array<Record<string, unknown>> = [];
    const years: Array<Record<string, unknown>> = [];
    await service(null, writes, years)
      .create({ schoolName: 'Al Amal', schoolPhone: '212600000000', schoolEmail: '', currentAcademicYear: '2026-2027' } as any);
    expect(years.map((year) => year.label)).toEqual(['2026-2027']);
    expect(writes[0]).toMatchObject({ currentAcademicYear: '2026-2027', activeAcademicYearId: 'year-2026-2027',
      timeZone: 'UTC', currency: 'USD', startMonth: 'september', endMonth: 'june', maintenanceMode: false });
  });
});
