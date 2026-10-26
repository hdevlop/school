import { describe, expect, it } from 'bun:test';

async function runSeed(initiallyInstalled: boolean, includeSettings = true, levels = 'primaire', year: string | null = '2025-2026', registeredYears: string[] = []) {
  const args = [...(year ? [`--year=${year}`] : []), `--levels=${levels}`];
  const child = Bun.spawn([process.execPath, '--eval', `
    import { mock } from 'bun:test';
    process.argv = ['bun', 'seed-academic.ts', ...${JSON.stringify(args)}];
    const tokens = ['SubjectService', 'ClassService', 'ClassRepository', 'SectionService', 'FeeTypeService', 'SettingsService', 'AcademicYearRepository', 'CycleService'];
    mock.module('@sms/server/modules/seed', () => Object.fromEntries(tokens.map(name => [name, { name }])));
    let settings = ${initiallyInstalled ? JSON.stringify({ schoolName: 'Existing school', currentAcademicYear: '2026-2027', activeAcademicYearId: 'keep-active' }) : 'null'};
    const createdSettings = [];
    const classes = [];
    const sections = [];
    const cycles = [];
    const subjects = [];
    const services = {
      SettingsService: {
        getAdminSettings: async () => settings,
        create: async (data) => { createdSettings.push(data); settings = data; },
      },
      SubjectService: { seedDemoSubjects: async (data) => { subjects.push(...data); return data; } },
      ClassService: { seedDemoClasses: async (data) => { classes.push(...data); return data; } },
      ClassRepository: { getByName: async (name, year) => ({ id: year + ':' + name }) },
      SectionService: { seedDemoSections: async (data) => { sections.push(...data); return data; } },
      FeeTypeService: { seedDemoFeeTypes: async (data) => data },
      CycleService: { seedDefaultCycles: async (stages) => {
        const added = stages.filter(stage => !cycles.includes(stage.name));
        cycles.push(...added.map(stage => stage.name));
        return added;
      } },
      AcademicYearRepository: { list: async () => ${JSON.stringify(registeredYears)}.map(label => ({ label })) },
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
    process.stdout.write(JSON.stringify({ settings, createdSettings, classes, sections, cycles, subjects, starts, error }));
  `], { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(stderr).toBe('');
  expect(code).toBe(0);
  return JSON.parse(stdout);
}

describe('default school data seed', () => {
  it('passes only the selected cycles subjects to the seed service', async () => {
    const primary = await runSeed(true);
    expect(primary.error).toBeUndefined();
    const codes = primary.subjects.map((subject: { code: string }) => subject.code);
    expect(codes).toEqual(expect.arrayContaining(['EI', 'SCI', 'ART', 'HG']));
    for (const code of ['AMZ', 'PHY', 'SVT', 'ENG', 'HIST', 'GEO']) expect(codes).not.toContain(code);
    const preschool = await runSeed(true, true, 'maternelle');
    expect(preschool.error).toBeUndefined();
    expect(preschool.subjects.every((subject: { code: string }) => subject.code.startsWith('PRE'))).toBe(true);
  });

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

  it('adds the cycles of the chosen levels once, before their classes', async () => {
    const result = await runSeed(false, true, 'maternelle,primaire');
    expect(result.error).toBeUndefined();
    expect(result.cycles).toEqual(['Maternelle', 'Primaire']);
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

  it('gives every registered year the same classes and sections when no year is named', async () => {
    const result = await runSeed(true, true, 'primaire', null, ['2025-2026', '2026-2027']);
    expect(result.error).toBeUndefined();
    const years = (rows: { academicYear: string; name: string }[], year: string) => rows.filter((row) => row.academicYear === year);
    expect(years(result.classes, '2025-2026').length).toBeGreaterThan(0);
    expect(years(result.classes, '2025-2026').map((row) => row.name))
      .toEqual(years(result.classes, '2026-2027').map((row) => row.name));
    expect(result.classes).toHaveLength(years(result.classes, '2025-2026').length * 2);
    const sectionYears = new Set(result.sections.map((row: { classId: string }) => row.classId.split(':')[0]));
    expect([...sectionYears].sort()).toEqual(['2025-2026', '2026-2027']);
  });

  it('puts the classes in the active year when no year is registered', async () => {
    const result = await runSeed(true, true, 'primaire', null);
    expect(result.error).toBeUndefined();
    expect(result.createdSettings).toEqual([]);
    expect(result.classes.length).toBeGreaterThan(0);
    expect(result.classes.every((row: { academicYear: string }) => row.academicYear === '2026-2027')).toBe(true);
    expect(result.sections.every((row: { classId: string }) => row.classId.startsWith('2026-2027:'))).toBe(true);
  });

  it('installs the current teaching year when no year is named on a fresh school', async () => {
    const result = await runSeed(false, true, 'primaire', null);
    const { getSeedAcademicYear } = await import('../shared/academic-year');
    expect(result.error).toBeUndefined();
    expect(result.createdSettings).toHaveLength(1);
    expect(result.settings.currentAcademicYear).toBe(getSeedAcademicYear());
    expect(result.classes.every((row: { academicYear: string }) => row.academicYear === getSeedAcademicYear())).toBe(true);
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
