import { Controller, Get, ResMsg, User } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { Can, isMonitor } from '../../../auth';
import { MonitorDashboardService } from './MonitorDashboardService';

// The signed-in monitor's own home page, over the grades they run. The
// role picks this dashboard; read:dashboard, granted in the roles screen, opens it.
@ToolGroup('monitor-dashboard')
@Controller('/dashboard/monitor')
@isMonitor()
export class MonitorDashboardController {
  constructor(private monitorDashboardService: MonitorDashboardService) {}

  @Get('/overview')
  @Can('read:dashboard')
  @McpTool({ description: "Get the signed-in monitor's dashboard: today's registers, absences and open incidents in the grades they run", readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getOverview(@User() user: { id: string; role?: string }) {
    return this.monitorDashboardService.getOverview(user);
  }
}
