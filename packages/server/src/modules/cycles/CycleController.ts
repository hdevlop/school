import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Validate } from '@server/najm';
import { isAdmin } from '@server/auth';
import { McpTool, ToolGroup } from 'najm-mcp';
import { createCycleDto, cycleIdParam, updateCycleDto, type CreateCycleDto, type UpdateCycleDto } from './CycleDto';
import { CycleService } from './CycleService';

@ToolGroup('cycles')
@Controller('/cycles')
export class CycleController {
  constructor(private cycleService: CycleService) {}

  @Get()
  @isAdmin()
  @McpTool('List school cycles')
  @ResMsg('cycles.success.retrieved')
  async getCycles() {
    return this.cycleService.getAll();
  }

  @Get('/active')
  @isAdmin()
  @McpTool('List active school cycles')
  @ResMsg('cycles.success.retrieved')
  async getActiveCycles() {
    return this.cycleService.getActive();
  }

  @Get('/:id')
  @isAdmin()
  @Validate({ params: cycleIdParam })
  @McpTool('Get a school cycle by ID')
  @ResMsg('cycles.success.retrieved')
  async getCycle(@Params('id') id: string) {
    return this.cycleService.getById(id);
  }

  @Post()
  @isAdmin()
  @Validate(createCycleDto)
  @McpTool({ description: 'Create a school cycle', confirm: { level: 'warning', message: 'confirm.cycles.create' } })
  @ResMsg('cycles.success.created')
  async create(@Body() body: CreateCycleDto) {
    return this.cycleService.create(body);
  }

  @Put('/:id')
  @isAdmin()
  @Validate({ params: cycleIdParam, body: updateCycleDto })
  @McpTool({ description: 'Update a school cycle', confirm: { level: 'warning', message: 'confirm.cycles.update' } })
  @ResMsg('cycles.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateCycleDto) {
    return this.cycleService.update(id, body);
  }

  @Delete('/:id')
  @isAdmin()
  @Validate({ params: cycleIdParam })
  @McpTool({ description: 'Delete a school cycle', confirm: { level: 'danger', message: 'confirm.cycles.delete' } })
  @ResMsg('cycles.success.deleted')
  async delete(@Params('id') id: string) {
    return this.cycleService.delete(id);
  }
}
