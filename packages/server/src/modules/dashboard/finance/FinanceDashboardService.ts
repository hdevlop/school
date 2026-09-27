import { Injectable } from '../../../najm';
import { FinanceDashboardRepository } from './FinanceDashboardRepository';
import { SettingsRepository } from '../../settings/SettingsRepository';
import { isActiveYear, type ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { StudentEnrollmentRepository } from '../../studentEnrollments/StudentEnrollmentRepository';

@Injectable()
export class FinanceDashboardService {
  constructor(
    private repo: FinanceDashboardRepository,
    private settingsRepository: SettingsRepository,
    private enrollments: StudentEnrollmentRepository,
  ) {}

  // Every finance read covers one registered year: its fee-year balances and
  // the cash counted over its reporting dates.
  async getKpis(year: ResolvedAcademicYear) {
    return this.repo.getKpis(year);
  }

  async getTrend(year: ResolvedAcademicYear) {
    return this.repo.getTrend(year);
  }

  async getAging(year: ResolvedAcademicYear) {
    return this.repo.getAging(year.label);
  }

  async getOverdue(limit: number, year: ResolvedAcademicYear) {
    return this.repo.getOverdue(limit, year.label);
  }

  async getRecentPayments(limit: number) {
    return this.repo.getRecentPayments(limit);
  }

  async getExpenseBreakdown(year: ResolvedAcademicYear) {
    return this.repo.getExpenseBreakdown(year);
  }

  // Class context comes from the year's dated placements; only the active
  // year may fall back to the current class.
  async getCollectionByClass(year: ResolvedAcademicYear) {
    const settings = await this.settingsRepository.getPublicSettings();
    return this.repo.getCollectionByClass(year.label, {
      academicYearId: year.id,
      isActiveYear: isActiveYear(year, settings),
    });
  }

  async getAgingDetail(year: ResolvedAcademicYear) {
    const rows = await this.repo.getAgingDetail(year.label);
    const placements = await this.enrollments.listYearPlacements(
      year.id, rows.map((row) => row.studentId),
    );
    const latest = new Map<string, (typeof placements)[number]>();
    for (const placement of placements) {
      const previous = latest.get(placement.studentId);
      if (!previous || placement.validFrom > previous.validFrom) {
        latest.set(placement.studentId, placement);
      }
    }
    return rows.map((row) => {
      const placement = latest.get(row.studentId);
      return {
        ...row,
        classId: placement?.classId ?? null,
        className: placement?.className ?? 'No class',
      };
    });
  }
}
