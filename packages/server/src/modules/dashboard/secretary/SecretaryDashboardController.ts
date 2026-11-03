import { Controller, Get, ResMsg, User } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { Can, isSecretary } from '../../../auth';
import { SecretaryDashboardService } from './SecretaryDashboardService';
import { DashboardService } from '../DashboardService';

@ToolGroup('secretary-dashboard')
@Controller('/dashboard/secretary')
@isSecretary()
export class SecretaryDashboardController {
  constructor(private service: SecretaryDashboardService, private dashboard: DashboardService) {}

  // The secretary dashboard exposes counts only; individual staff attendance
  // records still require read:staff-attendance on their own routes.
  @Get('/attendance/staff-monthly')
  @Can('read:dashboard')
  @ResMsg('dashboards.success.retrieved')
  getStaffAttendanceMonthly() {
    return this.dashboard.getAttendanceMonthly('staff');
  }

  // Aggregate student counts do not expose individual attendance records.
  @Get('/attendance/students-monthly')
  @Can('read:dashboard')
  @ResMsg('dashboards.success.retrieved')
  getStudentAttendanceMonthly() {
    return this.dashboard.getAttendanceMonthly('student');
  }

  @Get('/overview')
  @Can('read:dashboard')
  @McpTool({ description: 'Get the secretary dashboard: teacher and parent totals, monthly incident counts by severity, permitted active student totals, visit-request follow-up queue and personal unread notifications', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  getOverview(@User() user: { id: string; permissions?: string[] }) {
    return this.service.getOverview(user);
  }
}
