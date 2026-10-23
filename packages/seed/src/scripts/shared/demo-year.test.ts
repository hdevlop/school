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

it('verifies the selected calendar once on a fresh current-year install', async () => {
  const seed = fixture(false);
  await seed.prepare(seed.current);
  expect(seed.writes).toEqual(['settings', `verify:${seed.current}`]);
  expect(seed.rows[0].provenance).toBe('verified');
});

it('verifies the default-data calendar once before adding demo data, preserving settings and dates', async () => {
  const seed = fixture();
  const year = seed.rows[0];
  year.provenance = 'assumed';
  const before = { ...year };
  const settings = { ...seed.settings() };
  await seed.prepare(seed.current);
  await seed.prepare(seed.current);
  expect(seed.writes).toEqual([`verify:${seed.current}`]);
  expect(year).toEqual({ ...before, provenance: 'verified' });
  expect(seed.settings()).toEqual(settings);
});

it('verifies an assumed historical demo calendar without changing the active year', async () => {
  const seed = fixture();
  seed.rows.push({ id: '2023-2024', label: '2023-2024', ...defaultSchoolYearCalendar('2023-2024'), status: 'closed', provenance: 'assumed' });
  expect(await seed.prepare('2023-2024')).toBe('2023-2024');
  expect(seed.writes).toEqual(['verify:2023-2024']);
  expect(seed.rows[1].status).toBe('closed');
  expect(seed.settings()?.activeAcademicYearId).toBe(seed.current);
});

it('refuses drafts and every mismatched calendar date before verifying or rewriting the year', async () => {
  const changes = [
    { status: 'draft' },
    { instructionStartsOn: '2023-09-02' },
    { instructionEndsOn: '2024-05-31' },
    { reportingStartsOn: '2023-08-01' },
    { reportingEndsOn: '2024-08-30' },
    { paymentCloseoutOn: '2024-07-15' },
  ];
  for (const provenance of ['assumed', 'verified']) {
    for (const change of changes) {
      const seed = fixture();
      const row = { id: '2023-2024', label: '2023-2024', ...defaultSchoolYearCalendar('2023-2024'), status: 'open', provenance, ...change };
      seed.rows.push({ ...row });
      await expect(seed.prepare('2023-2024')).rejects.toThrow();
      expect(seed.writes).toEqual([]);
      expect(seed.rows[1]).toEqual(row);
    }
  }
});
