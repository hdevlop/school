import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Query, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { AttendanceService } from './AttendanceService';
import { Attendance, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './AttendanceGuards';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { isAdmin } from '../../auth';
import {
  attendanceDateFilterDto,
  attendanceListQuery,
  attendanceYearQuery,
  typeQueryParam,
  attendanceDateParam,
  attendanceIdParam,
  createAttendanceDto,
  seedAttendanceBulkDto,
  sectionIdParam,
  staffIdParam,
  studentIdParam,
  teacherIdParam,
  type AttendanceDateFilterDto,
  type AttendanceListQueryDto,
  type AttendanceTypeQueryDto,
  type SeedAttendanceDto,
  updateAttendanceDto,
  updateAttendanceStatusDto,
  upsertStaffAttendanceRosterDto,
  type CreateAttendanceDto,
  type UpdateAttendanceDto,
  type UpdateAttendanceStatusDto,
  type UpsertStaffAttendanceRosterDto,
} from './AttendanceDto';

@ToolGroup('attendance')
@Policy(Attendance)
@Controller('/attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) { }

  @Get()
  @CanList()
  @Validate({ query: attendanceListQuery })
  @ResMsg('attendance.success.retrieved')
  async listAll(@Query('type') type: AttendanceListQueryDto['type'], @Year() year: ResolvedAcademicYear) {
    return this.attendanceService.getAll(year, { type });
  }

  @Post('/mcp/all')
  @CanList()
  @Validate({ body: typeQueryParam, query: attendanceYearQuery })
  @McpTool('List all attendance records')
  @ResMsg('attendance.success.retrieved')
  async getAll(@Body() body: AttendanceTypeQueryDto, @Year() year: ResolvedAcademicYear) {
    return this.attendanceService.getAll(year, { type: body?.type });
  }

  @Get('/today')
  @CanList()
  @Validate({ query: attendanceListQuery })
  @ResMsg('attendance.success.retrieved')
  async listToday(@Query('type') type: AttendanceTypeQueryDto['type'], @Year() year: ResolvedAcademicYear) {
    return this.attendanceService.getToday(year, type);
  }

  @Post('/mcp/today')
  @CanList()
  @Validate({ body: typeQueryParam, query: attendanceYearQuery })
  @McpTool("List today's attendance records")
  @ResMsg('attendance.success.retrieved')
  async getToday(@Body() body: AttendanceTypeQueryDto, @Year() year: ResolvedAcademicYear) {
    return this.attendanceService.getToday(year, body?.type);
  }

  @Post('/mcp/today/students')
  @Validate({ query: attendanceYearQuery })
  @CanList()
  @McpTool("List today's student attendance records")
  @ResMsg('attendance.success.retrieved')
  async getTodayStudents(@Year() year: ResolvedAcademicYear) {
    return this.attendanceService.getToday(year, 'student');
  }

  @Post('/mcp/today/staff')
  @Validate({ query: attendanceYearQuery })
  @CanList()
  @McpTool("List today's staff attendance records")
  @ResMsg('attendance.success.retrieved')
  async getTodayStaff(@Year() year: ResolvedAcademicYear) {
    return this.attendanceService.getToday(year, 'staff');
  }

  @Get('/date/:date')
  @CanList()
  @Validate({ params: attendanceDateParam, query: typeQueryParam })
  @ResMsg('attendance.success.retrieved')
  async listByDate(@Params('date') date: string, @Query() query: AttendanceTypeQueryDto, @User() user: { role?: string }) {
    return this.attendanceService.getByDate(date, query?.type, user.role);
  }

  @Post('/mcp/date')
  @CanList()
  @Validate({ body: attendanceDateFilterDto })
  @McpTool('Get attendance records for a specific date')
  @ResMsg('attendance.success.retrieved')
  async getByDate(@Body() body: AttendanceDateFilterDto, @User() user: { role?: string }) {
    return this.attendanceService.getByDate(body.date, body.type, user.role);
  }

  @Get('/section/:sectionId')
  @CanList()
  @Validate({ params: sectionIdParam, query: attendanceYearQuery })
  @McpTool('Get attendance records for a section')
  @ResMsg('attendance.success.retrieved')
  async getBySection(@Params('sectionId') sectionId: string, @Year() year: ResolvedAcademicYear) {
    return this.attendanceService.getAll(year, { sectionId });
  }

  @Get('/student/:studentId')
  @CanList()
  @Validate({ params: studentIdParam, query: attendanceYearQuery })
  @McpTool('Get attendance records for a student')
  @ResMsg('attendance.success.retrieved')
  async getByStudent(@Params('studentId') studentId: string, @Year() year: ResolvedAcademicYear) {
    return this.attendanceService.getAll(year, { studentId });
  }

  @Get('/staff/:staffId')
  @CanList()
  @Validate({ params: staffIdParam, query: attendanceYearQuery })
  @McpTool('Get attendance records for a staff member')
  @ResMsg('attendance.success.retrieved')
  async getByStaff(@Params('staffId') staffId: string, @Year() year: ResolvedAcademicYear) {
    return this.attendanceService.getAll(year, { staffId });
  }

  @Get('/teacher/:teacherId')
  @CanList()
  @Validate({ params: teacherIdParam, query: attendanceYearQuery })
  @McpTool('Get attendance records for a teacher through their staff profile')
  @ResMsg('attendance.success.retrieved')
  async getByTeacher(@Params('teacherId') teacherId: string, @Year() year: ResolvedAcademicYear) {
    return this.attendanceService.getByTeacher(teacherId, year);
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: attendanceIdParam })
  @McpTool('Get an attendance record by ID')
  @ResMsg('attendance.success.retrieved')
  async getById(@Params('id') id: string, @User() user: { role?: string }) {
    return this.attendanceService.getById(id, user.role);
  }

  @Post()
  @CanCreate()
  @Validate(createAttendanceDto)
  @McpTool({ description: 'Mark attendance for a student or staff member', confirm: { level: 'warning', message: 'confirm.attendance.mark' } })
  @ResMsg('attendance.success.marked')
  async mark(@Body() body: CreateAttendanceDto, @User() user: { id: string; role?: string; teacherId?: string }) {
    return this.attendanceService.mark(body, user);
  }

  @Post('/staff/bulk')
  @isAdmin()
  @Validate({ body: upsertStaffAttendanceRosterDto })
  @ResMsg('attendance.success.marked')
  async upsertStaffRoster(
    @Body() body: UpsertStaffAttendanceRosterDto,
    @User() user: { id: string; role?: string },
  ) {
    return this.attendanceService.upsertStaffRoster(body, user);
  }

  @Post('/seed')
  @isAdmin()
  @Validate(seedAttendanceBulkDto)
  @McpTool({ description: 'Seed attendance demo data', confirm: { level: 'danger', message: 'confirm.attendance.seed' } })
  @ResMsg('attendance.success.seeded')
  async seedAttendanceDemo(@Body() body: SeedAttendanceDto[]) {
    return this.attendanceService.seedDemo(body);
  }

  // Daily-mode correction: a later teacher of the same section updates the
  // status of an existing same-day record (e.g. absent → late). Must be
  // declared before @Put('/:id') so the literal route wins over the dynamic
  // one.
  @Put('/status')
  @CanUpdate()
  @Validate({ body: updateAttendanceStatusDto })
  @McpTool({ description: 'Update attendance status', confirm: { level: 'warning', message: 'confirm.attendance.updateStatus' } })
  @ResMsg('attendance.success.updated')
  async updateStatus(@Body() body: UpdateAttendanceStatusDto, @User() user: { id: string; role?: string; teacherId?: string }) {
    return this.attendanceService.updateStatus(body, user);
  }

  @Get('/:id/history')
  @CanRead()
  @Validate({ params: attendanceIdParam })
  @ResMsg('attendance.success.retrieved')
  async getHistory(@Params('id') id: string, @User() user: { role?: string }) {
    return this.attendanceService.getHistory(id, user.role);
  }

  @Put('/:id')
  @CanUpdate()
  @Validate({ params: attendanceIdParam, body: updateAttendanceDto })
  @McpTool({ description: 'Update an attendance record by ID', confirm: { level: 'warning', message: 'confirm.attendance.update' } })
  @ResMsg('attendance.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateAttendanceDto, @User() user: { id: string; role?: string; teacherId?: string }) {
    return this.attendanceService.update(id, body, user);
  }

  @Delete('/:id')
  @CanDelete()
  @Validate({ params: attendanceIdParam })
  @McpTool({ description: 'Delete an attendance record by ID', confirm: { level: 'danger', message: 'confirm.attendance.delete' } })
  @ResMsg('attendance.success.deleted')
  async delete(@Params('id') id: string, @User() user: { role?: string }) {
    return this.attendanceService.delete(id, user.role);
  }

  @Delete()
  @isAdmin()
  @McpTool({ description: 'Delete all attendance records', confirm: { level: 'danger', message: 'confirm.attendance.deleteAll' } })
  @ResMsg('attendance.success.allDeleted')
  async deleteAll() {
    return this.attendanceService.deleteAll();
  }
}
