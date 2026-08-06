import { Injectable } from '@server/najm';
import { FinanceDashboardRepository } from './FinanceDashboardRepository';
import { getCurrentAcademicYear } from '../../financial/utils';

@Injectable()
export class FinanceDashboardService {
  constructor(private repo: FinanceDashboardRepository) {}

  async getKpis(academicYear?: string) {
    return this.repo.getKpis(academicYear ?? getCurrentAcademicYear());
  }

  async getTrend(academicYear?: string) {
    return this.repo.getTrend(academicYear ?? getCurrentAcademicYear());
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
    return this.repo.getExpenseBreakdown(academicYear ?? getCurrentAcademicYear());
  }

  async getCollectionByClass(academicYear?: string) {
    return this.repo.getCollectionByClass(academicYear ?? getCurrentAcademicYear());
  }

  async getAgingDetail() {
    return this.repo.getAgingDetail();
  }
}
