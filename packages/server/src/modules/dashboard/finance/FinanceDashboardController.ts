import { Controller, Get, ResMsg, Query, Validate } from '../../../najm';
import { isFinancial } from '../../../auth';
import { McpTool, ToolGroup } from 'najm-mcp';
import { FinanceDashboardService } from './FinanceDashboardService';
import {
  overdueQueryDto,
  recentPaymentsQueryDto,
  type OverdueQueryDto,
  type RecentPaymentsQueryDto,
} from './FinanceDashboardDto';

// School finances of the selected year, for the roles that may read fees (the
// fee routes' guard).
@ToolGroup('finance-dashboard')
@Controller('/dashboard/finance')
@isFinancial()
export class FinanceDashboardController {
  constructor(private financeDashboardService: FinanceDashboardService) {}

  @Get('/kpis')
  @McpTool({ description: 'Get finance dashboard KPIs for an academic year', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getKpis() {
    return this.financeDashboardService.getKpis();
  }

  @Get('/trend')
  @McpTool({ description: 'Get monthly finance dashboard trend data for an academic year', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getTrend() {
    return this.financeDashboardService.getTrend();
  }

  @Get('/aging')
  @McpTool({ description: 'Get finance dashboard aging summary', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getAgingSummary() {
    return this.financeDashboardService.getAging();
  }

  @Get('/overdue')
  @McpTool({ description: 'Get overdue students from the finance dashboard', readOnly: true })
  @Validate({ query: overdueQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getOverdue(@Query('limit') limit: OverdueQueryDto['limit']) {
    return this.financeDashboardService.getOverdue(limit ?? 20);
  }

  @Get('/recent-payments')
  @McpTool({ description: 'Get recent finance dashboard payments for an academic year', readOnly: true })
  @Validate({ query: recentPaymentsQueryDto })
  @ResMsg('dashboards.success.retrieved')
  async getRecentPayments(@Query() query: RecentPaymentsQueryDto) {
    return this.financeDashboardService.getRecentPayments(query?.limit ?? 10);
  }

  // ─── Reports ────────────────────────────────────────────────────────────────

  @Get('/reports/expense-breakdown')
  @McpTool({ description: 'Get finance dashboard expense breakdown for an academic year', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getExpenseBreakdown() {
    return this.financeDashboardService.getExpenseBreakdown();
  }

  @Get('/reports/collection-by-class')
  @McpTool({ description: 'Get finance dashboard collection by class for an academic year', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getCollectionByClass() {
    return this.financeDashboardService.getCollectionByClass();
  }

  @Get('/reports/aging-detail')
  @McpTool({ description: 'Get detailed finance dashboard aging report', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getAgingDetail() {
    return this.financeDashboardService.getAgingDetail();
  }
}
