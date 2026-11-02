import { Injectable } from '../../../najm';
import { DEFAULT_TEACHING_DAYS } from '@sms/contracts/routines';
import type { FloorManagerDashboardOverview } from '@sms/contracts/floor-manager-dashboard';
import { SettingsRepository } from '../../settings/SettingsRepository';
import { AcademicYearValidator } from '../../academicYears/AcademicYearValidator';
import { PersonalNotificationRepository } from '../../notifications/NotificationRepository';
import { getBusinessDateOverride } from '../../../shared/businessDate';
import { addDays, ratePercent, schoolClock, toMinutes } from '../teacher/teacherDashboardMetrics';
import { FloorManagerDashboardRepository } from './FloorManagerDashboardRepository';
import { FloorManagerDashboardValidator } from './FloorManagerDashboardValidator';

type DashboardUser = { id: string; role?: string };

const INCIDENT_LIMIT = 5;
const KPI_ATTENDANCE_DAYS = 7;

@Injectable()
export class FloorManagerDashboardService {
  /** The instant "now" is read from; tests pin it. */
  now: () => Date = () => new Date();

  constructor(
    private repository: FloorManagerDashboardRepository,
    private settingsRepository: SettingsRepository,
    private academicYears: AcademicYearValidator,
    private notifications: PersonalNotificationRepository,
    private validator: FloorManagerDashboardValidator,
  ) {}

  // The floor manager is resolved from the session, and their sections from
  // the grades they run today, so nothing points at another floor's figures.
  async getOverview(user: DashboardUser): Promise<FloorManagerDashboardOverview> {
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

    const [attendanceDays, marked, registered, incidents, unreadNotifications] = await Promise.all([
      this.repository.getAttendanceByDay(sectionIds, addDays(today, 1 - KPI_ATTENDANCE_DAYS), today),
      this.repository.getMarkedStudents(sectionIds, today),
      this.repository.getRegisteredSectionIds(sectionIds, today),
      this.repository.getOpenIncidents(sectionIds, INCIDENT_LIMIT),
      this.notifications.unreadCount(user.id),
    ]);

    const teachingDays: readonly string[] = settings?.teachingDays ?? DEFAULT_TEACHING_DAYS;
    const schoolDay = teachingDays.includes(clock.weekday);
    // A register is owed once the school day has started, and only by a
    // section with students in it.
    const started = !settings?.schoolStartTime || clock.minutes >= toMinutes(settings.schoolStartTime);
    const registeredIds = new Set(registered);

    const absentBySection = new Map<string, number>();
    const lateBySection = new Map<string, number>();
    for (const row of marked) {
      const tally = row.status === 'absent' ? absentBySection : lateBySection;
      tally.set(row.sectionId, (tally.get(row.sectionId) ?? 0) + 1);
    }

    const sectionRows = sections.map((section) => ({
      ...section,
      registerTaken: registeredIds.has(section.sectionId),
      absent: absentBySection.get(section.sectionId) ?? 0,
      late: lateBySection.get(section.sectionId) ?? 0,
    }));
    const missingRegisters = schoolDay && started
      ? sectionRows.filter((section) => section.studentCount > 0 && !section.registerTaken).length
      : 0;
    const absentToday = marked.filter((row) => row.status === 'absent').length;
    const lateToday = marked.length - absentToday;

    const attended = attendanceDays.reduce((sum, day) => sum + day.attended, 0);
    const total = attendanceDays.reduce((sum, day) => sum + day.total, 0);

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
        attendanceRate: ratePercent(attended, total),
        unreadNotifications,
      },
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
