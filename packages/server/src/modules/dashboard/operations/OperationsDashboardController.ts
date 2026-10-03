import { Controller, Get, ResMsg } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAuth } from '../../../auth';
import { OperationsDashboardService } from './OperationsDashboardService';

@ToolGroup('operations-dashboard')
@Controller('/dashboard/operations')
@isAuth()
export class OperationsDashboardController {
  constructor(private operationsDashboardService: OperationsDashboardService) {}

  @Get('/kpis')
  @McpTool({ description: 'Get operations dashboard KPIs — active events, announcements, critical alerts, transport status', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getKpis() {
    return this.operationsDashboardService.getKpis();
  }
}
