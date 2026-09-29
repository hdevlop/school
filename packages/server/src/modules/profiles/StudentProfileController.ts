import { Controller, Get, Params, ResMsg, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { StudentProfileService } from './StudentProfileService';
import { Can, isAdmin, isAuth, isFinancial } from '../../auth';
import { z } from 'zod';

const studentIdParam = z.object({ studentId: z.string().min(1) });

// Each tab asks for what its data's own module asks for on its routes, so a
// profile never shows a role more than that module would: fees stay with the
// finance roles and student routes with the administrator.
@ToolGroup('student-profile')
@Controller('/profiles/students')
@isAuth()
export class StudentProfileController {
  constructor(private studentProfileService: StudentProfileService) {}

  @Get('/:studentId/overview')
  @Can('read:students')
  @Validate({ params: studentIdParam })
  @McpTool('Get student overview — bio, class and section in the academic year, parents')
  @ResMsg('students.success.retrieved')
  async getOverview(@Params('studentId') studentId: string) {
    return this.studentProfileService.getOverview(studentId);
  }

  @Get('/:studentId/academic')
  @Can('read:grades')
  @Validate({ params: studentIdParam })
  @McpTool('Get student academic profile in the academic year — grades, assessments, upcoming exams')
  @ResMsg('students.success.retrieved')
  async getAcademic(@Params('studentId') studentId: string) {
    return this.studentProfileService.getAcademic(studentId);
  }

  @Get('/:studentId/attendance')
  @Can('read:attendance')
  @Validate({ params: studentIdParam })
  @McpTool('Get student attendance summary in the academic year')
  @ResMsg('students.success.retrieved')
  async getAttendanceSummary(@Params('studentId') studentId: string) {
    return this.studentProfileService.getAttendanceSummary(studentId);
  }

  @Get('/:studentId/financial')
  @isFinancial()
  @Validate({ params: studentIdParam })
  @McpTool('Get student financial profile in the academic year — fees, payments, balance')
  @ResMsg('students.success.retrieved')
  async getFinancial(@Params('studentId') studentId: string) {
    return this.studentProfileService.getFinancial(studentId);
  }

  @Get('/:studentId/transport')
  @isAdmin()
  @Validate({ params: studentIdParam })
  @McpTool('Get student transport in the academic year — route, vehicle, driver')
  @ResMsg('students.success.retrieved')
  async getTransport(@Params('studentId') studentId: string) {
    return this.studentProfileService.getTransport(studentId);
  }
}
