import { describe, expect, it } from 'bun:test';
import { SettingsService } from '../../src/modules/settings/SettingsService';

function service(current: object, writes: object[] = []) {
  return new SettingsService(
    {
      getAdminSettings: async () => ({ id: 'settings-1', ...current }),
      update: async (_id: string, data: object) => { writes.push(data); return data; },
    } as any,
    { ensureExists: async () => true } as any,
    {} as any,
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
});
