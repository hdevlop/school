import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { ParentProfileController } from '../../src/modules/profiles/ParentProfileController';
import { ParentProfileService } from '../../src/modules/profiles/ParentProfileService';
import { StudentProfileController } from '../../src/modules/profiles/StudentProfileController';
import { StudentProfileService } from '../../src/modules/profiles/StudentProfileService';
import { TeacherProfileController } from '../../src/modules/profiles/TeacherProfileController';
import { TeacherProfileService } from '../../src/modules/profiles/TeacherProfileService';

const OLD = { id: 'year-2025', label: '2025-2026', reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' };
const CURRENT = { id: 'year-2026', label: '2026-2027', reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' };
const CONTROLLERS = [StudentProfileController, ParentProfileController, TeacherProfileController];
const FINANCE_ROLES = 'roles:accounting,admin,principal';

// The year the request resolved; the DI injector installs it in the server.
function inYear<T extends object>(service: T, year: object): T {
  Object.defineProperty(service, 'year', { value: year, configurable: true });
  return service;
}

// What a route asks for beyond sign-in, from the guard metadata the framework runs.
function requirement(controller: any, method: string) {
  return getGuardMetadata(controller, method)
    .filter((guard) => guard.guardClass?.name !== 'AuthGuard')
    .map((guard) => guard.guardClass?.name === 'RoleGuard'
      ? `roles:${[...[].concat(guard.params)].sort().join(',')}`
      : String(guard.params))
    .sort();
}

function routes(controller: any): string[] {
  return Object.getOwnPropertyNames(controller.prototype).filter((name) => name !== 'constructor');
}

const failed = () => Promise.reject(new Error('Resolved academic year is missing from the current operation'));

describe('profile routes', () => {
  it('take only their id: the year comes from the request scope', () => {
    for (const controller of CONTROLLERS) {
      for (const route of routes(controller)) {
        expect(controller.prototype[route].length, `${controller.name}.${route}`).toBe(1);
      }
    }
  });

  // A profile tab showed any signed-in role every student's grades, fees and
  // attendance: its routes asked only for sign-in.
  it("ask for what each tab's data module asks for on its own routes", () => {
    const of = (controller: any) => Object.fromEntries(routes(controller).map((route) => [route, requirement(controller, route)]));
    expect(of(StudentProfileController)).toEqual({
      getOverview: ['read:students'],
      getAcademic: ['read:grades'],
      getAttendanceSummary: ['read:attendance'],
      getFinancial: [FINANCE_ROLES],
      getTransport: ['roles:admin'],
    });
    expect(of(ParentProfileController)).toEqual({
      getUnreadAlerts: ['read:alerts'],
      getChildren: [FINANCE_ROLES],
      getAllFeesDue: [FINANCE_ROLES],
      getAllUpcomingEvents: ['read:events'],
    });
    expect(of(TeacherProfileController)).toEqual({
      getMyClasses: ['read:teachers'],
      getScheduleToday: ['read:teachers'],
      getPendingGrading: ['read:grades', 'read:teachers'],
      getMyStudents: ['read:teachers'],
    });
    for (const controller of CONTROLLERS) {
      expect(getGuardMetadata(controller).map((guard) => guard.guardClass?.name)).toEqual(['AuthGuard']);
    }
  });
});

describe('student profile in the selected year', () => {
  function service(overrides: Record<string, object> = {}) {
    const deps = {
      students: { ensureReadable: async () => ({}), getById: async () => ({}), getParents: async () => [] },
      fees: { getByStudent: async () => null },
      attendance: { getAll: async () => [] },
      assessments: { getForStudent: async () => [] },
      exams: { getForStudent: async () => [] },
      grades: { getByStudent: async () => [] },
      routes: { getByStudentId: async () => [] },
      ...overrides,
    } as Record<string, any>;
    return inYear(new StudentProfileService(deps.students, deps.fees, deps.attendance, deps.assessments,
      deps.exams, deps.grades, deps.routes), OLD);
  }

  it('calls the student read without forwarding a year', async () => {
    const years: unknown[] = [];
    const profile = service({ students: {
      getById: async (...args: unknown[]) => { years.push(args); return { id: 'student-1' }; },
      getParents: async () => [{ id: 'parent-1' }],
    } });
    expect<unknown>(await profile.getOverview('student-1')).toEqual({ student: { id: 'student-1' }, parents: [{ id: 'parent-1' }] });
    expect(years).toEqual([['student-1']]);
  });

  it('gives no attendance rate without marks, instead of 0%', async () => {
    expect(await service().getAttendanceSummary('student-1'))
      .toEqual({ total: 0, present: 0, absent: 0, late: 0, percentage: null });
    const marks = ['present', 'late', 'absent', 'present'].map((status) => ({ status }));
    expect(await service({ attendance: { getAll: async () => marks } }).getAttendanceSummary('student-1'))
      .toEqual({ total: 4, present: 2, absent: 1, late: 1, percentage: 50 });
  });

  it('lets a failed transport read fail the tab instead of showing no route', async () => {
    await expect(service({ routes: { getByStudentId: failed } }).getTransport('student-1'))
      .rejects.toThrow('Resolved academic year is missing');
    expect(await service().getTransport('student-1')).toEqual({ route: [] });
  });
});

describe('teacher profile in the selected year', () => {
  const originalBusinessDate = process.env.APP_BUSINESS_DATE;
  afterEach(() => {
    if (originalBusinessDate === undefined) delete process.env.APP_BUSINESS_DATE;
    else process.env.APP_BUSINESS_DATE = originalBusinessDate;
  });

  function service(year: object, calls: string[] = [], overrides: Record<string, object> = {}) {
    const classes = ['2024-2025', '2025-2026', '2026-2027'].map((academicYear) => ({ id: `class-${academicYear}`, academicYear }));
    const deps = {
      teachers: {
        getById: async () => ({ id: 'teacher-1' }),
        getClasses: async () => classes.filter((row) => row.academicYear === (year as { label: string }).label),
        getStudents: async () => { calls.push('students'); return []; },
      },
      assessments: { getAll: async () => {
        calls.push('assessments');
        return [{ id: 'today', date: '2026-09-27', status: 'scheduled' }, { id: 'tomorrow', date: '2026-09-28', status: 'scheduled' }];
      } },
      grades: { getAll: async () => [] },
      ...overrides,
    } as Record<string, any>;
    return inYear(new TeacherProfileService(deps.teachers, deps.assessments, deps.grades), year);
  }

  // The teacher repository selects the assignment year before the profile reads it.
  it("lists only the selected year's classes", async () => {
    expect((await service(OLD).getMyClasses('teacher-1')).classes.map((row) => row.id)).toEqual(['class-2025-2026']);
    expect((await service(CURRENT).getMyClasses('teacher-1')).classes.map((row) => row.id)).toEqual(['class-2026-2027']);
  });

  it("gives today's assessments only in the year that holds the business day", async () => {
    process.env.APP_BUSINESS_DATE = '2026-09-27';
    const current = await service(CURRENT).getScheduleToday('teacher-1');
    expect(current.todayAssessments?.map((row) => row.id)).toEqual(['today']);
    expect(current.classes.map((row) => row.id)).toEqual(['class-2026-2027']);

    // Another year has no today: null, not an empty list that reads as a free day.
    const calls: string[] = [];
    const old = await service(OLD, calls).getScheduleToday('teacher-1');
    expect(old.todayAssessments).toBeNull();
    expect(old.classes.map((row) => row.id)).toEqual(['class-2025-2026']);
    expect(calls).toEqual([]);
  });

  it("reads the teacher's students in the request's year", async () => {
    const calls: string[] = [];
    const result = await service(OLD, calls).getMyStudents('teacher-1');
    expect(calls).toEqual(['students']);
    // The chat answers "how many students do I teach" from this count.
    expect(result.studentCount).toBe(0);
  });
});

describe('parent profile', () => {
  function service(overrides: Record<string, object> = {}, eventsFor: string[] = []) {
    const deps = {
      parents: {
        getById: async () => ({ id: 'parent-1', userId: 'parent-user-7' }),
        getChildren: async () => [{ id: 'student-1' }],
        getLinkedChildren: async () => [{ id: 'student-1', name: 'Omar' }],
      },
      fees: { getByStudent: async () => null, getByStudentAllYears: async () => null },
      events: { getUpcomingForParent: async (userId: string) => { eventsFor.push(userId); return [{ id: 'event-1' }]; } },
      alerts: { getByStudentId: async () => [] },
      ...overrides,
    } as Record<string, any>;
    return new ParentProfileService(deps.parents, deps.fees, deps.events, deps.alerts);
  }

  it('lets a failed fee read fail the tab instead of showing no fees', async () => {
    await expect(service({ fees: { getByStudent: failed, getByStudentAllYears: failed } }).getChildren('parent-1'))
      .rejects.toThrow('Resolved academic year is missing');
    await expect(service({ fees: { getByStudent: failed, getByStudentAllYears: failed } }).getFeesDue('parent-1'))
      .rejects.toThrow('Resolved academic year is missing');
    expect<unknown>(await service().getChildren('parent-1')).toEqual([{ id: 'student-1', fees: null }]);
  });

  // The old filter kept any event without a section or without a class, so
  // other classes' events, and staff or private ones for a school-wide
  // reader, reached a parent's list.
  it("lists the events that parent's own account sees", async () => {
    const eventsFor: string[] = [];
    expect<unknown>(await service({}, eventsFor).getUpcomingEvents('parent-1'))
      .toEqual({ children: [{ id: 'student-1', name: 'Omar' }], events: [{ id: 'event-1' }] });
    expect(eventsFor).toEqual(['parent-user-7']);
    await expect(service({ events: { getUpcomingForParent: failed } }).getUpcomingEvents('parent-1'))
      .rejects.toThrow('Resolved academic year is missing');
  });
});
