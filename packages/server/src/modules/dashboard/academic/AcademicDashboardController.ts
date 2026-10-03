import { Controller, Get, ResMsg } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAuth, isStaff } from '../../../auth';
import { AcademicDashboardService } from './AcademicDashboardService';

@ToolGroup('academic-dashboard')
@Controller('/dashboard/academic')
@isAuth()
export class AcademicDashboardController {
  constructor(private academicDashboardService: AcademicDashboardService) {}

  // School-wide counts are for staff, not parents or students.
  @Get('/kpis')
  @isStaff()
  @McpTool({ description: 'Get academic dashboard KPIs — total students, teachers, attendance rate, avg GPA, pending grading', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getKpis() {
    return this.academicDashboardService.getKpis();
  }
}
