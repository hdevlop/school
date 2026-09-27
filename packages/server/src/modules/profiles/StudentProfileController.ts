import { Controller, Get, Params, ResMsg, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { StudentProfileService } from './StudentProfileService';
import { isAuth } from '../../auth';
import { z } from 'zod';
import { Year } from '../academicYears/requestYear';
import { academicYearQuery } from '../academicYears/AcademicYearDto';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';

const studentIdParam = z.object({ studentId: z.string().min(1) });

@ToolGroup('student-profile')
@Controller('/profiles/students')
@isAuth()
export class StudentProfileController {
  constructor(private studentProfileService: StudentProfileService) {}

  @Get('/:studentId/overview')
  @Validate({ params: studentIdParam, query: academicYearQuery })
  @McpTool('Get student overview — bio, class and section in the academic year, parents')
  @ResMsg('students.success.retrieved')
  async getOverview(@Params('studentId') studentId: string, @Year() year: ResolvedAcademicYear) {
    return this.studentProfileService.getOverview(studentId, year);
  }

  @Get('/:studentId/academic')
  @Validate({ params: studentIdParam, query: academicYearQuery })
  @McpTool('Get student academic profile — grades, upcoming assessments, exams')
  @ResMsg('students.success.retrieved')
  async getAcademic(@Params('studentId') studentId: string, @Year() year: ResolvedAcademicYear) {
    return this.studentProfileService.getAcademic(studentId, year);
  }

  @Get('/:studentId/attendance')
  @Validate({ params: studentIdParam, query: academicYearQuery })
  @McpTool('Get student attendance summary')
  @ResMsg('students.success.retrieved')
  async getAttendanceSummary(@Params('studentId') studentId: string, @Year() year: ResolvedAcademicYear) {
    return this.studentProfileService.getAttendanceSummary(studentId, year);
  }

  @Get('/:studentId/financial')
  @Validate({ params: studentIdParam, query: academicYearQuery })
  @McpTool('Get student financial profile — fees, payments, balance')
  @ResMsg('students.success.retrieved')
  async getFinancial(@Params('studentId') studentId: string, @Year() year: ResolvedAcademicYear) {
    return this.studentProfileService.getFinancial(studentId, year);
  }

  @Get('/:studentId/transport')
  @Validate({ params: studentIdParam })
  @McpTool('Get student transport info — route, vehicle, driver')
  @ResMsg('students.success.retrieved')
  async getTransport(@Params('studentId') studentId: string) {
    return this.studentProfileService.getTransport(studentId);
  }
}
