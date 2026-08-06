import { Controller, Get, Params, ResMsg, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { StudentProfileService } from './StudentProfileService';
import { isAuth } from '@server/auth';
import { z } from 'zod';

const studentIdParam = z.object({ studentId: z.string().min(1) });

@ToolGroup('student-profile')
@Controller('/profiles/students')
@isAuth()
export class StudentProfileController {
  constructor(private studentProfileService: StudentProfileService) {}

  @Get('/:studentId/overview')
  @Validate({ params: studentIdParam })
  @McpTool('Get student overview — bio, class, section, parents')
  @ResMsg('students.success.retrieved')
  async getOverview(@Params('studentId') studentId: string) {
    return this.studentProfileService.getOverview(studentId);
  }

  @Get('/:studentId/academic')
  @Validate({ params: studentIdParam })
  @McpTool('Get student academic profile — grades, upcoming assessments, exams')
  @ResMsg('students.success.retrieved')
  async getAcademic(@Params('studentId') studentId: string) {
    return this.studentProfileService.getAcademic(studentId);
  }

  @Get('/:studentId/attendance')
  @Validate({ params: studentIdParam })
  @McpTool('Get student attendance summary')
  @ResMsg('students.success.retrieved')
  async getAttendanceSummary(@Params('studentId') studentId: string) {
    return this.studentProfileService.getAttendanceSummary(studentId);
  }

  @Get('/:studentId/financial')
  @Validate({ params: studentIdParam })
  @McpTool('Get student financial profile — fees, payments, balance')
  @ResMsg('students.success.retrieved')
  async getFinancial(@Params('studentId') studentId: string) {
    return this.studentProfileService.getFinancial(studentId);
  }

  @Get('/:studentId/transport')
  @Validate({ params: studentIdParam })
  @McpTool('Get student transport info — route, vehicle, driver')
  @ResMsg('students.success.retrieved')
  async getTransport(@Params('studentId') studentId: string) {
    return this.studentProfileService.getTransport(studentId);
  }
}
