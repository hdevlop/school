import { Controller, Get, ResMsg, User } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { Can, isFloorManager } from '../../../auth';
import { FloorManagerDashboardService } from './FloorManagerDashboardService';

// The signed-in floor manager's own home page, over the grades they run. The
// role picks this dashboard; read:dashboard, granted in the roles screen, opens it.
@ToolGroup('floor-manager-dashboard')
@Controller('/dashboard/floor-manager')
@isFloorManager()
export class FloorManagerDashboardController {
  constructor(private floorManagerDashboardService: FloorManagerDashboardService) {}

  @Get('/overview')
  @Can('read:dashboard')
  @McpTool({ description: "Get the signed-in monitor's dashboard: today's registers, absences and open incidents in the grades they run", readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getOverview(@User() user: { id: string; role?: string }) {
    return this.floorManagerDashboardService.getOverview(user);
  }
}
