import { Controller, Get, Params, ResMsg, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { TeacherProfileService } from './TeacherProfileService';
import { Can, isAuth } from '../../auth';
import { z } from 'zod';

const teacherIdParam = z.object({ teacherId: z.string().min(1) });

// Each tab asks for what its data's own module asks for, as on the teacher's
// own routes; pending grading reads grades too.
@ToolGroup('teacher-profile')
@Controller('/profiles/teachers')
@isAuth()
export class TeacherProfileController {
  constructor(private teacherProfileService: TeacherProfileService) {}

  @Get('/:teacherId/classes')
  @Can('read:teachers')
  @Validate({ params: teacherIdParam })
  @McpTool({ description: 'Get the classes a teacher teaches in the academic year', readOnly: true })
  @ResMsg('teachers.success.retrieved')
  async getMyClasses(@Params('teacherId') teacherId: string) {
    return this.teacherProfileService.getMyClasses(teacherId);
  }

  @Get('/:teacherId/schedule-today')
  @Can('read:teachers')
  @Validate({ params: teacherIdParam })
  @McpTool({ description: "Get a teacher's classes and today's assessments; today exists only in the academic year that holds it", readOnly: true })
  @ResMsg('teachers.success.retrieved')
  async getScheduleToday(@Params('teacherId') teacherId: string) {
    return this.teacherProfileService.getScheduleToday(teacherId);
  }

  @Get('/:teacherId/pending-grading')
  @Can('read:teachers')
  @Can('read:grades')
  @Validate({ params: teacherIdParam })
  @McpTool({ description: 'Get assessments with pending grading for a teacher in the academic year', readOnly: true })
  @ResMsg('teachers.success.retrieved')
  async getPendingGrading(@Params('teacherId') teacherId: string) {
    return this.teacherProfileService.getPendingGrading(teacherId);
  }

  @Get('/:teacherId/students')
  @Can('read:teachers')
  @Validate({ params: teacherIdParam })
  @McpTool({ description: "Get the students placed in a teacher's sections in the academic year", readOnly: true })
  @ResMsg('teachers.success.retrieved')
  async getMyStudents(@Params('teacherId') teacherId: string) {
    return this.teacherProfileService.getMyStudents(teacherId);
  }
}
