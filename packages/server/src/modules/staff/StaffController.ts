import { Body, Controller, Delete, Get, Params, Post, Put, Query, ResMsg, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAdmin } from '@server/auth';

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
  @isAdmin()
  @McpTool('List all staff')
  @ResMsg('staff.success.retrieved')
  async getStaff() {
    return this.staffService.getAll();
  }

  @Get('/count')
  @isAdmin()
  @McpTool('Get staff count')
  @ResMsg('staff.success.retrieved')
  async getStaffCount() {
    return this.staffService.getAll().then((rows) => ({ count: rows.length }));
  }

  @Get('/attendance-roster')
  @isAdmin()
  @Validate({ query: staffAttendanceRosterQueryDto })
  @McpTool('List staff for attendance roster')
  @ResMsg('staff.success.retrieved')
  async getAttendanceRoster(@Query() query: StaffAttendanceRosterQueryDto = {}) {
    return this.staffService.getAttendanceRoster(query.date);
  }

  @Get('/role/:role')
  @isAdmin()
  @Validate({ params: staffRoleParam })
  @McpTool('List staff by role')
  @ResMsg('staff.success.retrieved')
  async getStaffByRole(@Params('role') role: string) {
    return this.staffService.getByRole(role);
  }

  @Get('/employee-code/:employeeCode')
  @isAdmin()
  @Validate({ params: staffEmployeeCodeParam })
  @McpTool('Get a staff member by employee code')
  @ResMsg('staff.success.retrieved')
  async getByEmployeeCode(@Params('employeeCode') employeeCode: string) {
    return this.staffService.getByEmployeeCode(employeeCode);
  }

  @Get('/cin/:cin')
  @isAdmin()
  @McpTool('Get a staff member by CIN')
  @ResMsg('staff.success.retrieved')
  async getByCin(@Params('cin') cin: string) {
    return this.staffService.getByCin(cin);
  }

  @Get('/:id')
  @isAdmin()
  @Validate({ params: staffIdParam })
  @McpTool('Get a staff member by ID')
  @ResMsg('staff.success.retrieved')
  async getStaffMember(@Params('id') id: string) {
    return this.staffService.getById(id);
  }

  @Post()
  @isAdmin()
  @Validate(createStaffDto)
  @McpTool({ description: 'Create a new staff member', confirm: { level: 'warning', message: 'confirm.staff.create' } })
  @ResMsg('staff.success.created')
  async create(@Body() body: CreateStaffDto) {
    return this.staffService.create(body);
  }

  @Put('/:id')
  @isAdmin()
  @Validate({ params: staffIdParam, body: updateStaffDto })
  @McpTool({ description: 'Update a staff member by ID', confirm: { level: 'warning', message: 'confirm.staff.update' } })
  @ResMsg('staff.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateStaffDto) {
    return this.staffService.update(id, body);
  }

  @Delete('/bulk')
  @isAdmin()
  @Validate({ body: deleteBulkStaffDto })
  @McpTool({ description: 'Delete multiple staff members by IDs', confirm: { level: 'danger', message: 'confirm.staff.bulkDelete' } })
  @ResMsg('staff.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteBulkStaffDto) {
    return this.staffService.deleteBulk(body);
  }

  @Delete('/:id')
  @isAdmin()
  @Validate({ params: staffIdParam })
  @McpTool({ description: 'Delete a staff member by ID', confirm: { level: 'danger', message: 'confirm.staff.delete' } })
  @ResMsg('staff.success.deleted')
  async delete(@Params('id') id: string) {
    return this.staffService.delete(id);
  }
}
