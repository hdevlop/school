import { Controller, Get, Params, Query, ResMsg, User, Validate } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { Teacher, Policy, CanRead } from '../../teachers/TeacherGuards';
import { teacherIdParam } from '../../teachers/TeacherDto';
import { TeacherDashboardService } from './TeacherDashboardService';
import { teacherTrendQuery, type TeacherTrendQuery } from './TeacherDashboardDto';

// One teacher's dashboard as a school-wide reader opens it from the teachers
// list. Reading a teacher decides who gets in, and the teachers ownership
// rules decide whose page: a teacher reaches only their own, parents and
// students none.
@ToolGroup('teacher-overview')
@Policy(Teacher)
@Controller('/dashboard/teachers')
export class TeacherOverviewController {
  constructor(private teacherDashboardService: TeacherDashboardService) {}

  @Get('/:id/overview')
  @CanRead()
  @Validate({ params: teacherIdParam })
  @McpTool({ description: "Get a teacher's dashboard by teacher ID: today's lessons, classes, grading and items needing attention", readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getOverview(@Params('id') id: string, @User() user: { id: string; role?: string }) {
    return this.teacherDashboardService.getTeacherOverview(id, user);
  }

  @Get('/:id/attendance-trend')
  @CanRead()
  @Validate({ params: teacherIdParam, query: teacherTrendQuery })
  @McpTool({ description: "Get the attendance trend across a teacher's sections by teacher ID", readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getAttendanceTrend(
    @Params('id') id: string,
    @User() user: { id: string; role?: string },
    @Query() query: TeacherTrendQuery,
  ) {
    return this.teacherDashboardService.getTeacherAttendanceTrend(id, user, query?.range ?? '7d');
  }
}
