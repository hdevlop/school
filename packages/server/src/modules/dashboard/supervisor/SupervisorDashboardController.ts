import { Controller, Get, ResMsg, User } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { Can, isSupervisor } from '../../../auth';
import { SupervisorDashboardService } from './SupervisorDashboardService';
import { DashboardService } from '../DashboardService';

// The signed-in supervisor's own home page, over the whole school. The role
// picks this dashboard; read:dashboard, granted in the roles screen, opens it.
@ToolGroup('supervisor-dashboard')
@Controller('/dashboard/supervisor')
@isSupervisor()
export class SupervisorDashboardController {
  constructor(private supervisorDashboardService: SupervisorDashboardService, private dashboard: DashboardService) {}

  // The whole school's counts only; individual staff attendance records still
  // require read:staff-attendance on their own routes.
  @Get('/attendance/staff-monthly')
  @Can('read:dashboard')
  @ResMsg('dashboards.success.retrieved')
  getStaffAttendanceMonthly() {
    return this.dashboard.getAttendanceMonthly('staff');
  }

  @Get('/overview')
  @Can('read:dashboard')
  @McpTool({ description: "Get the signed-in supervisor's dashboard: today's registers and absences, open incidents, grades by class and new visit requests across the school", readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getOverview(@User() user: { id: string; role?: string; permissions?: string[] }) {
    return this.supervisorDashboardService.getOverview(user);
  }
}
