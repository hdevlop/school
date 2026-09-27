import { Controller, Get, ResMsg, Validate } from '../../../najm';
import { Year } from '../../academicYears/requestYear';
import { academicYearQuery } from '../../academicYears/AcademicYearDto';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAuth } from '../../../auth';
import { AcademicDashboardService } from './AcademicDashboardService';

@ToolGroup('academic-dashboard')
@Controller('/dashboard/academic')
@isAuth()
export class AcademicDashboardController {
  constructor(private academicDashboardService: AcademicDashboardService) {}

  @Get('/kpis')
  @Validate({ query: academicYearQuery })
  @McpTool('Get academic dashboard KPIs — total students, teachers, attendance rate, avg GPA, pending grading')
  @ResMsg('dashboards.success.retrieved')
  async getKpis(@Year() year: ResolvedAcademicYear) {
    return this.academicDashboardService.getKpis(year);
  }
}
