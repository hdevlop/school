import { describe, expect, it } from 'bun:test';

// Mock the complete seed container in a subprocess so no database or global
// module mocks can leak into this test process or another suite.
async function recordReset(includeAcademic?: boolean, failOn?: string) {
  const child = Bun.spawn([process.execPath, '--eval', `
    import { mock } from 'bun:test';
    const names = [
      'PaymentService', 'AllocationService', 'InstallmentService', 'FeeService',
      'StudentService', 'StudentEnrollmentService', 'TeacherService', 'StaffService',
      'PayrollService', 'VehicleAssignmentService', 'StudentRouteService', 'VehicleService',
      'DriverService', 'ParentService', 'SettingsService', 'AcademicYearRepository',
      'AcademicYearTransitionRepository', 'AcademicYearMigrationIssueRepository',
      'ExpenseService', 'GradeService', 'AssessmentService', 'ExamService',
      'AttendanceService', 'AlertRepository', 'AnnouncementRepository', 'EventService',
      'RefuelService', 'MaintenanceService', 'DisciplineService', 'BehaviorRewardService',
      'ClassRoutineService', 'RolloverService', 'SectionService', 'ClassService',
      'SubjectService', 'FeeTypeService', 'CycleService',
    ];
    mock.module('@sms/server/modules/seed', () => Object.fromEntries(names.map(name => [name, { name }])));
    const { clearDemoData } = await import(${JSON.stringify(new URL('./reset-demo.ts', import.meta.url).href)});
    const calls = [];
    const server = { container: { resolve: async (service) => new Proxy({}, {
      get: (_, method) => method === 'then' ? undefined : async () => {
        const call = service.name + '.' + String(method);
        calls.push(call);
        if (call === ${JSON.stringify(failOn)}) throw new Error('Reset failed');
      },
    }) } };
    console.log = () => {};
    let error;
    try { await clearDemoData(server, ${includeAcademic === undefined ? 'undefined' : JSON.stringify({ includeAcademic })}); }
    catch (caught) { error = caught.message; }
    process.stdout.write(JSON.stringify({ calls, error }));
  `], { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(stderr).toBe('');
  expect(code).toBe(0);
  return JSON.parse(stdout) as { calls: string[]; error?: string };
}

describe('interactive school reset cleanup', () => {
  it('preserves academic structure by default', async () => {
    const { calls, error } = await recordReset();
    expect(error).toBeUndefined();
    expect(calls.filter(call => /^(Cycle|Section|Class|Subject|FeeType)Service\./.test(call))).toEqual([]);
    expect(calls.at(-1)).toBe('AcademicYearRepository.clearForSeedReset');
  });

  it('removes academic structure after its dependents, across all years', async () => {
    const { calls, error } = await recordReset(true);
    expect(error).toBeUndefined();
    const section = calls.indexOf('SectionService.clearForSeedReset');
    for (const dependency of [
      'ClassRoutineService.clearForSeedReset', 'RolloverService.clearForSeedReset',
      'StudentEnrollmentService.clearForSeedReset', 'StudentService.deleteAll',
      'TeacherService.clearForSeedReset', 'StaffService.clearAssignmentsForSeedReset',
      'FeeService.clearForSeedReset',
    ]) {
      expect(calls.indexOf(dependency)).toBeGreaterThanOrEqual(0);
      expect(calls.indexOf(dependency)).toBeLessThan(section);
    }
    expect(calls.slice(section, section + 5)).toEqual([
      'SectionService.clearForSeedReset', 'ClassService.clearForSeedReset',
      'CycleService.clearForSeedReset',
      'SubjectService.clearForSeedReset', 'FeeTypeService.deleteAll',
    ]);
    expect(calls.at(-1)).toBe('AcademicYearRepository.clearForSeedReset');
  });

  it('stops before academic deletion when dependent cleanup fails', async () => {
    const { calls, error } = await recordReset(true, 'TeacherService.clearForSeedReset');
    expect(error).toBe('Reset failed');
    expect(calls).not.toContain('SectionService.clearForSeedReset');
    expect(calls).not.toContain('CycleService.clearForSeedReset');
    expect(calls).not.toContain('AcademicYearRepository.clearForSeedReset');
  });
});
