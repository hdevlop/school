import { Controller, Get, Post, Put, Params, Body, Validate, ResMsg } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { SettingsService } from './SettingsService';
import { isAuth, isAdministrator } from '@server/auth';
import {
  createSettingsDto,
  updateSettingsDto,
  settingsIdParam,
  type CreateSettingsDto,
  type UpdateSettingsDto,
} from './SettingsDto';

@ToolGroup('settings')
@Controller('/settings')
export class SettingsController {
  constructor(
    private settingsService: SettingsService,
  ) { }

  @Get('/public')
  @isAuth()
  @McpTool('Get public school settings')
  @ResMsg('settings.success.retrieved')
  async getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }

  @Get('/admin')
  @isAdministrator()
  @McpTool('Get admin settings')
  @ResMsg('settings.success.retrieved')
  async getAdminSettings() {
    return this.settingsService.getAdminSettings();
  }

  @Put()
  @isAdministrator()
  @Validate(updateSettingsDto)
  @McpTool({ description: 'Update settings', confirm: { level: 'warning', message: 'confirm.settings.update' } })
  @ResMsg('settings.success.updated')
  async update(@Body() body: UpdateSettingsDto) {
    return this.settingsService.update(body);
  }


  @Post()
  @isAdministrator()
  @Validate(createSettingsDto)
  @McpTool({ description: 'Create settings', confirm: { level: 'warning', message: 'confirm.settings.create' } })
  @ResMsg('settings.success.created')
  async create(@Body() body: CreateSettingsDto) {
    return this.settingsService.create(body);
  }


  @Get('/:id')
  @isAdministrator()
  @Validate({ params: settingsIdParam })
  @McpTool('Get settings by ID')
  @ResMsg('settings.success.retrieved')
  async getById(@Params('id') id: string) {
    return this.settingsService.getById(id);
  }
}
