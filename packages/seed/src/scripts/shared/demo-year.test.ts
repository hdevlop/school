import { expect, it } from 'bun:test';
import { defaultSchoolYearCalendar } from '@sms/contracts/academic-years';
import { prepareDemoYear } from './demo-year';
import { getSeedAcademicYear } from './academic-year';

function fixture(initiallyInstalled = true) {
  const current = getSeedAcademicYear();
  const rows: any[] = initiallyInstalled ? [{
    id: current, label: current, ...defaultSchoolYearCalendar(current), status: 'open', provenance: 'verified',
  }] : [];
  let settings: { currentAcademicYear: string; activeAcademicYearId: string } | null = initiallyInstalled
    ? { currentAcademicYear: current, activeAcademicYearId: current } : null;
  const writes: string[] = [];
  const services = {
    settings: {
      getAdminSettings: async () => settings,
      create: async (data: any) => {
        writes.push('settings');
        settings = { currentAcademicYear: data.currentAcademicYear, activeAcademicYearId: data.currentAcademicYear };
        rows.push({ id: current, label: current, ...defaultSchoolYearCalendar(current), status: 'open', provenance: 'assumed' });
        return settings;
      },
    },
    years: {
      list: async () => ({ years: rows, activeAcademicYearId: settings?.activeAcademicYearId }),
      create: async (data: any) => { writes.push(data.label); const row = { ...data, id: data.label, status: 'draft' }; rows.push(row); return row; },
      verifyCalendar: async (id: string) => { writes.push(`verify:${id}`); rows.find((row) => row.id === id).provenance = 'verified'; },
    },
    repository: {
      setStatus: async (id: string, status: string) => { rows.find((row) => row.id === id).status = status; },
    },
  };
  const prepare = (label: string) => prepareDemoYear(services.settings as any, services.years as any, services.repository as any, label);
  return { prepare, rows, writes, settings: () => settings, current };
}

it('adds multiple demo years without recreating settings or changing the active pointer', async () => {
  const seed = fixture();
  await seed.prepare('2023-2024');
  await seed.prepare('2024-2025');
  await seed.prepare('2023-2024');
  expect(seed.rows.map((year) => year.label)).toEqual([seed.current, '2023-2024', '2024-2025']);
  expect(seed.writes).toEqual(['2023-2024', '2024-2025']);
  expect(seed.settings()?.activeAcademicYearId).toBe(seed.current);
});

it('installs fresh school settings in the current year while seeding a historical year', async () => {
  const seed = fixture(false);
  await seed.prepare('2023-2024');
  expect(seed.settings()?.currentAcademicYear).toBe(seed.current);
  expect(seed.rows.every((year) => year.provenance === 'verified' && year.status === 'open')).toBe(true);
});

it('refuses an existing unverified, draft, or different calendar without rewriting it', async () => {
  for (const change of [
    { provenance: 'assumed' }, { status: 'draft' }, { instructionEndsOn: '2024-05-31' },
  ]) {
    const seed = fixture();
    seed.rows.push({ id: '2023-2024', label: '2023-2024', ...defaultSchoolYearCalendar('2023-2024'), status: 'open', provenance: 'verified', ...change });
    await expect(seed.prepare('2023-2024')).rejects.toThrow();
    expect(seed.writes).toEqual([]);
  }
});
