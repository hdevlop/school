import { Body, Controller, Delete, Err, Get, Params, Post, Put, ResMsg, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { DriverService } from './DriverService';
import { isAdmin } from '@server/auth';
import {
  cinParam,
  createDriverDto,
  createDriversBulkDto,
  deleteDriversBulkDto,
  driverIdParam,
  emailParam,
  licenseNumberParam,
  phoneParam,
  updateDriverDto,
  updateDriverMcpDto,
  updateDriverStatusDto,
  type CreateDriversBulkDto,
  type CreateDriverDto,
  type DeleteDriversBulkDto,
  type UpdateDriverMcpDto,
  type UpdateDriverStatusDto,
  type UpdateDriverDto,
} from './DriverDto';

@ToolGroup('drivers')
@Controller('/drivers')
export class DriverController {
  constructor(
    private driverService: DriverService,
  ) { }

  @Get()
  @isAdmin()
  @McpTool('List all drivers')
  @ResMsg('drivers.success.retrieved')
  async getDrivers() {
    return this.driverService.getAll();
  }

  @Get('/count')
  @isAdmin()
  @McpTool('Get driver count')
  @ResMsg('drivers.success.retrieved')
  async getDriversCount() {
    return this.driverService.getCount();
  }

  @Get('/active')
  @isAdmin()
  @McpTool('List active drivers')
  @ResMsg('drivers.success.retrieved')
  async getActiveDrivers() {
    return this.driverService.getByStatus('active');
  }

  @Get('/inactive')
  @isAdmin()
  @McpTool('List inactive drivers')
  @ResMsg('drivers.success.retrieved')
  async getInactiveDrivers() {
    return this.driverService.getByStatus('inactive');
  }

  @Get('/suspended')
  @isAdmin()
  @McpTool('List suspended drivers')
  @ResMsg('drivers.success.retrieved')
  async getSuspendedDrivers() {
    return this.driverService.getByStatus('suspended');
  }

  @Get('/license-expiring')
  @isAdmin()
  @McpTool('List drivers with expiring licenses')
  @ResMsg('drivers.success.retrieved')
  async getLicenseExpiringDrivers() {
    return this.driverService.getLicenseExpiringDrivers();
  }

  @Get('/:id')
  @isAdmin()
  @Validate({ params: driverIdParam })
  @McpTool('Get a driver by ID')
  @ResMsg('drivers.success.retrieved')
  async getDriver(@Params('id') id: string) {
    return this.driverService.getById(id);
  }

  @Get('/cin/:cin')
  @isAdmin()
  @Validate({ params: cinParam })
  @McpTool('Get a driver by CIN')
  @ResMsg('drivers.success.retrieved')
  async getDriverByCin(@Params('cin') cin: string) {
    return this.driverService.getByCin(cin);
  }

  @Get('/license/:licenseNumber')
  @isAdmin()
  @Validate({ params: licenseNumberParam })
  @McpTool('Get a driver by license number')
  @ResMsg('drivers.success.retrieved')
  async getDriverByLicense(@Params('licenseNumber') licenseNumber: string) {
    return this.driverService.getByLicenseNumber(licenseNumber);
  }

  @Get('/email/:email')
  @isAdmin()
  @Validate({ params: emailParam })
  @McpTool('Get a driver by email')
  @ResMsg('drivers.success.retrieved')
  async getByEmail(@Params('email') email: string) {
    return this.driverService.getByEmail(email);
  }

  @Get('/phone/:phone')
  @isAdmin()
  @Validate({ params: phoneParam })
  @McpTool('Get a driver by phone')
  @ResMsg('drivers.success.retrieved')
  async getByPhone(@Params('phone') phone: string) {
    return this.driverService.getByPhone(phone);
  }

  @Post()
  @isAdmin()
  @Validate(createDriverDto)
  @McpTool('Create a new driver')
  @ResMsg('drivers.success.created')
  async create(@Body() body: CreateDriverDto) {
    Err(410, 'Drivers are created from the unified Staff module');
  }

  @Post('/seed')
  @isAdmin()
  @Validate(createDriversBulkDto)
  @ResMsg('drivers.success.seeded')
  async createBulk(@Body() body: CreateDriversBulkDto) {
    Err(410, 'Drivers are created from the unified Staff module');
  }

  @Post('/update')
  @isAdmin()
  @Validate(updateDriverMcpDto)
  @McpTool('Update a driver by ID')
  @ResMsg('drivers.success.updated')
  async update(@Body() body: UpdateDriverMcpDto) {
    Err(410, 'Drivers are updated from the unified Staff module');
  }

  @Put('/:id')
  @isAdmin()
  @Validate({ params: driverIdParam, body: updateDriverDto })
  @ResMsg('drivers.success.updated')
  async updateDriverRest(@Params('id') id: string, @Body() body: UpdateDriverDto) {
    Err(410, 'Drivers are updated from the unified Staff module');
  }

  @Put('/:id/status')
  @isAdmin()
  @Validate({ params: driverIdParam, body: updateDriverStatusDto })
  @McpTool('Update driver status')
  @ResMsg('drivers.success.statusUpdated')
  async updateStatus(@Params('id') id: string, @Body() body: UpdateDriverStatusDto) {
    Err(410, 'Driver status is updated from the unified Staff module');
  }

  @Delete('/bulk')
  @isAdmin()
  @Validate({ body: deleteDriversBulkDto })
  @ResMsg('drivers.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteDriversBulkDto) {
    Err(410, 'Drivers are deleted from the unified Staff module');
  }

  @Delete('/:id')
  @isAdmin()
  @Validate({ params: driverIdParam })
  @McpTool('Delete a driver by ID')
  @ResMsg('drivers.success.deleted')
  async delete(@Params('id') id: string) {
    Err(410, 'Drivers are deleted from the unified Staff module');
  }

  @Delete()
  @isAdmin()
  @McpTool('Delete all drivers')
  @ResMsg('drivers.success.allDeleted')
  async deleteAll() {
    Err(410, 'Drivers are deleted from the unified Staff module');
  }
}
