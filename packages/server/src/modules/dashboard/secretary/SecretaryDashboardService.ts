import { matchPermission } from 'najm-auth/client';
import type { SecretaryDashboardOverview } from '@sms/contracts/secretary-dashboard';
import { monthsBetween } from '@sms/contracts/academic-years';
import { Injectable } from '../../../najm';
import { StudentService } from '../../students/StudentService';
import { ParentService } from '../../parents/ParentService';
import { TeacherService } from '../../teachers/TeacherService';
import { VisitRequestRepository } from '../../visitRequests/VisitRequestRepository';
import { PersonalNotificationRepository } from '../../notifications/NotificationRepository';
import { SupervisorDashboardRepository } from '../supervisor/SupervisorDashboardRepository';
import { DisciplineRepository } from '../../discipline/DisciplineRepository';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';

@Injectable()
export class SecretaryDashboardService {
  @Year() private readonly year!: ResolvedAcademicYear;

  constructor(
    private students: StudentService,
    private parents: ParentService,
    private teachers: TeacherService,
    private visits: VisitRequestRepository,
    private notifications: PersonalNotificationRepository,
    // Its read of the signed-in account holds for any role.
    private accounts: SupervisorDashboardRepository,
    private incidents: DisciplineRepository,
  ) {}

  async getOverview(user: { id: string; permissions?: string[] }): Promise<SecretaryDashboardOverview> {
    const can = (permission: string) => matchPermission(user.permissions ?? [], permission);
    const [secretary, students, teachers, parents, visitRequests, unreadNotifications, incidentsMonthly] = await Promise.all([
      this.accounts.getSupervisor(user.id),
      can('read:students') ? this.students.getCount(true) : null,
      // The secretary dashboard exposes these school-wide totals only;
      // individual records retain their own read permissions.
      this.teachers.getCount(),
      this.parents.getCount(),
      can('read:visit-requests') ? this.visits.getDashboardSummary() : null,
      this.notifications.unreadCount(user.id),
      this.getIncidentsMonthly(),
    ]);
    return {
      secretary,
      students: students?.count ?? null,
      teachers: teachers.count,
      parents: parents.count,
      incidentsMonthly,
      visitRequests,
      unreadNotifications,
    };
  }

  private async getIncidentsMonthly(): Promise<SecretaryDashboardOverview['incidentsMonthly']> {
    const year = this.year;
    const counts = await this.incidents.getMonthlyCounts();
    const monthly = monthsBetween(year.reportingStartsOn, year.reportingEndsOn)
      .map((month) => ({ month, low: 0, medium: 0, high: 0, critical: 0 }));
    const byMonth = new Map(monthly.map((row) => [row.month, row]));
    for (const { month, severity, count } of counts) {
      const row = byMonth.get(month);
      if (row && (severity === 'low' || severity === 'medium' || severity === 'high' || severity === 'critical')) {
        row[severity] += count;
      }
    }
    return monthly;
  }
}
