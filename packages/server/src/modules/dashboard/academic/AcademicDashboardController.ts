import { Controller, Get, ResMsg } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAuth, CanSchoolWide } from '../../../auth';
import { AcademicDashboardService } from './AcademicDashboardService';

@ToolGroup('academic-dashboard')
@Controller('/dashboard/academic')
@isAuth()
export class AcademicDashboardController {
  constructor(private academicDashboardService: AcademicDashboardService) {}

  // School-wide counts of students, teachers, today's marks and grades: the
  // route asks for each permission they read.
  @Get('/kpis')
  @CanSchoolWide('read:students', 'read:teachers', 'read:attendance', 'read:grades')
  @McpTool({ description: 'Read the school-wide headline numbers in one call: total students and teachers, attendance rate, the overall average grade (GPA) and how many marks have been recorded (totalGrades). One figure each, no breakdown by class, subject or month, and no count of tests still waiting for marks.', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getKpis() {
    return this.academicDashboardService.getKpis();
  }
}
