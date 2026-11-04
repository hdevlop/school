import { Controller, Get, ResMsg, User } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { Can, isRegistrar } from '../../../auth';
import { RegistrarDashboardService } from './RegistrarDashboardService';
import { DashboardService } from '../DashboardService';

@ToolGroup('registrar-dashboard')
@Controller('/dashboard/registrar')
@isRegistrar()
export class RegistrarDashboardController {
  constructor(private service: RegistrarDashboardService, private dashboard: DashboardService) {}

  // Aggregate student counts do not expose individual attendance records, which
  // still require read:attendance on their own routes.
  @Get('/attendance/students-monthly')
  @Can('read:dashboard')
  @ResMsg('dashboards.success.retrieved')
  getStudentAttendanceMonthly() {
    return this.dashboard.getAttendanceMonthly('student');
  }

  @Get('/overview')
  @Can('read:dashboard')
  @McpTool({ description: 'Get the registrar dashboard: grade totals, pass rate, grade distribution, and monthly, class and subject averages for the academic year, without individual grades', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  getOverview(@User() user: { id: string; permissions?: string[] }) {
    return this.service.getOverview(user);
  }
}
