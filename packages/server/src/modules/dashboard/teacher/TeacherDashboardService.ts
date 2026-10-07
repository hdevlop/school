import { Injectable } from '../../../najm';
import { TeacherDashboardValidator } from './TeacherDashboardValidator';
import {
  TEACHER_TREND_RANGE_DAYS,
  type TeacherAttendanceTrend,
  type TeacherDashboardOverview,
  type TeacherDashboardSession,
  type TeacherTrendRange,
} from '@sms/contracts/teacher-dashboard';
import { TeacherRepository } from '../../teachers/TeacherRepository';
import { ClassRoutineRepository } from '../../classRoutines/ClassRoutineRepository';
import { SettingsRepository } from '../../settings/SettingsRepository';
import { AcademicYearValidator } from '../../academicYears/AcademicYearValidator';
import { PersonalNotificationRepository } from '../../notifications/NotificationRepository';
import { getBusinessDateOverride } from '../../../shared/businessDate';
import { TeacherDashboardRepository, type AttendanceScope } from './TeacherDashboardRepository';
import {
  addDays,
  awaitsGrading,
  datesBetween,
  entriesOn,
  hasRegister,
  rankAssessments,
  ratePercent,
  schoolClock,
  sessionStatus,
  toClockTime,
  type Register,
  type SchoolClock,
} from './teacherDashboardMetrics';

type DashboardUser = { id: string; role?: string };
type DashboardTeacher = NonNullable<Awaited<ReturnType<TeacherRepository['getByUserId']>>>;
type WeekEntry = Awaited<ReturnType<TeacherDashboardRepository['getWeekEntries']>>[number];

const ASSESSMENT_LIMIT = 4;
const KPI_ATTENDANCE_DAYS = 7;

@Injectable()
export class TeacherDashboardService {
  /** The instant "now" is read from; tests pin it. */
  now: () => Date = () => new Date();

  constructor(
    private repository: TeacherDashboardRepository,
    private teacherRepository: TeacherRepository,
    private routineRepository: ClassRoutineRepository,
    private settingsRepository: SettingsRepository,
    private academicYears: AcademicYearValidator,
    private notifications: PersonalNotificationRepository,
    private validator: TeacherDashboardValidator,
  ) {}

  async getOverview(user: DashboardUser): Promise<TeacherDashboardOverview> {
    return this.overview(await this.ownTeacher(user), user.id, user.role);
  }

  /** The same page for one teacher, as a school-wide reader opens it. */
  async getTeacherOverview(teacherId: string, viewer: DashboardUser): Promise<TeacherDashboardOverview> {
    const teacher = await this.teacherById(teacherId);
    return this.overview(teacher, teacher.userId ?? null, viewer.role);
  }

  async getAttendanceTrend(user: DashboardUser, range: TeacherTrendRange): Promise<TeacherAttendanceTrend> {
    return this.attendanceTrend(await this.ownTeacher(user), user.role, range);
  }

  async getTeacherAttendanceTrend(
    teacherId: string,
    viewer: DashboardUser,
    range: TeacherTrendRange,
  ): Promise<TeacherAttendanceTrend> {
    return this.attendanceTrend(await this.teacherById(teacherId), viewer.role, range);
  }

  private async ownTeacher(user: DashboardUser) {
    return this.validator.ensureTeacherExists(await this.teacherRepository.getByUserId(user.id));
  }

  // Read through the teachers ownership rules, so a teacher reaches only
  // their own record and parents and students none.
  private async teacherById(teacherId: string) {
    return this.validator.ensureTeacherExists(await this.teacherRepository.getOwnedRecord(teacherId));
  }

  // The unread count is the teacher's own inbox; a teacher without an
  // account has none.
  private async overview(
    teacher: DashboardTeacher,
    notificationUserId: string | null,
    role: string | undefined,
  ): Promise<TeacherDashboardOverview> {
    const context = await this.context(teacher, role);
    const { year, clock, assignments, scope } = context;
    const today = clock.date;
    const kpiFrom = addDays(today, 1 - KPI_ATTENDANCE_DAYS);

    const [registers, attendanceDays, assessmentRows, unreadNotifications, openConcerns] = await Promise.all([
      this.repository.getRegisters(scope, today, today),
      this.repository.getAttendanceByDay(scope, kpiFrom, today),
      this.repository.getAssessments(teacher.id, year.id),
      notificationUserId ? this.notifications.unreadCount(notificationUserId) : 0,
      this.repository.countOpenIncidents(scope.sectionIds),
    ]);

    const todaySessions = entriesOn(context.weekEntries, today)
      .map((entry) => this.toSession(entry, clock, registers, scope.mode));
    const nextSession = todaySessions.find((session) => session.status === 'inProgress')
      ?? todaySessions.find((session) => session.status === 'upcoming')
      ?? null;

    const missingAttendance = todaySessions
      .filter((session) => session.status !== 'upcoming' && !session.attendanceTaken).length;
    const missingGrades = assessmentRows.filter((row) => awaitsGrading(row, today)).length;

    const attended = attendanceDays.reduce((sum, day) => sum + day.attended, 0);
    const marked = attendanceDays.reduce((sum, day) => sum + day.total, 0);

    // A section taught in several subjects is counted once.
    const studentsBySection = new Map(assignments.map((row) => [row.sectionId, row.studentCount]));
    const totalStudents = [...studentsBySection.values()].reduce((sum, value) => sum + value, 0);

    return {
      date: today,
      academicYear: year.label,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        specialization: teacher.specialization ?? null,
        image: teacher.image ?? null,
        email: teacher.email ?? null,
        phone: teacher.phone ?? null,
        address: teacher.address ?? null,
        status: teacher.status ?? null,
        hireDate: teacher.hireDate ? String(teacher.hireDate).slice(0, 10) : null,
        yearsOfExperience: teacher.yearsOfExperience ?? null,
        employmentType: teacher.employmentType ?? null,
        workloadHours: teacher.workloadHours ?? null,
      },
      kpis: {
        totalStudents,
        classesToday: todaySessions.length,
        pendingTasks: missingAttendance + missingGrades,
        attendanceRate: ratePercent(attended, marked),
        unreadNotifications,
      },
      nextSession,
      todaySessions,
      attention: { missingAttendance, missingGrades, unreadNotifications, openConcerns },
      classes: assignments,
      assessments: rankAssessments(assessmentRows, today, ASSESSMENT_LIMIT),
    };
  }

  private async attendanceTrend(
    teacher: DashboardTeacher,
    role: string | undefined,
    range: TeacherTrendRange,
  ): Promise<TeacherAttendanceTrend> {
    const { year, clock, scope, weekEntries } = await this.context(teacher, role);
    const days = TEACHER_TREND_RANGE_DAYS[range];
    const to = clock.date;
    const from = addDays(to, 1 - days);
    const previousTo = addDays(from, -1);
    const previousFrom = addDays(previousTo, 1 - days);

    const [attendanceDays, registers] = await Promise.all([
      this.repository.getAttendanceByDay(scope, previousFrom, to),
      this.repository.getRegisters(scope, from, to),
    ]);
    const byDate = new Map(attendanceDays.map((day) => [day.date, day]));
    const sum = (dates: string[]) => dates.reduce(
      (total, date) => ({
        attended: total.attended + (byDate.get(date)?.attended ?? 0),
        marked: total.marked + (byDate.get(date)?.total ?? 0),
      }),
      { attended: 0, marked: 0 },
    );

    const dates = datesBetween(from, to);
    const current = sum(dates);
    const previous = sum(datesBetween(previousFrom, previousTo));
    const rate = ratePercent(current.attended, current.marked);
    const previousRate = ratePercent(previous.attended, previous.marked);

    // Lessons count from the first day of the school year, and today's only
    // once they have started.
    let sessionsScheduled = 0;
    let sessionsHeld = 0;
    for (const date of dates) {
      if (date < year.reportingStartsOn) continue;
      for (const entry of entriesOn(weekEntries, date)) {
        if (date === to && sessionStatus(entry.startTime, entry.endTime, clock.minutes).status === 'upcoming') continue;
        sessionsScheduled += 1;
        if (hasRegister(registers, entry, date, scope.mode)) sessionsHeld += 1;
      }
    }

    return {
      range,
      points: dates.map((date) => {
        const day = byDate.get(date);
        return {
          date,
          rate: ratePercent(day?.attended ?? 0, day?.total ?? 0),
          attended: day?.attended ?? 0,
          total: day?.total ?? 0,
        };
      }),
      rate,
      previousRate,
      change: rate !== null && previousRate !== null ? rate - previousRate : null,
      sessionsHeld,
      sessionsScheduled,
    };
  }

  /** The teacher's assignments and weekly lessons in the active year. */
  private async context(teacher: DashboardTeacher, role: string | undefined) {
    const [settings, year] = await Promise.all([
      this.settingsRepository.getPublicSettings(),
      this.academicYears.resolve(undefined, role),
    ]);
    const [assignments, scheduleIds] = await Promise.all([
      this.repository.getAssignments(teacher.id, year.label),
      this.routineRepository.getTeacherScheduleIds(teacher.id, year.label),
    ]);
    const weekEntries = await this.repository.getWeekEntries(teacher.id, scheduleIds);

    const scope: AttendanceScope = {
      mode: settings?.attendanceMode === 'per_class' ? 'per_class' : 'daily',
      sectionIds: [...new Set(assignments.map((row) => row.sectionId))],
      assignmentIds: assignments.map((row) => row.teacherAssignmentId),
    };

    return {
      teacher,
      year,
      clock: schoolClock(settings?.timeZone, this.now(), getBusinessDateOverride()),
      assignments,
      weekEntries,
      scope,
    };
  }

  private toSession(
    entry: WeekEntry,
    clock: SchoolClock,
    registers: Register[],
    mode: AttendanceScope['mode'],
  ): TeacherDashboardSession {
    return {
      entryId: entry.entryId,
      teacherAssignmentId: entry.teacherAssignmentId,
      classId: entry.classId,
      className: entry.className,
      sectionId: entry.sectionId,
      sectionName: entry.sectionName,
      subjectId: entry.subjectId,
      subjectName: entry.subjectName,
      roomNumber: entry.roomNumber,
      startTime: toClockTime(entry.startTime),
      endTime: toClockTime(entry.endTime),
      ...sessionStatus(entry.startTime, entry.endTime, clock.minutes),
      attendanceTaken: hasRegister(registers, entry, clock.date, mode),
    };
  }
}
