import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Query, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { MaintenanceService } from './MaintenanceService';
import { isAdmin } from '@server/auth';
import {
  createMaintenanceDto,
  maintenanceIdParam,
  statusParam,
  typeParam,
  upcomingMaintenanceQueryDto,
  updateMaintenanceDto,
  updateMaintenanceStatusDto,
  vehicleIdParam,
  type CreateMaintenanceDto,
  type UpcomingMaintenanceQueryDto,
  type UpdateMaintenanceStatusDto,
  type UpdateMaintenanceDto,
} from './MaintenanceDto';

@ToolGroup('vehicle-maintenance')
@Controller('/maintenance')
@isAdmin()
export class MaintenanceController {
  constructor(
    private maintenanceService: MaintenanceService,
  ) { }

  @Get()
  @McpTool('List all maintenance records')
  @ResMsg('maintenance.success.retrieved')
  async getMaintenances() {
    return this.maintenanceService.getAll();
  }

  @Get('/count')
  @McpTool('Get maintenance record count')
  @ResMsg('maintenance.success.retrieved')
  async getMaintenancesCount() {
    return this.maintenanceService.getCount();
  }

  @Get('/status-counts')
  @McpTool('Get maintenance counts by status')
  @ResMsg('maintenance.success.retrieved')
  async getStatusCounts() {
    return this.maintenanceService.getStatusCounts();
  }

  @Get('/overdue')
  @McpTool('List overdue maintenance records')
  @ResMsg('maintenance.success.retrieved')
  async getOverdueMaintenances() {
    return this.maintenanceService.getOverdueMaintenances();
  }

  @Get('/upcoming')
  @Validate({ query: upcomingMaintenanceQueryDto })
  @McpTool('List upcoming maintenance records')
  @ResMsg('maintenance.success.retrieved')
  async getUpcomingMaintenances(@Query() query: UpcomingMaintenanceQueryDto) {
    return this.maintenanceService.getUpcomingMaintenances(query.withinHours ?? 50);
  }

  @Get('/alerts')
  @McpTool('Get maintenance alerts')
  @ResMsg('maintenance.success.retrieved')
  async getMaintenanceAlerts() {
    return this.maintenanceService.checkMaintenanceAlerts();
  }

  @Get('/vehicle/:vehicleId')
  @Validate({ params: vehicleIdParam })
  @McpTool('Get maintenance records by vehicle')
  @ResMsg('maintenance.success.retrieved')
  async getMaintenancesByVehicle(@Params('vehicleId') vehicleId: string) {
    return this.maintenanceService.getByVehicleId(vehicleId);
  }

  @Get('/status/:status')
  @Validate({ params: statusParam })
  @McpTool('Get maintenance records by status')
  @ResMsg('maintenance.success.retrieved')
  async getMaintenancesByStatus(@Params('status') status: string) {
    return this.maintenanceService.getByStatus(status);
  }

  @Get('/type/:type')
  @Validate({ params: typeParam })
  @McpTool('Get maintenance records by type')
  @ResMsg('maintenance.success.retrieved')
  async getMaintenancesByType(@Params('type') type: string) {
    return this.maintenanceService.getByType(type);
  }

  @Get('/:id')
  @Validate({ params: maintenanceIdParam })
  @McpTool('Get a maintenance record by ID')
  @ResMsg('maintenance.success.retrieved')
  async getMaintenanceById(@Params('id') id: string) {
    return this.maintenanceService.getById(id);
  }

  @Post()
  @Validate(createMaintenanceDto)
  @McpTool('Create a new maintenance record')
  @ResMsg('maintenance.success.created')
  async create(@Body() maintenanceData: CreateMaintenanceDto) {
    return this.maintenanceService.create(maintenanceData);
  }

  @Put('/:id')
  @Validate({ params: maintenanceIdParam, body: updateMaintenanceDto })
  @McpTool('Update a maintenance record')
  @ResMsg('maintenance.success.updated')
  async update(@Params('id') id: string, @Body() updateData: UpdateMaintenanceDto) {
    return this.maintenanceService.update(id, updateData);
  }

  @Put('/:id/status')
  @Validate({ params: maintenanceIdParam, body: updateMaintenanceStatusDto })
  @McpTool('Update maintenance record status')
  @ResMsg('maintenance.success.statusUpdated')
  async updateStatus(@Params('id') id: string, @Body() body: UpdateMaintenanceStatusDto) {
    return this.maintenanceService.updateStatus(id, body.status);
  }

  @Put('/:id/complete')
  @Validate({ params: maintenanceIdParam })
  @McpTool('Mark a maintenance record as completed')
  @ResMsg('maintenance.success.completed')
  async complete(@Params('id') id: string) {
    return this.maintenanceService.markAsCompleted(id);
  }

  @Delete('/:id')
  @Validate({ params: maintenanceIdParam })
  @McpTool('Delete a maintenance record')
  @ResMsg('maintenance.success.deleted')
  async delete(@Params('id') id: string) {
    return this.maintenanceService.delete(id);
  }

  @Delete()
  @McpTool('Delete all maintenance records')
  @ResMsg('maintenance.success.allDeleted')
  async deleteAll() {
    return this.maintenanceService.deleteAll();
  }

  @Post('/mark-overdue')
  @McpTool('Mark overdue maintenance records')
  @ResMsg('maintenance.success.overdueMarked')
  async markOverdue() {
    const result = await this.maintenanceService.markOverdueMaintenances();
    return { updatedCount: result.length, maintenance: result };
  }
}
