import { Controller, Get, ResMsg, Query, Validate } from '../../../najm';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { isFinancial } from '../../../auth';
import { McpTool, ToolGroup } from 'najm-mcp';
import { FinanceDashboardService } from './FinanceDashboardService';
import {
  academicYearQueryDto,
  overdueQueryDto,
  recentPaymentsQueryDto,
  type OverdueQueryDto,
  type RecentPaymentsQueryDto,
} from './FinanceDashboardValidator';

// School finances, for the roles that may read fees (the fee routes' guard).
@ToolGroup('finance-dashboard')
@Controller('/dashboard/finance')
@isFinancial()
export class FinanceDashboardController {
  constructor(private financeDashboardService: FinanceDashboardService) {}

  @Get('/kpis')
  @McpTool({ description: 'Get finance dashboard KPIs for an academic year', readOnly: true })
  @Validate({ query: academicYearQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getKpis(@Year() year: ResolvedAcademicYear) {
    return this.financeDashboardService.getKpis(year);
  }

  @Get('/trend')
  @McpTool({ description: 'Get monthly finance dashboard trend data for an academic year', readOnly: true })
  @Validate({ query: academicYearQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getTrend(@Year() year: ResolvedAcademicYear) {
    return this.financeDashboardService.getTrend(year);
  }

  @Get('/aging')
  @McpTool({ description: 'Get finance dashboard aging summary', readOnly: true })
  @Validate({ query: academicYearQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getAging(@Year() year: ResolvedAcademicYear) {
    return this.financeDashboardService.getAging(year);
  }

  @Get('/overdue')
  @McpTool({ description: 'Get overdue students from the finance dashboard', readOnly: true })
  @Validate({ query: overdueQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getOverdue(@Query('limit') limit: OverdueQueryDto['limit'], @Year() year: ResolvedAcademicYear) {
    return this.financeDashboardService.getOverdue(limit ?? 20, year);
  }

  @Get('/recent-payments')
  @McpTool({ description: 'Get recent finance dashboard payments', readOnly: true })
  @Validate({ query: recentPaymentsQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getRecentPayments(@Query() query: RecentPaymentsQueryDto) {
    return this.financeDashboardService.getRecentPayments(query?.limit ?? 10);
  }

  // ─── Reports ────────────────────────────────────────────────────────────────

  @Get('/reports/expense-breakdown')
  @McpTool({ description: 'Get finance dashboard expense breakdown for an academic year', readOnly: true })
  @Validate({ query: academicYearQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getExpenseBreakdown(@Year() year: ResolvedAcademicYear) {
    return this.financeDashboardService.getExpenseBreakdown(year);
  }

  @Get('/reports/collection-by-class')
  @McpTool({ description: 'Get finance dashboard collection by class for an academic year', readOnly: true })
  @Validate({ query: academicYearQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getCollectionByClass(@Year() year: ResolvedAcademicYear) {
    return this.financeDashboardService.getCollectionByClass(year);
  }

  @Get('/reports/aging-detail')
  @McpTool({ description: 'Get detailed finance dashboard aging report', readOnly: true })
  @Validate({ query: academicYearQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getAgingDetail(@Year() year: ResolvedAcademicYear) {
    return this.financeDashboardService.getAgingDetail(year);
  }
}
