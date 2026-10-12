import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Query, Validate } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { MaintenanceService } from './MaintenanceService';
import { isAdmin, Can } from '../../../auth';
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
export class MaintenanceController {
  constructor(
    private maintenanceService: MaintenanceService,
  ) { }

  @Get()
  @Can('read:maintenance')
  @McpTool({ description: 'List all maintenance records', readOnly: true })
  @ResMsg('maintenance.success.retrieved')
  async listMaintenances() {
    return this.maintenanceService.getAll();
  }

  @Get('/count')
  @Can('read:maintenance')
  @McpTool({ description: 'Get maintenance record count', readOnly: true })
  @ResMsg('maintenance.success.retrieved')
  async getMaintenancesCount() {
    return this.maintenanceService.getCount();
  }

  @Get('/status-counts')
  @Can('read:maintenance')
  @McpTool({ description: 'Get maintenance counts by status', readOnly: true })
  @ResMsg('maintenance.success.retrieved')
  async getStatusCounts() {
    return this.maintenanceService.getStatusCounts();
  }

  @Get('/overdue')
  @Can('read:maintenance')
  @McpTool({ description: 'List overdue maintenance records', readOnly: true })
  @ResMsg('maintenance.success.retrieved')
  async getOverdueMaintenances() {
    return this.maintenanceService.getOverdueMaintenances();
  }

  @Get('/upcoming')
  @Can('read:maintenance')
  @Validate({ query: upcomingMaintenanceQueryDto })
  @McpTool({ description: 'List upcoming maintenance records', readOnly: true })
  @ResMsg('maintenance.success.retrieved')
  async getUpcomingMaintenances(@Query() query: UpcomingMaintenanceQueryDto) {
    return this.maintenanceService.getUpcomingMaintenances(query.withinHours ?? 50);
  }

  @Get('/alerts')
  @Can('read:maintenance')
  @McpTool({ description: 'Get maintenance alerts', readOnly: true })
  @ResMsg('maintenance.success.retrieved')
  async getMaintenanceAlerts() {
    return this.maintenanceService.checkMaintenanceAlerts();
  }

  @Get('/vehicle/:vehicleId')
  @Can('read:maintenance')
  @Validate({ params: vehicleIdParam })
  @McpTool({ description: 'Get maintenance records by vehicle', readOnly: true })
  @ResMsg('maintenance.success.retrieved')
  async getMaintenancesByVehicle(@Params('vehicleId') vehicleId: string) {
    return this.maintenanceService.getByVehicleId(vehicleId);
  }

  @Get('/status/:status')
  @Can('read:maintenance')
  @Validate({ params: statusParam })
  @McpTool({ description: 'Get maintenance records by status', readOnly: true })
  @ResMsg('maintenance.success.retrieved')
  async getMaintenancesByStatus(@Params('status') status: string) {
    return this.maintenanceService.getByStatus(status);
  }

  @Get('/type/:type')
  @Can('read:maintenance')
  @Validate({ params: typeParam })
  @McpTool({ description: 'Get maintenance records by type', readOnly: true })
  @ResMsg('maintenance.success.retrieved')
  async getMaintenancesByType(@Params('type') type: string) {
    return this.maintenanceService.getByType(type);
  }

  @Get('/:id')
  @Can('read:maintenance')
  @Validate({ params: maintenanceIdParam })
  @McpTool({ description: 'Get a maintenance record by ID', readOnly: true })
  @ResMsg('maintenance.success.retrieved')
  async getMaintenanceById(@Params('id') id: string) {
    return this.maintenanceService.getById(id);
  }

  @Post()
  @Can('create:maintenance')
  @Validate(createMaintenanceDto)
  @McpTool({ description: 'Create a new maintenance record', confirm: { level: 'warning', message: 'confirm.vehicleMaintenance.create' } })
  @ResMsg('maintenance.success.created')
  async create(@Body() maintenanceData: CreateMaintenanceDto) {
    return this.maintenanceService.create(maintenanceData);
  }

  @Put('/:id')
  @Can('update:maintenance')
  @Validate({ params: maintenanceIdParam, body: updateMaintenanceDto })
  @McpTool({ description: 'Update a maintenance record', confirm: { level: 'warning', message: 'confirm.vehicleMaintenance.update' } })
  @ResMsg('maintenance.success.updated')
  async updateById(@Params('id') id: string, @Body() updateData: UpdateMaintenanceDto) {
    return this.maintenanceService.update(id, updateData);
  }

  @Put('/:id/status')
  @Can('update:maintenance')
  @Validate({ params: maintenanceIdParam, body: updateMaintenanceStatusDto })
  @McpTool({ description: 'Update maintenance record status', confirm: { level: 'warning', message: 'confirm.vehicleMaintenance.updateStatus' } })
  @ResMsg('maintenance.success.statusUpdated')
  async updateStatus(@Params('id') id: string, @Body() body: UpdateMaintenanceStatusDto) {
    return this.maintenanceService.updateStatus(id, body.status);
  }

  @Put('/:id/complete')
  @Can('update:maintenance')
  @Validate({ params: maintenanceIdParam })
  @McpTool({ description: 'Mark a maintenance record as completed', confirm: { level: 'warning', message: 'confirm.vehicleMaintenance.complete' } })
  @ResMsg('maintenance.success.completed')
  async complete(@Params('id') id: string) {
    return this.maintenanceService.markAsCompleted(id);
  }

  @Delete('/:id')
  @Can('delete:maintenance')
  @Validate({ params: maintenanceIdParam })
  @McpTool('Delete a maintenance record')
  @ResMsg('maintenance.success.deleted')
  async deleteById(@Params('id') id: string) {
    return this.maintenanceService.delete(id);
  }

  @Delete()
  @isAdmin()
  @McpTool('Delete all maintenance records')
  @ResMsg('maintenance.success.allDeleted')
  async deleteAll() {
    return this.maintenanceService.deleteAll();
  }

  @Post('/mark-overdue')
  @Can('update:maintenance')
  @McpTool({ description: 'Mark overdue maintenance records', confirm: { level: 'warning', message: 'confirm.vehicleMaintenance.markOverdue' } })
  @ResMsg('maintenance.success.overdueMarked')
  async markOverdue() {
    const result = await this.maintenanceService.markOverdueMaintenances();
    return { updatedCount: result.length, maintenance: result };
  }
}
