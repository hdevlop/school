import { Controller, Get, ResMsg, User } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { Can, isSupervisor } from '../../../auth';
import { SupervisorDashboardService } from './SupervisorDashboardService';

// The signed-in supervisor's own home page, over the whole school. The role
// picks this dashboard; read:dashboard, granted in the roles screen, opens it.
@ToolGroup('supervisor-dashboard')
@Controller('/dashboard/supervisor')
@isSupervisor()
export class SupervisorDashboardController {
  constructor(private supervisorDashboardService: SupervisorDashboardService) {}

  @Get('/overview')
  @Can('read:dashboard')
  @McpTool({ description: "Get the signed-in supervisor's dashboard: today's registers and absences, open incidents, grades by class and new visit requests across the school", readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getOverview(@User() user: { id: string; role?: string; permissions?: string[] }) {
    return this.supervisorDashboardService.getOverview(user);
  }
}
