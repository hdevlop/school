import { Controller, Get, ResMsg, Query, Validate } from '@server/najm';
import { isAuth } from '@server/auth';
import { McpTool, ToolGroup } from 'najm-mcp';
import { FinanceDashboardService } from './FinanceDashboardService';
import {
  academicYearQueryDto,
  overdueQueryDto,
  recentPaymentsQueryDto,
  type AcademicYearQueryDto,
  type OverdueQueryDto,
  type RecentPaymentsQueryDto,
} from './FinanceDashboardValidator';

@ToolGroup('finance-dashboard')
@Controller('/dashboard/finance')
@isAuth()
export class FinanceDashboardController {
  constructor(private financeDashboardService: FinanceDashboardService) {}

  @Get('/kpis')
  @McpTool({ description: 'Get finance dashboard KPIs for an academic year', readOnly: true })
  @Validate({ query: academicYearQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getKpis(@Query() query: AcademicYearQueryDto = {}) {
    return this.financeDashboardService.getKpis(query.academicYear);
  }

  @Get('/trend')
  @McpTool({ description: 'Get monthly finance dashboard trend data for an academic year', readOnly: true })
  @Validate({ query: academicYearQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getTrend(@Query() query: AcademicYearQueryDto = {}) {
    return this.financeDashboardService.getTrend(query.academicYear);
  }

  @Get('/aging')
  @McpTool({ description: 'Get finance dashboard aging summary', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getAging() {
    return this.financeDashboardService.getAging();
  }

  @Get('/overdue')
  @McpTool({ description: 'Get overdue students from the finance dashboard', readOnly: true })
  @Validate({ query: overdueQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getOverdue(@Query() query: OverdueQueryDto = { limit: 20 }) {
    return this.financeDashboardService.getOverdue(query.limit);
  }

  @Get('/recent-payments')
  @McpTool({ description: 'Get recent finance dashboard payments', readOnly: true })
  @Validate({ query: recentPaymentsQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getRecentPayments(@Query() query: RecentPaymentsQueryDto = { limit: 10 }) {
    return this.financeDashboardService.getRecentPayments(query.limit);
  }

  // ─── Reports ────────────────────────────────────────────────────────────────

  @Get('/reports/expense-breakdown')
  @McpTool({ description: 'Get finance dashboard expense breakdown for an academic year', readOnly: true })
  @Validate({ query: academicYearQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getExpenseBreakdown(@Query() query: AcademicYearQueryDto = {}) {
    return this.financeDashboardService.getExpenseBreakdown(query.academicYear);
  }

  @Get('/reports/collection-by-class')
  @McpTool({ description: 'Get finance dashboard collection by class for an academic year', readOnly: true })
  @Validate({ query: academicYearQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getCollectionByClass(@Query() query: AcademicYearQueryDto = {}) {
    return this.financeDashboardService.getCollectionByClass(query.academicYear);
  }

  @Get('/reports/aging-detail')
  @McpTool({ description: 'Get detailed finance dashboard aging report', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getAgingDetail() {
    return this.financeDashboardService.getAgingDetail();
  }
}
