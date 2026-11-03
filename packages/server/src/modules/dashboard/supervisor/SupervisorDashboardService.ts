import { matchPermission } from 'najm-auth/client';
import { Injectable } from '../../../najm';
import { monthsBetween } from '@sms/contracts/academic-years';
import type { SupervisorDashboardIncidentMonth, SupervisorDashboardOverview } from '@sms/contracts/supervisor-dashboard';
import { SettingsRepository } from '../../settings/SettingsRepository';
import { AcademicYearValidator } from '../../academicYears/AcademicYearValidator';
import { PersonalNotificationRepository } from '../../notifications/NotificationRepository';
import { getBusinessDateOverride } from '../../../shared/businessDate';
import { schoolClock } from '../teacher/teacherDashboardMetrics';
import { isSchoolDay, summarizeRegisters } from '../registerSummary';
import { FloorManagerDashboardRepository } from '../floorManager/FloorManagerDashboardRepository';
import { FloorManagerDashboardValidator } from '../floorManager/FloorManagerDashboardValidator';
import { SupervisorDashboardRepository } from './SupervisorDashboardRepository';

type DashboardUser = { id: string; role?: string; permissions?: string[] };

const INCIDENT_LIMIT = 5;
const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

@Injectable()
export class SupervisorDashboardService {
  /** The instant "now" is read from; tests pin it. */
  now: () => Date = () => new Date();

  constructor(
    private repository: SupervisorDashboardRepository,
    private sectionReads: FloorManagerDashboardRepository,
    private settingsRepository: SettingsRepository,
    private academicYears: AcademicYearValidator,
    private notifications: PersonalNotificationRepository,
    private validator: FloorManagerDashboardValidator,
  ) {}

  // The day of the classes assigned to the supervisor. Each part is read only
  // for a supervisor holding its permission, so revoking one in the roles
  // screen removes its cards.
  async getOverview(user: DashboardUser): Promise<SupervisorDashboardOverview> {
    const supervisor = this.validator.ensureManagerExists(await this.repository.getSupervisor(user.id));
    const can = (permission: string) => matchPermission(user.permissions ?? [], permission);
    const [settings, year] = await Promise.all([
      this.settingsRepository.getPublicSettings(),
      this.academicYears.resolve(undefined, user.role),
    ]);
    const clock = schoolClock(settings?.timeZone, this.now(), getBusinessDateOverride());
    const today = clock.date;
    const yearEnd = year.reportingEndsOn < today ? year.reportingEndsOn : today;

    const sections = await this.repository.getSections(user.id, year.label);
    const sectionIds = sections.map((section) => section.sectionId);
    const classNames = [...new Set(sections.map((section) => section.className))];

    const [attendance, students, discipline, grades, newRequests, absentTeachers, unreadNotifications] = await Promise.all([
      can('read:attendance') ? this.readAttendance(sections, sectionIds, settings, clock, year, yearEnd) : null,
      can('read:students') ? this.sectionReads.getStudentsByGender(sectionIds) : null,
      can('read:discipline') ? this.readDiscipline(sectionIds, year.reportingStartsOn, yearEnd, settings?.timeZone ?? 'UTC', year) : null,
      can('read:grades') ? this.repository.getGradesByClass(year.id, sectionIds) : null,
      can('read:visit-requests') ? this.repository.getNewVisitRequestCount() : null,
      can('read:teachers') ? this.repository.getAbsentTeacherCount(today) : null,
      this.notifications.unreadCount(user.id),
    ]);

    return {
      date: today,
      academicYear: year.label,
      schoolDay: isSchoolDay(settings, clock.weekday),
      supervisor: { ...supervisor, classes: classNames },
      unreadNotifications,
      absentTeachers,
      attendance: attendance && {
        sections: attendance.sectionRows,
        absences: attendance.marked,
        absentToday: attendance.absentToday,
        lateToday: attendance.lateToday,
        missingRegisters: attendance.missingRegisters,
        attendanceRate: attendance.attendanceRate,
        monthly: attendance.monthly,
      },
      students: students && {
        total: sections.reduce((sum, section) => sum + section.studentCount, 0),
        byGender: students.map(({ gender, value }) => ({ gender, value: Number(value) })),
      },
      discipline,
      grades: grades && { byClass: grades },
      visitRequests: newRequests === null ? null : { newRequests },
    };
  }

  private async readAttendance(
    sections: Awaited<ReturnType<SupervisorDashboardRepository['getSections']>>,
    sectionIds: string[],
    settings: Parameters<typeof summarizeRegisters>[0]['settings'],
    clock: Parameters<typeof summarizeRegisters>[0]['clock'],
    year: Parameters<typeof summarizeRegisters>[0]['year'],
    yearEnd: string,
  ) {
    const [attendanceDays, marked, registered] = await Promise.all([
      this.sectionReads.getAttendanceByDay(sectionIds, year.reportingStartsOn, yearEnd),
      this.sectionReads.getMarkedStudents(sectionIds, clock.date),
      this.sectionReads.getRegisteredSectionIds(sectionIds, clock.date),
    ]);
    return {
      marked,
      ...summarizeRegisters({ sections, marked, registeredSectionIds: registered, attendanceDays, settings, clock, year }),
    };
  }

  private async readDiscipline(
    sectionIds: string[],
    from: string,
    to: string,
    timeZone: string,
    year: { reportingStartsOn: string; reportingEndsOn: string },
  ): Promise<NonNullable<SupervisorDashboardOverview['discipline']>> {
    const [open, counts] = await Promise.all([
      this.sectionReads.getOpenIncidents(sectionIds, INCIDENT_LIMIT),
      this.repository.getIncidentsByMonth(sectionIds, from, to, timeZone),
    ]);
    const monthly: SupervisorDashboardIncidentMonth[] = monthsBetween(year.reportingStartsOn, year.reportingEndsOn)
      .map((month) => ({ month, low: 0, medium: 0, high: 0, critical: 0 }));
    const byMonth = new Map(monthly.map((row) => [row.month, row]));
    for (const { month, severity, count } of counts) {
      const row = byMonth.get(month);
      if (row && (SEVERITIES as readonly string[]).includes(severity)) row[severity as typeof SEVERITIES[number]] += count;
    }
    return { openIncidents: open.total, incidents: open.rows, monthly };
  }
}
