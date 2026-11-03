import { Controller, Get, ResMsg, User } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { Can, isSecretary } from '../../../auth';
import { SecretaryDashboardService } from './SecretaryDashboardService';

@ToolGroup('secretary-dashboard')
@Controller('/dashboard/secretary')
@isSecretary()
export class SecretaryDashboardController {
  constructor(private service: SecretaryDashboardService) {}

  @Get('/overview')
  @Can('read:dashboard')
  @McpTool({ description: 'Get the secretary dashboard: active student and parent totals, visit-request follow-up queue and personal unread notifications', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  getOverview(@User() user: { id: string; permissions?: string[] }) {
    return this.service.getOverview(user);
  }
}
