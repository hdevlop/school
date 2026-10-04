import { Injectable } from '../../../najm';
import { FinanceDashboardRepository } from './FinanceDashboardRepository';
import { SettingsRepository } from '../../settings/SettingsRepository';
import { isActiveYear, type ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { StudentEnrollmentRepository } from '../../studentEnrollments/StudentEnrollmentRepository';
import { Year } from '../../academicYears/requestYear';
import { holdsDay } from '../../academicYears/academicRecordYear';
import { getBusinessDateOnly } from '../../../shared/businessDate';

type ReportingDates = { reportingStartsOn: string; reportingEndsOn: string };

/** The calendar month holding `day`, kept inside the year's reporting dates. */
function monthHolding(day: string, year: ReportingDates) {
  const [calendarYear, month] = day.split('-').map(Number);
  const lastDay = new Date(Date.UTC(calendarYear, month, 0)).getUTCDate();
  const from = `${day.slice(0, 7)}-01`;
  const to = `${day.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
  return {
    from: from < year.reportingStartsOn ? year.reportingStartsOn : from,
    to: to > year.reportingEndsOn ? year.reportingEndsOn : to,
  };
}

@Injectable()
export class FinanceDashboardService {
  // Its own rules need the year: whether it holds today's month, and the
  // placements and active pointer the class reports read by year id.
  @Year() private readonly year!: ResolvedAcademicYear;

  constructor(
    private repo: FinanceDashboardRepository,
    private settingsRepository: SettingsRepository,
    private enrollments: StudentEnrollmentRepository,
  ) {}

  // Every finance read covers the selected year: its fee-year balances and
  // the cash counted over its reporting dates. This month's cash belongs only
  // to the year that holds today; any other year reports none, and the
  // dashboard shows the whole year's cash instead.
  async getKpis() {
    const today = getBusinessDateOnly();
    const month = holdsDay(this.year, today) ? monthHolding(today, this.year) : null;
    const [yearCash, monthCash, collection] = await Promise.all([
      this.repo.getCashTotals(this.year.reportingStartsOn, this.year.reportingEndsOn),
      month ? this.repo.getCashTotals(month.from, month.to) : null,
      this.repo.getCollectionTotals(),
    ]);

    return {
      incomeMonth: monthCash?.income ?? null,
      expensesMonth: monthCash?.expenses ?? null,
      netBalance: monthCash ? monthCash.income - monthCash.expenses : null,
      collectionRateYTD: collection.due > 0 ? (collection.paid / collection.due) * 100 : 0,
      incomeYear: yearCash.income,
      expensesYear: yearCash.expenses,
      netBalanceYear: yearCash.income - yearCash.expenses,
    };
  }

  // One point per month of the year's reporting interval, and today's cash
  // only in the year that holds today.
  async getTrend() {
    const today = getBusinessDateOnly();
    const [monthly, todayCash] = await Promise.all([
      this.repo.getMonthlyCash(),
      holdsDay(this.year, today) ? this.repo.getCashTotals(today, today) : null,
    ]);
    return {
      monthly,
      today: todayCash ? todayCash.income - todayCash.expenses : null,
      todayIncome: todayCash?.income ?? null,
      todayExpenses: todayCash?.expenses ?? null,
    };
  }

  async getAging() {
    return this.repo.getAging();
  }

  async getOverdue(limit: number) {
    return this.withLatestPlacement(await this.repo.getOverdue(limit));
  }

  async getRecentPayments(limit: number) {
    return this.repo.getRecentPayments(limit);
  }

  async getExpenseBreakdown() {
    return this.repo.getExpenseBreakdown();
  }

  // Class context comes from the year's dated placements; only the active
  // year may fall back to the current class.
  async getCollectionByClass() {
    const settings = await this.settingsRepository.getPublicSettings();
    return this.repo.getCollectionByClass(isActiveYear(this.year, settings));
  }

  async getAgingDetail() {
    return this.withLatestPlacement(await this.repo.getAgingDetail());
  }

  private async withLatestPlacement<T extends { studentId: string }>(rows: T[]) {
    const placements = await this.enrollments.listYearPlacements(
      this.year.id, rows.map((row) => row.studentId),
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
        sectionId: placement?.sectionId ?? null,
        sectionName: placement?.sectionName ?? null,
      };
    });
  }
}
