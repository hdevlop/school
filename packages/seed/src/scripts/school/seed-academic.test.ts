import { describe, expect, it } from 'bun:test';

async function runSeed(initiallyInstalled: boolean, includeSettings = true, levels = 'primaire') {
  const child = Bun.spawn([process.execPath, '--eval', `
    import { mock } from 'bun:test';
    process.argv = ['bun', 'seed-academic.ts', '--year=2025-2026', ${JSON.stringify(`--levels=${levels}`)}];
    const tokens = ['SubjectService', 'ClassService', 'ClassRepository', 'SectionService', 'FeeTypeService', 'SettingsService'];
    mock.module('@sms/server/modules/seed', () => Object.fromEntries(tokens.map(name => [name, { name }])));
    let settings = ${initiallyInstalled ? JSON.stringify({ schoolName: 'Existing school', currentAcademicYear: '2026-2027', activeAcademicYearId: 'keep-active' }) : 'null'};
    const createdSettings = [];
    const classes = [];
    const sections = [];
    const services = {
      SettingsService: {
        getAdminSettings: async () => settings,
        create: async (data) => { createdSettings.push(data); settings = data; },
      },
      SubjectService: { seedDemoSubjects: async (data) => data },
      ClassService: { seedDemoClasses: async (data) => { classes.push(...data); return data; } },
      ClassRepository: { getByName: async (name, year) => ({ id: year + ':' + name }) },
      SectionService: { seedDemoSections: async (data) => { sections.push(...data); return data; } },
      FeeTypeService: { seedDemoFeeTypes: async (data) => data },
    };
    const server = { container: { resolve: async (token) => services[token.name] } };
    let starts = 0;
    mock.module(${JSON.stringify(new URL('../shared/run-seed.ts', import.meta.url).href)}, () => ({
      runSeedTask: async (_, task) => { starts++; await task(server); },
    }));
    console.log = () => {};
    const { seedAcademic } = await import(${JSON.stringify(new URL('./seed-academic.ts', import.meta.url).href)});
    let error;
    try {
      await seedAcademic({ includeSettings: ${includeSettings} });
      await seedAcademic({ includeSettings: ${includeSettings} });
    } catch (caught) { error = caught.message; }
    process.stdout.write(JSON.stringify({ settings, createdSettings, classes, sections, starts, error }));
  `], { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(stderr).toBe('');
  expect(code).toBe(0);
  return JSON.parse(stdout);
}

describe('default school data seed', () => {
  it('creates settings once for the selected year and links sections to persisted classes', async () => {
    const result = await runSeed(false);
    expect(result.error).toBeUndefined();
    expect(result.createdSettings).toHaveLength(1);
    expect(result.settings.currentAcademicYear).toBe('2025-2026');
    expect(result.settings.currency).toBe('MAD');
    expect(result.classes.length).toBeGreaterThan(0);
    expect(result.classes.every((row: { academicYear: string; level: string }) =>
      row.academicYear === '2025-2026' && row.level.toLowerCase() === 'primaire')).toBe(true);
    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.sections.every((row: { classId: string }) => row.classId.startsWith('2025-2026:'))).toBe(true);
  });

  it('preserves existing school settings and the active year', async () => {
    const result = await runSeed(true);
    expect(result.error).toBeUndefined();
    expect(result.createdSettings).toEqual([]);
    expect(result.settings).toEqual({
      schoolName: 'Existing school', currentAcademicYear: '2026-2027', activeAcademicYearId: 'keep-active',
    });
    expect(result.classes.length).toBeGreaterThan(0);
  });

  it('leaves settings absent for the existing academic-only seed', async () => {
    const result = await runSeed(false, false);
    expect(result.error).toBeUndefined();
    expect(result.settings).toBeNull();
    expect(result.createdSettings).toEqual([]);
    expect(result.classes.length).toBeGreaterThan(0);
  });

  it('rejects invalid levels before initializing or writing defaults', async () => {
    const result = await runSeed(false, true, 'invalid');
    expect(result.error).toContain('Unknown level');
    expect(result.starts).toBe(0);
    expect(result.createdSettings).toEqual([]);
    expect(result.classes).toEqual([]);
  });
});
