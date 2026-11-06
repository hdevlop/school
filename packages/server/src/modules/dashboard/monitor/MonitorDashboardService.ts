import { Injectable } from '../../../najm';
import type { MonitorDashboardOverview } from '@sms/contracts/monitor-dashboard';
import { SettingsRepository } from '../../settings/SettingsRepository';
import { AcademicYearValidator } from '../../academicYears/AcademicYearValidator';
import { PersonalNotificationRepository } from '../../notifications/NotificationRepository';
import { getBusinessDateOverride } from '../../../shared/businessDate';
import { schoolClock } from '../teacher/teacherDashboardMetrics';
import { summarizeRegisters } from '../registerSummary';
import { MonitorDashboardRepository } from './MonitorDashboardRepository';
import { MonitorDashboardValidator } from './MonitorDashboardValidator';

type DashboardUser = { id: string; role?: string };

const INCIDENT_LIMIT = 5;

@Injectable()
export class MonitorDashboardService {
  /** The instant "now" is read from; tests pin it. */
  now: () => Date = () => new Date();

  constructor(
    private repository: MonitorDashboardRepository,
    private settingsRepository: SettingsRepository,
    private academicYears: AcademicYearValidator,
    private notifications: PersonalNotificationRepository,
    private validator: MonitorDashboardValidator,
  ) {}

  // The monitor is resolved from the session, and their sections from
  // the grades they run today, so nothing points at another floor's figures.
  async getOverview(user: DashboardUser): Promise<MonitorDashboardOverview> {
    const manager = this.validator.ensureManagerExists(await this.repository.getManager(user.id));
    const [settings, year] = await Promise.all([
      this.settingsRepository.getPublicSettings(),
      this.academicYears.resolve(undefined, user.role),
    ]);
    const clock = schoolClock(settings?.timeZone, this.now(), getBusinessDateOverride());
    const today = clock.date;

    const [grades, sections] = await Promise.all([
      this.repository.getGrades(manager.id, today),
      this.repository.getSections(user.id, year.label),
    ]);
    const sectionIds = sections.map((section) => section.sectionId);

    const [attendanceDays, genders, marked, registered, incidents, unreadNotifications] = await Promise.all([
      this.repository.getAttendanceByDay(sectionIds, year.reportingStartsOn, year.reportingEndsOn < today ? year.reportingEndsOn : today),
      this.repository.getStudentsByGender(sectionIds),
      this.repository.getMarkedStudents(sectionIds, today),
      this.repository.getRegisteredSectionIds(sectionIds, today),
      this.repository.getOpenIncidents(sectionIds, INCIDENT_LIMIT),
      this.notifications.unreadCount(user.id),
    ]);

    const {
      schoolDay, sectionRows, missingRegisters, absentToday, lateToday, attendanceRate, monthly,
    } = summarizeRegisters({ sections, marked, registeredSectionIds: registered, attendanceDays, settings, clock, year });

    return {
      date: today,
      academicYear: year.label,
      schoolDay,
      manager: { ...manager, grades },
      kpis: {
        totalStudents: sections.reduce((sum, section) => sum + section.studentCount, 0),
        sections: sections.length,
        absentToday,
        lateToday,
        attendanceRate,
        unreadNotifications,
      },
      studentsByGender: genders.map(({ gender, value }) => ({
        gender,
        value: Number(value),
      })),
      attendanceMonthly: { monthly, todayAbsent: absentToday, todayLate: lateToday },
      sections: sectionRows,
      absences: marked,
      incidents: incidents.rows,
      attention: {
        missingRegisters,
        absentToday,
        openIncidents: incidents.total,
        unreadNotifications,
      },
    };
  }
}
