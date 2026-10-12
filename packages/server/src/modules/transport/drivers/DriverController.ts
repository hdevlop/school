import { Body, Controller, Delete, Err, Get, Params, Post, Put, ResMsg, Validate, t } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { DriverService } from './DriverService';
import { isAdmin, CanSchoolWide } from '../../../auth';
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
  @CanSchoolWide('read:drivers')
  @McpTool({ description: 'List all drivers', readOnly: true })
  @ResMsg('drivers.success.retrieved')
  async listDrivers() {
    return this.driverService.getAll();
  }

  @Get('/count')
  @CanSchoolWide('read:drivers')
  @McpTool({ description: 'Get driver count', readOnly: true })
  @ResMsg('drivers.success.retrieved')
  async getDriversCount() {
    return this.driverService.getCount();
  }

  @Get('/active')
  @CanSchoolWide('read:drivers')
  @McpTool({ description: 'List active drivers', readOnly: true })
  @ResMsg('drivers.success.retrieved')
  async getActiveDrivers() {
    return this.driverService.getByStatus('active');
  }

  @Get('/inactive')
  @CanSchoolWide('read:drivers')
  @McpTool({ description: 'List inactive drivers', readOnly: true })
  @ResMsg('drivers.success.retrieved')
  async getInactiveDrivers() {
    return this.driverService.getByStatus('inactive');
  }

  @Get('/suspended')
  @CanSchoolWide('read:drivers')
  @McpTool({ description: 'List suspended drivers', readOnly: true })
  @ResMsg('drivers.success.retrieved')
  async getSuspendedDrivers() {
    return this.driverService.getByStatus('suspended');
  }

  @Get('/license-expiring')
  @CanSchoolWide('read:drivers')
  @McpTool({ description: 'List drivers with expiring licenses', readOnly: true })
  @ResMsg('drivers.success.retrieved')
  async getLicenseExpiringDrivers() {
    return this.driverService.getLicenseExpiringDrivers();
  }

  @Get('/:id')
  @CanSchoolWide('read:drivers')
  @Validate({ params: driverIdParam })
  @McpTool({ description: 'Get a driver by ID', readOnly: true })
  @ResMsg('drivers.success.retrieved')
  async getDriverById(@Params('id') id: string) {
    return this.driverService.getById(id);
  }

  @Get('/cin/:cin')
  @CanSchoolWide('read:drivers')
  @Validate({ params: cinParam })
  @McpTool({ description: 'Get a driver by CIN', readOnly: true })
  @ResMsg('drivers.success.retrieved')
  async getDriverByCin(@Params('cin') cin: string) {
    return this.driverService.getByCin(cin);
  }

  @Get('/license/:licenseNumber')
  @CanSchoolWide('read:drivers')
  @Validate({ params: licenseNumberParam })
  @McpTool({ description: 'Get a driver by license number', readOnly: true })
  @ResMsg('drivers.success.retrieved')
  async getDriverByLicense(@Params('licenseNumber') licenseNumber: string) {
    return this.driverService.getByLicenseNumber(licenseNumber);
  }

  @Get('/email/:email')
  @CanSchoolWide('read:drivers')
  @Validate({ params: emailParam })
  @McpTool({ description: 'Get a driver by email', readOnly: true })
  @ResMsg('drivers.success.retrieved')
  async getByEmail(@Params('email') email: string) {
    return this.driverService.getByEmail(email);
  }

  @Get('/phone/:phone')
  @CanSchoolWide('read:drivers')
  @Validate({ params: phoneParam })
  @McpTool({ description: 'Get a driver by phone', readOnly: true })
  @ResMsg('drivers.success.retrieved')
  async getByPhone(@Params('phone') phone: string) {
    return this.driverService.getByPhone(phone);
  }

  @Post()
  @CanSchoolWide('create:drivers')
  @Validate(createDriverDto)
  @McpTool({ description: 'Create a new driver', confirm: { level: 'warning', message: 'confirm.drivers.create' } })
  @ResMsg('drivers.success.created')
  async create(@Body() _body: CreateDriverDto) {
    Err(410, t('drivers.errors.createdFromStaff'));
  }

  @Post('/seed')
  @isAdmin()
  @Validate(createDriversBulkDto)
  @ResMsg('drivers.success.seeded')
  async createBulk(@Body() _body: CreateDriversBulkDto) {
    Err(410, t('drivers.errors.createdFromStaff'));
  }

  @Post('/update')
  @CanSchoolWide('update:drivers')
  @Validate(updateDriverMcpDto)
  @McpTool({ description: 'Update a driver by ID', confirm: { level: 'warning', message: 'confirm.drivers.update' } })
  @ResMsg('drivers.success.updated')
  async updateById(@Body() _body: UpdateDriverMcpDto) {
    Err(410, t('drivers.errors.updatedFromStaff'));
  }

  @Put('/:id')
  @CanSchoolWide('update:drivers')
  @Validate({ params: driverIdParam, body: updateDriverDto })
  @ResMsg('drivers.success.updated')
  async updateDriverRest(@Params('id') _id: string, @Body() _body: UpdateDriverDto) {
    Err(410, t('drivers.errors.updatedFromStaff'));
  }

  @Put('/:id/status')
  @CanSchoolWide('update:drivers')
  @Validate({ params: driverIdParam, body: updateDriverStatusDto })
  @McpTool({ description: 'Update driver status', confirm: { level: 'warning', message: 'confirm.drivers.updateStatus' } })
  @ResMsg('drivers.success.statusUpdated')
  async updateStatus(@Params('id') _id: string, @Body() _body: UpdateDriverStatusDto) {
    Err(410, t('drivers.errors.statusFromStaff'));
  }

  @Delete('/bulk')
  @CanSchoolWide('delete:drivers')
  @Validate({ body: deleteDriversBulkDto })
  @ResMsg('drivers.success.bulkDeleted')
  async deleteBulk(@Body() _body: DeleteDriversBulkDto) {
    Err(410, t('drivers.errors.deletedFromStaff'));
  }

  @Delete('/:id')
  @CanSchoolWide('delete:drivers')
  @Validate({ params: driverIdParam })
  @McpTool('Delete a driver by ID')
  @ResMsg('drivers.success.deleted')
  async deleteById(@Params('id') _id: string) {
    Err(410, t('drivers.errors.deletedFromStaff'));
  }

  @Delete()
  @isAdmin()
  @McpTool('Delete all drivers')
  @ResMsg('drivers.success.allDeleted')
  async deleteAll() {
    Err(410, t('drivers.errors.deletedFromStaff'));
  }
}
