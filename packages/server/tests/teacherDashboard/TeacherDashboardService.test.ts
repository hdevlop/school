import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { TeacherDashboardService } from '../../src/modules/dashboard/teacher/TeacherDashboardService';

const TODAY = '2026-09-28'; // a Monday
const WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const assignment = (id: string, sectionId: string, className: string, subjectName: string, studentCount: number) => ({
  teacherAssignmentId: id,
  classId: `class-${className}`,
  className,
  sectionId,
  sectionName: 'A',
  subjectId: `subject-${subjectName}`,
  subjectName,
  studentCount,
});

const entry = (entryId: string, dayOfWeek: string, startTime: string, endTime: string, lesson: ReturnType<typeof assignment>, activeDays = WEEK) => ({
  entryId,
  dayOfWeek,
  activeDays,
  teacherAssignmentId: lesson.teacherAssignmentId,
  classId: lesson.classId,
  className: lesson.className,
  sectionId: lesson.sectionId,
  sectionName: lesson.sectionName,
  subjectId: lesson.subjectId,
  subjectName: lesson.subjectName,
  roomNumber: 'A201',
  startTime,
  endTime,
});

const math1A = assignment('a1', 's1', '1A', 'Math', 30);
const physics1A = assignment('a2', 's1', '1A', 'Physics', 30);
const math2B = assignment('a3', 's2', '2B', 'Math', 28);

type Calls = Record<string, unknown[][]>;

const inRange = <T extends { date: string }>(args: unknown[], rows: T[]) => {
  const [, from, to] = args as [unknown, string, string];
  return rows.filter((row) => row.date >= from && row.date <= to);
};

function build(options: { mode?: 'daily' | 'per_class'; teacher?: unknown } = {}) {
  const calls: Calls = {};
  const record = (name: string, args: unknown[]) => { (calls[name] ??= []).push(args); };

  const repository = {
    getAssignments: async (...args: unknown[]) => { record('getAssignments', args); return [math1A, physics1A, math2B]; },
    getWeekEntries: async (...args: unknown[]) => {
      record('getWeekEntries', args);
      return [
        entry('e1', 'monday', '08:00:00', '08:50:00', math1A),
        entry('e2', 'monday', '09:00:00', '09:50:00', math2B),
        entry('e3', 'monday', '11:00:00', '11:50:00', physics1A),
        entry('e4', 'tuesday', '08:00:00', '08:50:00', math2B),
        entry('e5', 'monday', '13:00:00', '13:50:00', math2B, ['tuesday']),
      ];
    },
    // Like the queries, these return only the rows inside [from, to].
    getRegisters: async (...args: unknown[]) => {
      record('getRegisters', args);
      return inRange(args, [
        { date: TODAY, sectionId: 's1', teacherAssignmentId: 'a1' },
        { date: '2026-09-22', sectionId: 's2', teacherAssignmentId: 'a3' },
      ]);
    },
    getAttendanceByDay: async (...args: unknown[]) => {
      record('getAttendanceByDay', args);
      return inRange(args, [
        { date: '2026-09-15', total: 50, attended: 40 },
        { date: '2026-09-22', total: 50, attended: 46 },
        { date: TODAY, total: 50, attended: 44 },
      ]);
    },
    getAssessments: async (...args: unknown[]) => {
      record('getAssessments', args);
      return [
        { id: 'quiz', title: 'Quiz', type: 'quiz', status: 'completed', date: '2026-09-20', className: '1A', sectionName: 'A', subjectName: 'Math', gradedCount: 12, studentCount: 30 },
        { id: 'test', title: 'Test', type: 'quiz', status: 'completed', date: '2026-09-18', className: '2B', sectionName: 'A', subjectName: 'Math', gradedCount: 28, studentCount: 28 },
        { id: 'final', title: 'Final', type: 'final', status: 'scheduled', date: '2026-10-10', className: '1A', sectionName: 'A', subjectName: 'Physics', gradedCount: 0, studentCount: 30 },
      ];
    },
    countOpenIncidents: async (...args: unknown[]) => { record('countOpenIncidents', args); return 2; },
  };
  const teacherRepository = {
    getByUserId: async (...args: unknown[]) => {
      record('getByUserId', args);
      return 'teacher' in options ? options.teacher : { id: 't1', name: 'Sara Benali', specialization: 'Mathematics', image: null };
    },
  };
  const routineRepository = {
    getTeacherScheduleIds: async (...args: unknown[]) => { record('getTeacherScheduleIds', args); return ['sched-1', 'sched-2']; },
  };
  const settingsRepository = {
    getPublicSettings: async () => ({ timeZone: 'UTC', attendanceMode: options.mode ?? 'daily' }),
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

  const service = new TeacherDashboardService(
    repository as any,
    teacherRepository as any,
    routineRepository as any,
    settingsRepository as any,
    academicYears as any,
    notifications as any,
  );
  // 09:30 on the school clock: e1 is over, e2 is running, e3 starts in 90 minutes.
  service.now = () => new Date(`${TODAY}T09:30:00Z`);
  return { service, calls };
}

const user = { id: 'user-1', role: 'teacher' };

describe('teacher dashboard overview', () => {
  let savedOverride: string | undefined;
  beforeEach(() => { savedOverride = process.env.APP_BUSINESS_DATE; delete process.env.APP_BUSINESS_DATE; });
  afterEach(() => {
    if (savedOverride === undefined) delete process.env.APP_BUSINESS_DATE;
    else process.env.APP_BUSINESS_DATE = savedOverride;
  });

  it('resolves the teacher from the session and reads only their own lessons', async () => {
    const { service, calls } = build();
    await service.getOverview(user);
    expect(calls.getByUserId).toEqual([['user-1']]);
    expect(calls.resolve).toEqual([[undefined, 'teacher']]);
    expect(calls.getAssignments).toEqual([['t1', '2026-2027']]);
    expect(calls.getWeekEntries).toEqual([['t1', ['sched-1', 'sched-2']]]);
    expect(calls.getAssessments).toEqual([['t1', 'year-1']]);
    expect(calls.countOpenIncidents).toEqual([[['s1', 's2']]]);
    expect(calls.getRegisters?.[0]?.[0]).toEqual({ mode: 'daily', sectionIds: ['s1', 's2'], assignmentIds: ['a1', 'a2', 'a3'] });
  });

  it('lays out today on the school clock', async () => {
    const { service } = build();
    const overview = await service.getOverview(user);

    expect(overview.date).toBe(TODAY);
    expect(overview.todaySessions.map((session) => [session.entryId, session.status, session.attendanceTaken])).toEqual([
      ['e1', 'completed', true],
      ['e2', 'inProgress', false],
      ['e3', 'upcoming', true],
    ]);
    expect(overview.todaySessions[2].minutesUntilStart).toBe(90);
    expect(overview.todaySessions[0].startTime).toBe('08:00');
    expect(overview.nextSession?.entryId).toBe('e2');
  });

  it('counts what needs attention and the headline figures', async () => {
    const { service } = build();
    const overview = await service.getOverview(user);

    expect(overview.attention).toEqual({
      missingAttendance: 1, // e2 started without a register for s2
      missingGrades: 1, // the quiz, graded 12 of 30
      unreadNotifications: 3,
      openConcerns: 2,
    });
    expect(overview.kpis).toEqual({
      totalStudents: 58, // s1 counted once across Math and Physics
      classesToday: 3,
      pendingTasks: 2,
      attendanceRate: 90, // (46 + 44) of 100 over the last 7 days; the 15th is older
      unreadNotifications: 3,
    });
    expect(overview.assessments.map((item) => item.id)).toEqual(['quiz', 'final', 'test']);
  });

  it('matches per-lesson registers by assignment', async () => {
    const { service, calls } = build({ mode: 'per_class' });
    const overview = await service.getOverview(user);
    // The only register today is a1's, so Physics in the same section is not covered.
    expect(overview.todaySessions.map((session) => session.attendanceTaken)).toEqual([true, false, false]);
    expect((calls.getRegisters?.[0]?.[0] as { mode: string }).mode).toBe('per_class');
  });

  it('refuses a user without a teacher record', async () => {
    const { service } = build({ teacher: null });
    await expect(service.getOverview(user)).rejects.toThrow();
  });
});

describe('teacher attendance trend', () => {
  it('compares the period with the one before it', async () => {
    const { service, calls } = build();
    const trend = await service.getAttendanceTrend(user, '7d');

    expect(calls.getAttendanceByDay?.[0]?.slice(1)).toEqual(['2026-09-15', TODAY]);
    expect(calls.getRegisters?.[0]?.slice(1)).toEqual(['2026-09-22', TODAY]);
    expect(trend.points.map((point) => point.date)).toEqual([
      '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', TODAY,
    ]);
    expect(trend.points[0].rate).toBe(92);
    expect(trend.points[1].rate).toBeNull();
    expect(trend.rate).toBe(90); // (46 + 44) / 100
    expect(trend.previousRate).toBe(80); // 40 / 50 on the 15th
    expect(trend.change).toBe(10);
  });

  it('counts lessons held against lessons scheduled, today only once started', async () => {
    const { service } = build();
    const trend = await service.getAttendanceTrend(user, '7d');
    // Tue 22nd: e4, held (s2 has a register). Mon 28th: e1 held, e2 running
    // without one, e3 not started yet. e5's routine does not run on Mondays.
    expect(trend.sessionsScheduled).toBe(3);
    expect(trend.sessionsHeld).toBe(2);
  });
});
