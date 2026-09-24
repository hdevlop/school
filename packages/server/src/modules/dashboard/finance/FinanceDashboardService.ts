import { Injectable } from '../../../najm';
import { FinanceDashboardRepository } from './FinanceDashboardRepository';
import { getCurrentAcademicYear } from '../../financial/utils';
import { SettingsRepository } from '../../settings/SettingsRepository';

@Injectable()
export class FinanceDashboardService {
  constructor(
    private repo: FinanceDashboardRepository,
    private settingsRepository: SettingsRepository,
  ) {}

  private async resolveAcademicYear(academicYear?: string) {
    if (academicYear) return academicYear;
    const settings = await this.settingsRepository.getPublicSettings();
    return settings?.currentAcademicYear || getCurrentAcademicYear();
  }

  async getKpis(academicYear?: string) {
    return this.repo.getKpis(await this.resolveAcademicYear(academicYear));
  }

  async getTrend(academicYear?: string) {
    return this.repo.getTrend(await this.resolveAcademicYear(academicYear));
  }

  async getAging() {
    return this.repo.getAging();
  }

  async getOverdue(limit: number) {
    return this.repo.getOverdue(limit);
  }

  async getRecentPayments(limit: number) {
    return this.repo.getRecentPayments(limit);
  }

  async getExpenseBreakdown(academicYear?: string) {
    return this.repo.getExpenseBreakdown(await this.resolveAcademicYear(academicYear));
  }

  async getCollectionByClass(academicYear?: string) {
    return this.repo.getCollectionByClass(await this.resolveAcademicYear(academicYear));
  }

  async getAgingDetail() {
    return this.repo.getAgingDetail();
  }
}
