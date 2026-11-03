import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { FloorManagerDashboardService } from '../../src/modules/dashboard/floorManager/FloorManagerDashboardService';
import { FloorManagerDashboardValidator } from '../../src/modules/dashboard/floorManager/FloorManagerDashboardValidator';
import { withEnglishMessages } from '../support/englishMessages';

const MONDAY = '2026-09-28';
const SUNDAY = '2026-09-27';

const section = (sectionId: string, className: string, studentCount: number) => ({
  classId: `class-${className}`,
  className,
  sectionId,
  sectionName: 'A',
  roomNumber: null,
  studentCount,
});

const marked = (studentId: string, sectionId: string, status: 'absent' | 'late') => ({
  studentId,
  studentName: studentId,
  image: null,
  classId: 'class',
  className: 'CE1',
  sectionId,
  sectionName: 'A',
  status,
});

type Calls = Record<string, unknown[][]>;

function build(options: { manager?: unknown; at?: string; startTime?: string | null; empty?: boolean } = {}) {
  const calls: Calls = {};
  const record = (name: string, args: unknown[]) => { (calls[name] ??= []).push(args); };

  const repository = {
    getManager: async (...args: unknown[]) => {
      record('getManager', args);
      return 'manager' in options ? options.manager : { id: 'staff-1', name: 'Nadia Amrani', image: null, email: null, phone: null, address: null };
    },
    getGrades: async (...args: unknown[]) => { record('getGrades', args); return ['CE1', 'CE2']; },
    // s3 has no students, so it owes no register.
    getSections: async (...args: unknown[]) => {
      record('getSections', args);
      return options.empty ? [] : [section('s1', 'CE1', 30), section('s2', 'CE2', 28), section('s3', 'CE2', 0)];
    },
    getAttendanceByDay: async (...args: unknown[]) => {
      record('getAttendanceByDay', args);
      return options.empty ? [] : [
        { date: '2026-09-02', total: 40, attended: 20, absent: 20, late: 4 },
        { date: '2026-09-25', total: 50, attended: 45, absent: 5, late: 2 },
        { date: MONDAY, total: 30, attended: 27, absent: 3, late: 1 },
      ];
    },
    getStudentsByGender: async (...args: unknown[]) => {
      record('getStudentsByGender', args);
      return options.empty ? [] : [{ gender: 'F', value: 28 }, { gender: 'M', value: 30 }];
    },
    getMarkedStudents: async (...args: unknown[]) => {
      record('getMarkedStudents', args);
      return options.empty ? [] : [marked('st1', 's1', 'absent'), marked('st2', 's1', 'absent'), marked('st3', 's1', 'late')];
    },
    getRegisteredSectionIds: async (...args: unknown[]) => { record('getRegisteredSectionIds', args); return ['s1']; },
    getOpenIncidents: async (...args: unknown[]) => { record('getOpenIncidents', args); return { total: 7, rows: [] }; },
  };
  const settingsRepository = {
    getPublicSettings: async () => ({
      timeZone: 'UTC',
      teachingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      schoolStartTime: options.startTime === undefined ? '08:00' : options.startTime,
    }),
  };
  const academicYears = {
    resolve: async (...args: unknown[]) => {
      record('resolve', args);
      return { id: 'year-1', label: '2026-2027', reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' };
    },
  };
  const notifications = {
    unreadCount: async (...args: unknown[]) => { record('unreadCount', args); return 2; },
  };

  const service = new FloorManagerDashboardService(
    repository as any,
    settingsRepository as any,
    academicYears as any,
    notifications as any,
    withEnglishMessages(new FloorManagerDashboardValidator()),
  );
  service.now = () => new Date(options.at ?? `${MONDAY}T09:30:00Z`);
  return { service, calls };
}

const user = { id: 'user-1', role: 'floor_manager' };

describe('floor manager dashboard overview', () => {
  let savedOverride: string | undefined;
  beforeEach(() => { savedOverride = process.env.APP_BUSINESS_DATE; delete process.env.APP_BUSINESS_DATE; });
  afterEach(() => {
    if (savedOverride === undefined) delete process.env.APP_BUSINESS_DATE;
    else process.env.APP_BUSINESS_DATE = savedOverride;
  });

  it('resolves the floor manager and their sections from the session', async () => {
    const { service, calls } = build();
    const overview = await service.getOverview(user);

    expect(calls.getManager).toEqual([['user-1']]);
    expect(calls.getGrades).toEqual([['staff-1', MONDAY]]);
    expect(calls.getSections).toEqual([['user-1', '2026-2027']]);
    expect(calls.getMarkedStudents).toEqual([[['s1', 's2', 's3'], MONDAY]]);
    expect(calls.getAttendanceByDay).toEqual([[['s1', 's2', 's3'], '2026-09-01', MONDAY]]);
    expect(calls.getStudentsByGender).toEqual([[['s1', 's2', 's3']]]);
    expect(calls.unreadCount).toEqual([['user-1']]);
    expect(overview.manager).toMatchObject({ id: 'staff-1', grades: ['CE1', 'CE2'] });
  });

  it('counts today per section and owes a register only from a section with students', async () => {
    const { service } = build();
    const overview = await service.getOverview(user);

    expect(overview.schoolDay).toBe(true);
    expect(overview.sections.map(({ sectionId, registerTaken, absent, late }) => ({ sectionId, registerTaken, absent, late }))).toEqual([
      { sectionId: 's1', registerTaken: true, absent: 2, late: 1 },
      { sectionId: 's2', registerTaken: false, absent: 0, late: 0 },
      { sectionId: 's3', registerTaken: false, absent: 0, late: 0 },
    ]);
    expect(overview.kpis).toEqual({
      totalStudents: 58,
      sections: 3,
      absentToday: 2,
      lateToday: 1,
      attendanceRate: 90,
      unreadNotifications: 2,
    });
    expect(overview.attention).toEqual({ missingRegisters: 1, absentToday: 2, openIncidents: 7, unreadNotifications: 2 });
  });

  it('owes no register before the school day starts or on a day off', async () => {
    const early = await build({ at: `${MONDAY}T07:30:00Z` }).service.getOverview(user);
    expect(early.attention.missingRegisters).toBe(0);

    const sunday = await build({ at: `${SUNDAY}T10:00:00Z` }).service.getOverview(user);
    expect(sunday.schoolDay).toBe(false);
    expect(sunday.attention.missingRegisters).toBe(0);
  });

  it('returns gender totals and a full year of monthly marks without changing the seven-day rate', async () => {
    const { service } = build();
    const overview = await service.getOverview(user);
    expect(overview.studentsByGender).toEqual([
      { gender: 'F', value: 28 },
      { gender: 'M', value: 30 },
    ]);
    expect(overview.studentsByGender.reduce((sum, row) => sum + row.value, 0)).toBe(overview.kpis.totalStudents);
    expect(overview.attendanceMonthly.monthly).toHaveLength(12);
    expect(overview.attendanceMonthly.monthly[0]).toEqual({ month: '2026-09', absent: 28, late: 7 });
    expect(overview.attendanceMonthly.monthly[1]).toEqual({ month: '2026-10', absent: 0, late: 0 });
    expect(overview.attendanceMonthly.monthly.at(-1)?.month).toBe('2027-08');
    expect(overview.attendanceMonthly.todayAbsent).toBe(2);
    expect(overview.attendanceMonthly.todayLate).toBe(1);
    expect(overview.kpis.attendanceRate).toBe(90);
  });

  it('returns empty chart figures when no grades are assigned', async () => {
    const { service, calls } = build({ empty: true });
    const overview = await service.getOverview(user);
    expect(calls.getStudentsByGender).toEqual([[[]]]);
    expect(calls.getAttendanceByDay).toEqual([[[], '2026-09-01', MONDAY]]);
    expect(overview.studentsByGender).toEqual([]);
    expect(overview.kpis.totalStudents).toBe(0);
    expect(overview.kpis.attendanceRate).toBeNull();
    expect(overview.attendanceMonthly.monthly.every((row) => row.absent === 0 && row.late === 0)).toBe(true);
  });

  it('refuses an account without a staff record', async () => {
    const { service } = build({ manager: null });
    await expect(service.getOverview(user)).rejects.toMatchObject({ message: 'Staff member not found' });
  });
});
