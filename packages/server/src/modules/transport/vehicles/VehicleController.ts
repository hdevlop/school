import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { VehicleService } from './VehicleService';
import { canAccessVehicle, canUpdateVehicle, canCreateVehicle, canDeleteVehicle, canAccessAllVehicles } from './VehicleGuards';
import { isAdmin } from '@server/auth';
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
  @McpTool('List all vehicles')
  @ResMsg('vehicles.success.retrieved')
  async getVehicles() {
    return this.vehicleService.getAll();
  }

  @Get('/count')
  @isAdmin()
  @McpTool('Get vehicle count')
  @ResMsg('vehicles.success.retrieved')
  async getVehiclesCount() {
    return this.vehicleService.getCount();
  }

  @Get('/:id')
  @canAccessVehicle()
  @Validate({ params: vehicleIdParam })
  @McpTool('Get a vehicle by ID')
  @ResMsg('vehicles.success.retrieved')
  async getVehicle(@Params('id') id: string) {
    return this.vehicleService.getById(id);
  }

  @Post()
  @canCreateVehicle()
  @Validate(createVehicleDto)
  @McpTool('Create a new vehicle')
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
  @McpTool('Update a vehicle by ID')
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
