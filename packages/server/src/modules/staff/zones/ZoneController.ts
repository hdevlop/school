import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Validate } from '../../../najm';
import { CanSchoolWide } from '../../../auth';
import { McpTool, ToolGroup } from 'najm-mcp';
import { createZoneDto, updateZoneDto, zoneIdParam, type CreateZoneDto, type UpdateZoneDto } from './ZoneDto';
import { ZoneService } from './ZoneService';

@ToolGroup('zones')
@Controller('/zones')
export class ZoneController {
  constructor(private zoneService: ZoneService) {}

  @Get()
  @CanSchoolWide('read:staff')
  @McpTool({ description: 'List zones', readOnly: true })
  @ResMsg('zones.success.retrieved')
  async getZones() {
    return this.zoneService.getAll();
  }

  @Get('/:id')
  @CanSchoolWide('read:staff')
  @Validate({ params: zoneIdParam })
  @McpTool({ description: 'Get a zone by ID', readOnly: true })
  @ResMsg('zones.success.retrieved')
  async getZoneById(@Params('id') id: string) {
    return this.zoneService.getById(id);
  }

  @Post()
  @CanSchoolWide('create:staff')
  @Validate(createZoneDto)
  @McpTool({ description: 'Create a zone', confirm: { level: 'warning', message: 'confirm.zones.create' } })
  @ResMsg('zones.success.created')
  async create(@Body() body: CreateZoneDto) {
    return this.zoneService.create(body);
  }

  @Put('/:id')
  @CanSchoolWide('update:staff')
  @Validate({ params: zoneIdParam, body: updateZoneDto })
  @McpTool({ description: 'Update a zone', confirm: { level: 'warning', message: 'confirm.zones.update' } })
  @ResMsg('zones.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateZoneDto) {
    return this.zoneService.update(id, body);
  }

  @Delete('/:id')
  @CanSchoolWide('delete:staff')
  @Validate({ params: zoneIdParam })
  @McpTool({ description: 'Delete a zone', confirm: { level: 'danger', message: 'confirm.zones.delete' } })
  @ResMsg('zones.success.deleted')
  async delete(@Params('id') id: string) {
    return this.zoneService.delete(id);
  }
}
