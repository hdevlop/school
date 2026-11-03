import { Controller, Get, Query, ResMsg, User, Validate } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { Can, isTeacher } from '../../../auth';
import { TeacherDashboardService } from './TeacherDashboardService';
import { teacherTrendQuery, type TeacherTrendQuery } from './TeacherDashboardDto';

// The signed-in teacher's own home page. The teacher is resolved from the
// session, never from a parameter, so there is nothing to point at another
// teacher's figures. The role picks this dashboard; read:dashboard, granted
// in the roles screen, opens it.
@ToolGroup('teacher-dashboard')
@Controller('/dashboard/teacher')
@isTeacher()
export class TeacherDashboardController {
  constructor(private teacherDashboardService: TeacherDashboardService) {}

  @Get('/overview')
  @Can('read:dashboard')
  @McpTool({ description: "Get the signed-in teacher's dashboard: today's lessons, classes, grading and items needing attention", readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getOverview(@User() user: { id: string; role?: string }) {
    return this.teacherDashboardService.getOverview(user);
  }

  @Get('/attendance-trend')
  @Can('read:dashboard')
  @McpTool({ description: "Get the attendance trend across the signed-in teacher's sections", readOnly: true })
  @Validate({ query: teacherTrendQuery })
  @ResMsg('dashboards.success.retrieved')
  async getAttendanceTrend(@User() user: { id: string; role?: string }, @Query() query: TeacherTrendQuery) {
    return this.teacherDashboardService.getAttendanceTrend(user, query?.range ?? '7d');
  }
}
