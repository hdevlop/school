import { Controller, Get, Params, ResMsg, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { TeacherProfileService } from './TeacherProfileService';
import { isAuth } from '@server/auth';
import { z } from 'zod';

const teacherIdParam = z.object({ teacherId: z.string().min(1) });

@ToolGroup('teacher-profile')
@Controller('/profiles/teachers')
@isAuth()
export class TeacherProfileController {
  constructor(private teacherProfileService: TeacherProfileService) {}

  @Get('/:teacherId/classes')
  @Validate({ params: teacherIdParam })
  @McpTool('Get classes assigned to a teacher')
  @ResMsg('teachers.success.retrieved')
  async getMyClasses(@Params('teacherId') teacherId: string) {
    return this.teacherProfileService.getMyClasses(teacherId);
  }

  @Get('/:teacherId/schedule-today')
  @Validate({ params: teacherIdParam })
  @McpTool('Get teacher schedule for today')
  @ResMsg('teachers.success.retrieved')
  async getScheduleToday(@Params('teacherId') teacherId: string) {
    return this.teacherProfileService.getScheduleToday(teacherId);
  }

  @Get('/:teacherId/pending-grading')
  @Validate({ params: teacherIdParam })
  @McpTool('Get assessments with pending grading for a teacher')
  @ResMsg('teachers.success.retrieved')
  async getPendingGrading(@Params('teacherId') teacherId: string) {
    return this.teacherProfileService.getPendingGrading(teacherId);
  }

  @Get('/:teacherId/students')
  @Validate({ params: teacherIdParam })
  @McpTool('Get all students across assigned classes for a teacher')
  @ResMsg('teachers.success.retrieved')
  async getMyStudents(@Params('teacherId') teacherId: string) {
    return this.teacherProfileService.getMyStudents(teacherId);
  }
}
