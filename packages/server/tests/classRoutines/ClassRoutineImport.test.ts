import { describe, expect, it } from 'bun:test';
import { getTransactionalMethods } from 'najm-database';
import type { RoutineJson } from '@sms/contracts';
import { ClassRoutineService } from '../../src/modules/classRoutines/ClassRoutineService';
import { ClassRoutineValidator } from '../../src/modules/classRoutines/ClassRoutineValidator';

const document = (routines: Partial<RoutineJson['routines'][number]>[] = [{}]): RoutineJson => ({
  format: 'school-class-routines',
  version: 1,
  schoolYear: '2026-2027',
  exportedAt: '2026-11-01T10:00:00.000Z',
  routines: routines.map((routine) => ({
    className: 'CP',
    sectionName: 'A',
    name: 'CP A',
    periods: [
      { type: 'lesson', name: 'P1', startTime: '08:30', endTime: '09:30' },
      { type: 'break', name: 'Lunch', startTime: '12:30', endTime: '13:30' },
    ],
    lessons: [{ day: 'monday', period: 1, subject: 'Mathématiques', subjectCode: 'MATH', teacher: 'Sara Idrissi', roomNumber: null, notes: null, contentGroups: [] }],
    duties: [{ day: 'monday', period: 2, staff: 'Omar Alami', notes: null }],
    ...routine,
  })),
});

function build(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const repository = {
    getSectionsInSelectedYear: async () => [
      { id: 'cp-a', name: 'A', className: 'CP' },
      { id: 'cp-b', name: 'B', className: 'CP' },
    ],
    getSubjects: async () => [{ id: 'math', name: 'Maths (old name)', code: 'MATH' }, { id: 'fr', name: 'Français', code: null }],
    getDutyCandidates: async () => [{ staffId: 'omar', staffName: 'Omar Alami', staffRole: 'supervisor', teacherId: null }],
    getSchoolTeachingDays: async () => ['monday', 'tuesday'],
    getPublishedForSection: async (sectionId: string) => (sectionId === 'cp-a' ? { id: 'existing' } : undefined),
    createSchedule: async (data: { sectionId: string }) => { calls.push(`create:${data.sectionId}`); return { id: `new-${data.sectionId}` }; },
    clearScheduleContent: async (id: string) => { calls.push(`clear:${id}`); },
    updateSchedule: async (id: string, data: { name: string }) => { calls.push(`name:${id}:${data.name}`); },
    getAssignmentsForSection: async () => [{ id: 'assign-sara', subjectId: 'math', teacherName: 'sara idrissi' }],
    ...overrides,
  };
  const validator = new ClassRoutineValidator(repository as any);
  Object.defineProperty(validator, 'year', { value: { label: '2026-2027' } });
  const service = new ClassRoutineService(repository as any, validator);
  service.updateLayout = async (id, layout) => {
    calls.push(`layout:${id}:${layout.periods.map((period) => period.type).join(',')}`);
    return { periods: layout.periods.map((_, index) => ({ id: `${id}-p${index + 1}` })) } as any;
  };
  service.addEntry = async (id, entry) => { calls.push(`lesson:${id}:${entry.periodId}:${entry.subjectId}:${entry.teacherAssignmentId}`); return {} as any; };
  service.addDuty = async (id, duty) => { calls.push(`duty:${id}:${duty.periodId}:${duty.staffId}`); return {} as any; };
  return { service, calls };
}

// The validator's `t` has no translator outside the app, so refusals are told
// apart by what was written before them; `test:server-i18n` covers the messages.
describe('routine JSON import', () => {
  it('runs in one transaction', () => {
    expect(getTransactionalMethods(ClassRoutineService).some(({ propertyKey }) => propertyKey === 'importDocument')).toBe(true);
  });

  it('replaces named timetables, clearing every target before adding any lesson', async () => {
    const { service, calls } = build();
    const result = await service.importDocument(document([{}, { sectionName: 'b', name: 'CP B', duties: [] }]));
    expect(result).toEqual({ routines: 2, lessons: 2, duties: 1, teachersNotAssigned: 0 });
    expect(calls).toEqual([
      'clear:existing', 'name:existing:CP A',
      'create:cp-b', 'clear:new-cp-b', 'name:new-cp-b:CP B',
      'layout:existing:lesson,break',
      // Subject by code (its name changed), teacher by name, period by position.
      'lesson:existing:existing-p1:math:assign-sara',
      'duty:existing:existing-p2:omar',
      'layout:new-cp-b:lesson,break',
      'lesson:new-cp-b:new-cp-b-p1:math:assign-sara',
    ]);
  });

  it('keeps a lesson whose teacher does not teach it there, without the teacher, and counts it', async () => {
    const { service, calls } = build({ getAssignmentsForSection: async () => [] });
    const result = await service.importDocument(document());
    expect(result.teachersNotAssigned).toBe(1);
    expect(calls).toContain('lesson:existing:existing-p1:math:null');
  });

  it('refuses another year, unknown sections, subjects and staff before changing anything', async () => {
    const cases: RoutineJson[] = [
      { ...document(), schoolYear: '2025-2026' },
      document([{ className: 'CE1' }]),
      document([{ lessons: [{ day: 'monday', period: 1, subject: 'Chimie', subjectCode: null, contentGroups: [] }] }]),
      document([{ duties: [{ day: 'monday', period: 2, staff: 'Nobody' }] }]),
    ];
    for (const file of cases) {
      const { service, calls } = build();
      await expect(service.importDocument(file)).rejects.toThrow();
      expect(calls).toEqual([]);
    }
  });

  it('refuses a section name two sections share', async () => {
    const { service, calls } = build({ getSectionsInSelectedYear: async () => [{ id: 'one', name: 'A', className: 'CP' }, { id: 'two', name: ' a ', className: 'cp' }] });
    await expect(service.importDocument(document())).rejects.toThrow();
    expect(calls).toEqual([]);
  });

  it('names the timetable whose lesson a rule refused', async () => {
    const { service, calls } = build();
    const refused = Object.assign(new Error('teacher conflict'), { status: 409 });
    service.addEntry = async () => { throw refused; };
    const named: unknown[] = [];
    (service as any).validator.refuseImportOf = (routine: string, error: unknown) => { named.push(routine, error); throw error; };
    await expect(service.importDocument(document())).rejects.toBe(refused);
    expect(named).toEqual(['CP A', refused]);
    expect(calls).toContain('layout:existing:lesson,break');
  });
});
