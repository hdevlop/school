import { Controller, Get, ResMsg } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAuth } from '../../../auth';
import { AcademicDashboardService } from './AcademicDashboardService';

@ToolGroup('academic-dashboard')
@Controller('/dashboard/academic')
@isAuth()
export class AcademicDashboardController {
  constructor(private academicDashboardService: AcademicDashboardService) {}

  @Get('/kpis')
  @McpTool('Get academic dashboard KPIs — total students, teachers, attendance rate, avg GPA, pending grading')
  @ResMsg('dashboards.success.retrieved')
  async getKpis() {
    return this.academicDashboardService.getKpis();
  }
}
