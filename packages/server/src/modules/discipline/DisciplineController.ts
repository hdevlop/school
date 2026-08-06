import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { DisciplineService } from './DisciplineService';
import {
  canCreateDiscipline,
  canDeleteDiscipline,
  canReadDiscipline,
  canResolveDiscipline,
  canUpdateDiscipline,
} from './DisciplineGuards';
import {
  createDisciplineDto,
  disciplineIdParam,
  resolveDisciplineDto,
  updateDisciplineDto,
  type CreateDisciplineDto,
  type ResolveDisciplineDto,
  type UpdateDisciplineDto,
} from './DisciplineDto';
import type { DisciplineUser } from './DisciplineValidator';

@ToolGroup('discipline')
@Controller('/discipline')
export class DisciplineController {
  constructor(private service: DisciplineService) {}

  @Get()
  @canReadDiscipline()
  @McpTool({ description: 'List discipline incidents visible to the current user', readOnly: true })
  @ResMsg('discipline.success.retrieved')
  async list(@User() user: DisciplineUser) {
    return this.service.list(user);
  }

  @Post()
  @canCreateDiscipline()
  @Validate(createDisciplineDto)
  @McpTool({ description: 'Create an open student discipline incident', confirm: { level: 'warning', message: 'confirm.discipline.create' } })
  @ResMsg('discipline.success.created')
  async create(@Body() body: CreateDisciplineDto, @User() user: DisciplineUser) {
    return this.service.create(body, user);
  }

  @Post('/:id/resolve')
  @canResolveDiscipline()
  @Validate({ params: disciplineIdParam, body: resolveDisciplineDto })
  @McpTool({ description: 'Resolve an open discipline incident', confirm: { level: 'warning', message: 'confirm.discipline.resolve' } })
  @ResMsg('discipline.success.resolved')
  async resolve(@Params('id') id: string, @Body() body: ResolveDisciplineDto, @User() user: DisciplineUser) {
    return this.service.resolve(id, body, user);
  }

  @Post('/:id/reopen')
  @canResolveDiscipline()
  @Validate({ params: disciplineIdParam })
  @McpTool({ description: 'Reopen a resolved discipline incident and clear its resolution', confirm: { level: 'danger', message: 'confirm.discipline.reopen' } })
  @ResMsg('discipline.success.reopened')
  async reopen(@Params('id') id: string, @User() user: DisciplineUser) {
    return this.service.reopen(id, user);
  }

  @Get('/:id')
  @canReadDiscipline()
  @Validate({ params: disciplineIdParam })
  @McpTool({ description: 'Get a visible discipline incident by ID', readOnly: true })
  @ResMsg('discipline.success.retrieved')
  async getById(@Params('id') id: string, @User() user: DisciplineUser) {
    return this.service.getById(id, user);
  }

  @Put('/:id')
  @canUpdateDiscipline()
  @Validate({ params: disciplineIdParam, body: updateDisciplineDto })
  @McpTool({ description: 'Update the editable details of an open discipline incident', confirm: { level: 'warning', message: 'confirm.discipline.update' } })
  @ResMsg('discipline.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateDisciplineDto, @User() user: DisciplineUser) {
    return this.service.update(id, body, user);
  }

  @Delete('/:id')
  @canDeleteDiscipline()
  @Validate({ params: disciplineIdParam })
  @McpTool({ description: 'Permanently delete an incorrect discipline incident', destructive: true, confirm: { level: 'danger', message: 'confirm.discipline.delete' } })
  @ResMsg('discipline.success.deleted')
  async delete(@Params('id') id: string, @User() user: DisciplineUser) {
    return this.service.delete(id, user);
  }
}
