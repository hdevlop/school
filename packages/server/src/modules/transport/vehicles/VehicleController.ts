import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Validate } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { VehicleService } from './VehicleService';
import { canAccessVehicle, canUpdateVehicle, canCreateVehicle, canDeleteVehicle, canAccessAllVehicles } from './VehicleGuards';
import { isAdmin } from '../../../auth';
import {
  createVehicleDto,
  createVehiclesBulkDto,
  updateVehicleDto,
  vehicleIdParam,
  type CreateVehiclesBulkDto,
  type CreateVehicleDto,
  type UpdateVehicleDto,
} from './VehicleDto';

@ToolGroup('vehicles')
@Controller('/vehicles')
export class VehicleController {
  constructor(
    private vehicleService: VehicleService,
  ) { }

  @Get()
  @canAccessAllVehicles()
  @McpTool({ description: 'List all vehicles', readOnly: true })
  @ResMsg('vehicles.success.retrieved')
  async getVehicles() {
    return this.vehicleService.getAll();
  }

  @Get('/count')
  @isAdmin()
  @McpTool({ description: 'Get vehicle count', readOnly: true })
  @ResMsg('vehicles.success.retrieved')
  async getVehiclesCount() {
    return this.vehicleService.getCount();
  }

  @Get('/:id')
  @canAccessVehicle()
  @Validate({ params: vehicleIdParam })
  @McpTool({ description: 'Get a vehicle by ID', readOnly: true })
  @ResMsg('vehicles.success.retrieved')
  async getVehicle(@Params('id') id: string) {
    return this.vehicleService.getById(id);
  }

  @Post()
  @canCreateVehicle()
  @Validate(createVehicleDto)
  @McpTool({ description: 'Create a new vehicle', confirm: { level: 'warning', message: 'confirm.vehicles.create' } })
  @ResMsg('vehicles.success.created')
  async create(@Body() body: CreateVehicleDto) {
    return this.vehicleService.create(body);
  }

  @Post('/seed')
  @isAdmin()
  @Validate(createVehiclesBulkDto)
  @ResMsg('vehicles.success.seeded')
  async createBulk(@Body() body: CreateVehiclesBulkDto) {
    return this.vehicleService.createBulk(body);
  }

  @Put('/:id')
  @canUpdateVehicle()
  @Validate({ params: vehicleIdParam, body: updateVehicleDto })
  @McpTool({ description: 'Update a vehicle by ID', confirm: { level: 'warning', message: 'confirm.vehicles.update' } })
  @ResMsg('vehicles.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateVehicleDto) {
    return this.vehicleService.update(id, body);
  }

  @Delete('/:id')
  @canDeleteVehicle()
  @Validate({ params: vehicleIdParam })
  @McpTool('Delete a vehicle by ID')
  @ResMsg('vehicles.success.deleted')
  async delete(@Params('id') id: string) {
    return this.vehicleService.delete(id);
  }

  @Delete()
  @canDeleteVehicle()
  @McpTool('Delete all vehicles')
  @ResMsg('vehicles.success.allDeleted')
  async deleteAll() {
    return this.vehicleService.deleteAll();
  }
}
