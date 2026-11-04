import { matchPermission } from 'najm-auth/client';
import { monthsBetween } from '@sms/contracts/academic-years';
import { REGISTRAR_GRADE_BANDS, type RegistrarDashboardGrades, type RegistrarDashboardOverview } from '@sms/contracts/registrar-dashboard';
import { Injectable } from '../../../najm';
import { SettingsRepository } from '../../settings/SettingsRepository';
import { getBusinessDateOverride } from '../../../shared/businessDate';
import { schoolClock } from '../teacher/teacherDashboardMetrics';
import { SupervisorDashboardRepository } from '../supervisor/SupervisorDashboardRepository';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { RegistrarDashboardRepository } from './RegistrarDashboardRepository';

@Injectable()
export class RegistrarDashboardService {
  @Year() private readonly year!: ResolvedAcademicYear;

  /** The instant "now" is read from; tests pin it. */
  now: () => Date = () => new Date();

  constructor(
    private repository: RegistrarDashboardRepository,
    // Its read of the signed-in account holds for any role.
    private accounts: SupervisorDashboardRepository,
    private settings: SettingsRepository,
  ) {}

  // Grades are read only for a registrar holding read:grades, so revoking it in
  // the roles screen removes their figures and charts.
  async getOverview(user: { id: string; permissions?: string[] }): Promise<RegistrarDashboardOverview> {
    const canReadGrades = matchPermission(user.permissions ?? [], 'read:grades');
    const [registrar, grades] = await Promise.all([
      this.accounts.getSupervisor(user.id),
      canReadGrades ? this.readGrades() : null,
    ]);
    return { registrar, grades };
  }

  private async readGrades(): Promise<RegistrarDashboardGrades> {
    const settings = await this.settings.getPublicSettings();
    const today = schoolClock(settings?.timeZone, this.now(), getBusinessDateOverride()).date;
    const [totals, testsAwaitingGrades, distribution, monthly, byClass, bySubject] = await Promise.all([
      this.repository.getTotals(),
      this.repository.countTestsAwaitingGrades(today),
      this.repository.getDistribution(),
      this.repository.getMonthlyAverages(),
      this.repository.getClassAverages(),
      this.repository.getSubjectAverages(),
    ]);
    const bandCounts = new Map(distribution.map((row) => [row.band, row.count]));
    const months = new Map(monthly.map((row) => [row.month, row]));
    return {
      average: totals?.average ?? null,
      passRate: totals?.passRate ?? null,
      recorded: totals?.recorded ?? 0,
      pending: totals?.pending ?? 0,
      missed: totals?.missed ?? 0,
      testsAwaitingGrades,
      distribution: REGISTRAR_GRADE_BANDS.map((band) => ({ band, count: bandCounts.get(band) ?? 0 })),
      monthly: monthsBetween(this.year.reportingStartsOn, this.year.reportingEndsOn).map((month) => ({
        month,
        average: months.get(month)?.average ?? null,
        graded: months.get(month)?.graded ?? 0,
      })),
      byClass,
      bySubject,
    };
  }
}
