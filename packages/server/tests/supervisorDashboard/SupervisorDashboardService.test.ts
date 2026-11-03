import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { SupervisorDashboardService } from '../../src/modules/dashboard/supervisor/SupervisorDashboardService';
import { FloorManagerDashboardValidator } from '../../src/modules/dashboard/floorManager/FloorManagerDashboardValidator';
import { withEnglishMessages } from '../support/englishMessages';

const MONDAY = '2026-09-28';

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
  className: '1AC',
  sectionId,
  sectionName: 'A',
  status,
});

const ALL = ['read:attendance', 'read:students', 'read:discipline', 'read:grades', 'read:visit-requests', 'read:teachers'];

type Calls = Record<string, unknown[][]>;

function build(options: { supervisor?: unknown } = {}) {
  const calls: Calls = {};
  const record = (name: string, args: unknown[]) => { (calls[name] ??= []).push(args); };

  const repository = {
    getSupervisor: async (...args: unknown[]) => {
      record('getSupervisor', args);
      return 'supervisor' in options ? options.supervisor : { id: 'staff-9', name: 'Karim Idrissi', image: null, email: null, phone: null, address: null };
    },
    getSections: async (...args: unknown[]) => {
      record('getSections', args);
      return [section('s1', '2AC', 30), section('s2', '1AC', 28), section('s3', '1AC', 0)];
    },
    getGradesByClass: async (...args: unknown[]) => {
      record('getGradesByClass', args);
      return [{ classId: 'class-1AC', className: '1AC', average: 64, passRate: 80, graded: 50 }];
    },
    getIncidentsByMonth: async (...args: unknown[]) => {
      record('getIncidentsByMonth', args);
      return [
        { month: '2026-09', severity: 'low', count: 3 },
        { month: '2026-09', severity: 'critical', count: 1 },
        // Outside the year's months: not charted.
        { month: '2025-06', severity: 'high', count: 9 },
      ];
    },
    getNewVisitRequestCount: async (...args: unknown[]) => { record('getNewVisitRequestCount', args); return 4; },
    getAbsentTeacherCount: async (...args: unknown[]) => { record('getAbsentTeacherCount', args); return 2; },
  };
  const sectionReads = {
    getAttendanceByDay: async (...args: unknown[]) => {
      record('getAttendanceByDay', args);
      return [{ date: MONDAY, total: 30, attended: 27, absent: 3, late: 1 }];
    },
    getStudentsByGender: async (...args: unknown[]) => {
      record('getStudentsByGender', args);
      return [{ gender: 'F', value: 30 }, { gender: 'M', value: 28 }];
    },
    getMarkedStudents: async (...args: unknown[]) => {
      record('getMarkedStudents', args);
      return [marked('st1', 's1', 'absent'), marked('st2', 's1', 'late')];
    },
    getRegisteredSectionIds: async (...args: unknown[]) => { record('getRegisteredSectionIds', args); return ['s1']; },
    getOpenIncidents: async (...args: unknown[]) => { record('getOpenIncidents', args); return { total: 6, rows: [] }; },
  };
  const settingsRepository = {
    getPublicSettings: async () => ({
      timeZone: 'Africa/Casablanca',
      teachingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      schoolStartTime: '08:00',
    }),
  };
  const academicYears = {
    resolve: async (...args: unknown[]) => {
      record('resolve', args);
      return { id: 'year-1', label: '2026-2027', reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' };
    },
  };
  const notifications = {
    unreadCount: async (...args: unknown[]) => { record('unreadCount', args); return 3; },
  };

  const service = new SupervisorDashboardService(
    repository as any,
    sectionReads as any,
    settingsRepository as any,
    academicYears as any,
    notifications as any,
    withEnglishMessages(new FloorManagerDashboardValidator()),
  );
  service.now = () => new Date(`${MONDAY}T10:30:00Z`);
  return { service, calls };
}

const user = (permissions: string[]) => ({ id: 'user-9', role: 'supervisor', permissions });

describe('supervisor dashboard overview', () => {
  let savedOverride: string | undefined;
  beforeEach(() => { savedOverride = process.env.APP_BUSINESS_DATE; delete process.env.APP_BUSINESS_DATE; });
  afterEach(() => {
    if (savedOverride === undefined) delete process.env.APP_BUSINESS_DATE;
    else process.env.APP_BUSINESS_DATE = savedOverride;
  });

  it('resolves the supervisor and their assigned sections from the session', async () => {
    const { service, calls } = build();
    const overview = await service.getOverview(user(ALL));

    expect(calls.getSupervisor).toEqual([['user-9']]);
    expect(calls.getSections).toEqual([['user-9', '2026-2027']]);
    expect(calls.getMarkedStudents).toEqual([[['s1', 's2', 's3'], MONDAY]]);
    expect(calls.getGradesByClass).toEqual([['year-1', ['s1', 's2', 's3']]]);
    expect(calls.getIncidentsByMonth).toEqual([[['s1', 's2', 's3'], '2026-09-01', MONDAY, 'Africa/Casablanca']]);
    expect(calls.unreadCount).toEqual([['user-9']]);
    expect(calls.getAbsentTeacherCount).toEqual([[MONDAY]]);
    expect(overview.absentTeachers).toBe(2);
    expect(overview.supervisor).toMatchObject({ id: 'staff-9', classes: ['2AC', '1AC'] });
  });

  it('counts today\'s registers like the floor manager\'s', async () => {
    const overview = await build().service.getOverview(user(ALL));

    expect(overview.schoolDay).toBe(true);
    expect(overview.attendance).toMatchObject({ absentToday: 1, lateToday: 1, missingRegisters: 1, attendanceRate: 90 });
    expect(overview.attendance?.sections.map(({ sectionId, registerTaken }) => ({ sectionId, registerTaken }))).toEqual([
      { sectionId: 's1', registerTaken: true },
      { sectionId: 's2', registerTaken: false },
      { sectionId: 's3', registerTaken: false },
    ]);
    expect(overview.attendance?.monthly).toHaveLength(12);
    expect(overview.students).toEqual({ total: 58, byGender: [{ gender: 'F', value: 30 }, { gender: 'M', value: 28 }] });
    expect(overview.grades?.byClass).toHaveLength(1);
    expect(overview.visitRequests).toEqual({ newRequests: 4 });
    expect(overview.unreadNotifications).toBe(3);
  });

  it('charts the year\'s incidents by month and severity', async () => {
    const overview = await build().service.getOverview(user(ALL));

    expect(overview.discipline?.openIncidents).toBe(6);
    expect(overview.discipline?.monthly).toHaveLength(12);
    expect(overview.discipline?.monthly[0]).toEqual({ month: '2026-09', low: 3, medium: 0, high: 0, critical: 1 });
    expect(overview.discipline?.monthly.reduce((sum, row) => sum + row.high, 0)).toBe(0);
  });

  // The roles screen decides the cards: a part the supervisor may not read is
  // neither queried nor sent.
  it('reads only the parts the supervisor holds a permission for', async () => {
    const { service, calls } = build();
    const overview = await service.getOverview(user(['read:discipline']));

    expect(overview.attendance).toBeNull();
    expect(overview.students).toBeNull();
    expect(overview.grades).toBeNull();
    expect(overview.visitRequests).toBeNull();
    expect(overview.absentTeachers).toBeNull();
    expect(overview.discipline?.openIncidents).toBe(6);
    for (const read of ['getAttendanceByDay', 'getMarkedStudents', 'getRegisteredSectionIds', 'getStudentsByGender', 'getGradesByClass', 'getNewVisitRequestCount', 'getAbsentTeacherCount']) {
      expect(calls[read], read).toBeUndefined();
    }
    expect(overview.unreadNotifications).toBe(3);
  });

  it('reads every part for a wildcard grant', async () => {
    const overview = await build().service.getOverview(user(['read:*']));
    for (const part of ['attendance', 'students', 'discipline', 'grades', 'visitRequests'] as const) {
      expect(overview[part], part).not.toBeNull();
    }
  });

  it('refuses a session without an account', async () => {
    await expect(build({ supervisor: null }).service.getOverview(user(ALL))).rejects.toMatchObject({ message: 'Staff member not found' });
  });
});
