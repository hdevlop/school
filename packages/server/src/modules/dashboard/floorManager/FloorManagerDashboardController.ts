import { Controller, Get, ResMsg, User } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isFloorManager } from '../../../auth';
import { FloorManagerDashboardService } from './FloorManagerDashboardService';

// The signed-in floor manager's own home page, over the grades they run.
@ToolGroup('floor-manager-dashboard')
@Controller('/dashboard/floor-manager')
@isFloorManager()
export class FloorManagerDashboardController {
  constructor(private floorManagerDashboardService: FloorManagerDashboardService) {}

  @Get('/overview')
  @McpTool({ description: "Get the signed-in floor manager's dashboard: today's registers, absences and open incidents in the grades they run", readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getOverview(@User() user: { id: string; role?: string }) {
    return this.floorManagerDashboardService.getOverview(user);
  }
}
