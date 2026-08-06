import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAdmin } from '@server/auth';
import { StaffRoleService } from './StaffRoleService';
import {
  createStaffRoleDto,
  staffRoleCodeParam,
  updateStaffRoleDto,
  type CreateStaffRoleDto,
  type UpdateStaffRoleDto,
} from './StaffRoleDto';

@ToolGroup('staff-roles')
@Controller('/staff-roles')
export class StaffRoleController {
  constructor(private staffRoleService: StaffRoleService) { }

  @Get()
  @isAdmin()
  @McpTool('List all staff roles')
  @ResMsg('staffRoles.success.retrieved')
  async list() {
    return this.staffRoleService.list();
  }

  @Get('/active')
  @isAdmin()
  @McpTool('List active staff roles')
  @ResMsg('staffRoles.success.retrieved')
  async listActive() {
    return this.staffRoleService.listActive();
  }

  @Post()
  @isAdmin()
  @Validate(createStaffRoleDto)
  @McpTool({ description: 'Create a staff role', confirm: { level: 'warning', message: 'confirm.staffRoles.create' } })
  @ResMsg('staffRoles.success.created')
  async create(@Body() body: CreateStaffRoleDto) {
    return this.staffRoleService.create(body);
  }

  @Put('/:code')
  @isAdmin()
  @Validate({ params: staffRoleCodeParam, body: updateStaffRoleDto })
  @McpTool({ description: 'Update a staff role by code', confirm: { level: 'warning', message: 'confirm.staffRoles.update' } })
  @ResMsg('staffRoles.success.updated')
  async update(@Params('code') code: string, @Body() body: UpdateStaffRoleDto) {
    return this.staffRoleService.update(code, body);
  }

  @Delete('/:code')
  @isAdmin()
  @Validate({ params: staffRoleCodeParam })
  @McpTool({ description: 'Delete or deactivate a staff role by code', confirm: { level: 'danger', message: 'confirm.staffRoles.delete' } })
  @ResMsg('staffRoles.success.deleted')
  async remove(@Params('code') code: string) {
    return this.staffRoleService.remove(code);
  }
}
