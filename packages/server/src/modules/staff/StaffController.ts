import { Body, Controller, Delete, Get, Params, Post, Put, Query, ResMsg, User, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { CanSchoolWide } from '../../auth';

import { StaffService } from './StaffService';
import {
  createStaffDto,
  deleteBulkStaffDto,
  staffEmployeeCodeParam,
  staffAttendanceRosterQueryDto,
  staffIdParam,
  staffRoleParam,
  updateStaffDto,
  type CreateStaffDto,
  type DeleteBulkStaffDto,
  type StaffAttendanceRosterQueryDto,
  type UpdateStaffDto,
} from './StaffDto';

@ToolGroup('staff')
@Controller('/staff')
export class StaffController {
  constructor(private staffService: StaffService) { }

  @Get()
  @CanSchoolWide('read:staff')
  @McpTool({ description: 'List all staff', readOnly: true })
  @ResMsg('staff.success.retrieved')
  async listStaff() {
    return this.staffService.getAll();
  }

  @Get('/count')
  @CanSchoolWide('read:staff')
  @McpTool({ description: 'Get staff count. Nombre total du personnel. العدد الإجمالي للموظفين.', readOnly: true })
  @ResMsg('staff.success.retrieved')
  async getStaffCount() {
    return this.staffService.getAll().then((rows) => ({ count: rows.length }));
  }

  @Get('/attendance-roster')
  @CanSchoolWide('read:staff-attendance')
  @Validate({ query: staffAttendanceRosterQueryDto })
  @McpTool({ description: 'List staff for attendance roster', readOnly: true })
  @ResMsg('staff.success.retrieved')
  async getAttendanceRoster(@Query() query: StaffAttendanceRosterQueryDto) {
    return this.staffService.getAttendanceRoster(query?.date);
  }

  @Get('/role/:role')
  @CanSchoolWide('read:staff')
  @Validate({ params: staffRoleParam })
  @McpTool({ description: 'List staff by role', readOnly: true })
  @ResMsg('staff.success.retrieved')
  async getStaffByRole(@Params('role') role: string) {
    return this.staffService.getByRole(role);
  }

  @Get('/employee-code/:employeeCode')
  @CanSchoolWide('read:staff')
  @Validate({ params: staffEmployeeCodeParam })
  @McpTool({ description: 'Get a staff member by employee code', readOnly: true })
  @ResMsg('staff.success.retrieved')
  async getByEmployeeCode(@Params('employeeCode') employeeCode: string) {
    return this.staffService.getByEmployeeCode(employeeCode);
  }

  @Get('/cin/:cin')
  @CanSchoolWide('read:staff')
  @McpTool({ description: 'Get a staff member by CIN', readOnly: true })
  @ResMsg('staff.success.retrieved')
  async getByCin(@Params('cin') cin: string) {
    return this.staffService.getByCin(cin);
  }

  @Get('/:id')
  @CanSchoolWide('read:staff')
  @Validate({ params: staffIdParam })
  @McpTool({ description: 'Get a staff member by ID', readOnly: true })
  @ResMsg('staff.success.retrieved')
  async getStaffMember(@Params('id') id: string) {
    return this.staffService.getById(id);
  }

  @Post()
  @CanSchoolWide('create:staff')
  @Validate(createStaffDto)
  @McpTool({ description: 'Create a new staff member', confirm: { level: 'warning', message: 'confirm.staff.create' } })
  @ResMsg('staff.success.created')
  async create(@Body() body: CreateStaffDto, @User('permissions') permissions?: string[]) {
    return this.staffService.create(body, { permissions: permissions ?? [] });
  }

  @Put('/:id')
  @CanSchoolWide('update:staff')
  @Validate({ params: staffIdParam, body: updateStaffDto })
  @McpTool({ description: 'Update a staff member by ID', confirm: { level: 'warning', message: 'confirm.staff.update' } })
  @ResMsg('staff.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateStaffDto, @User('permissions') permissions?: string[]) {
    return this.staffService.update(id, body, { permissions: permissions ?? [] });
  }

  @Delete('/bulk')
  @CanSchoolWide('delete:staff')
  @Validate({ body: deleteBulkStaffDto })
  @McpTool({ description: 'Delete multiple staff members by IDs', confirm: { level: 'danger', message: 'confirm.staff.bulkDelete' } })
  @ResMsg('staff.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteBulkStaffDto, @User('permissions') permissions?: string[]) {
    return this.staffService.deleteBulk(body, { permissions: permissions ?? [] });
  }

  @Delete('/:id')
  @CanSchoolWide('delete:staff')
  @Validate({ params: staffIdParam })
  @McpTool({ description: 'Delete a staff member by ID', confirm: { level: 'danger', message: 'confirm.staff.delete' } })
  @ResMsg('staff.success.deleted')
  async deleteById(@Params('id') id: string, @User('permissions') permissions?: string[]) {
    return this.staffService.delete(id, {}, { permissions: permissions ?? [] });
  }
}
