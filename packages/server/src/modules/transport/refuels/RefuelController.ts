import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Validate } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { RefuelService } from './RefuelService';
import { canAccessRefuel, canAccessAllRefuels, canUpdateRefuel, canCreateRefuel, canDeleteRefuel } from './RefuelGuards';
import { isAdmin } from '../../../auth';
import {
  createRefuelDto,
  createRefuelsBulkDto,
  dateParam,
  driverIdParam,
  refuelIdParam,
  updateRefuelDto,
  vehicleIdParam,
  voucherNumberParam,
  type CreateRefuelDto,
  type UpdateRefuelDto,
} from './RefuelDto';

@ToolGroup('vehicle-refuels')
@Controller('/refuels')
export class RefuelController {
  constructor(private refuelService: RefuelService) { }

  @Get()
  @canAccessAllRefuels()
  @McpTool({ description: 'List all refuel records', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getRefuels() {
    return this.refuelService.getAll();
  }

  @Get('/count')
  @canAccessAllRefuels()
  @McpTool({ description: 'Get refuel record count', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getCount() {
    return this.refuelService.getCount();
  }

  @Get('/recent')
  @canAccessAllRefuels()
  @McpTool({ description: 'List recent refuel records', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getRecentRecords() {
    return this.refuelService.getRecentRecords();
  }

  @Get('/today')
  @canAccessAllRefuels()
  @McpTool({ description: "List today's refuel records", readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getTodayRecords() {
    return this.refuelService.getTodayRecords();
  }

  @Get('/voucher/:voucherNumber')
  @canAccessAllRefuels()
  @Validate({ params: voucherNumberParam })
  @McpTool({ description: 'Get a refuel by voucher number', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getByVoucherNumber(@Params('voucherNumber') voucherNumber: string) {
    return this.refuelService.getByVoucherNumber(voucherNumber);
  }

  @Get('/date/:date')
  @canAccessAllRefuels()
  @Validate({ params: dateParam })
  @McpTool({ description: 'Get refuels by date', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getByDate(@Params('date') date: string) {
    return this.refuelService.getByDate(date);
  }

  @Get('/vehicle/:vehicleId')
  @canAccessAllRefuels()
  @Validate({ params: vehicleIdParam })
  @McpTool({ description: 'Get refuels by vehicle', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getByVehicleId(@Params('vehicleId') vehicleId: string) {
    return this.refuelService.getByVehicleId(vehicleId);
  }

  @Get('/driver/:driverId')
  @canAccessAllRefuels()
  @Validate({ params: driverIdParam })
  @McpTool({ description: 'Get refuels by driver', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getByDriverId(@Params('driverId') driverId: string) {
    return this.refuelService.getByDriverId(driverId);
  }

  @Get('/:id')
  @canAccessRefuel()
  @Validate({ params: refuelIdParam })
  @McpTool({ description: 'Get a refuel by ID', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getRefuelById(@Params('id') id: string) {
    return this.refuelService.getById(id);
  }

  @Post()
  @canCreateRefuel()
  @Validate(createRefuelDto)
  @McpTool({ description: 'Create a new refuel record', confirm: { level: 'warning', message: 'confirm.vehicleRefuels.create' } })
  @ResMsg('refuels.success.created')
  async create(@Body() body: CreateRefuelDto) {
    return this.refuelService.create(body);
  }

  @Post('/seed')
  @isAdmin()
  @Validate(createRefuelsBulkDto)
  @ResMsg('refuels.success.seeded')
  async seedRefuels(@Body() body: CreateRefuelDto[]) {
    return this.refuelService.seedDemoRefuels(body);
  }

  @Put('/:id')
  @canUpdateRefuel()
  @Validate({ params: refuelIdParam, body: updateRefuelDto })
  @McpTool({ description: 'Update a refuel record', confirm: { level: 'warning', message: 'confirm.vehicleRefuels.update' } })
  @ResMsg('refuels.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateRefuelDto) {
    return this.refuelService.update(id, body);
  }

  @Delete('/:id')
  @canDeleteRefuel()
  @Validate({ params: refuelIdParam })
  @McpTool('Delete a refuel record')
  @ResMsg('refuels.success.deleted')
  async deleteById(@Params('id') id: string) {
    return this.refuelService.delete(id);
  }

  @Delete()
  @canDeleteRefuel()
  @McpTool('Delete all refuel records')
  @ResMsg('refuels.success.allDeleted')
  async deleteAll() {
    return this.refuelService.deleteAll();
  }

  @Get('/analytics/consumption')
  @canAccessAllRefuels()
  @McpTool({ description: 'Get fuel consumption analytics', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getFuelConsumptionAnalytics() {
    return this.refuelService.getFuelConsumptionAnalytics();
  }

  @Get('/analytics/efficiency')
  @canAccessAllRefuels()
  @McpTool({ description: 'Get fuel efficiency report', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getFuelEfficiencyReport() {
    return this.refuelService.getFuelEfficiencyReport();
  }

  @Get('/analytics/costs')
  @canAccessAllRefuels()
  @McpTool({ description: 'Get fuel cost analysis', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getFuelCostAnalysis() {
    return this.refuelService.getFuelCostAnalysis();
  }

  @Get('/analytics/summary')
  @canAccessAllRefuels()
  @McpTool({ description: 'Get fuel summary', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getFuelSummary() {
    return this.refuelService.getFuelSummary();
  }

  @Get('/vehicle/:vehicleId/efficiency')
  @canAccessAllRefuels()
  @Validate({ params: vehicleIdParam })
  @McpTool({ description: 'Get vehicle fuel efficiency', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getVehicleFuelEfficiency(@Params('vehicleId') vehicleId: string) {
    return this.refuelService.getVehicleFuelEfficiency(vehicleId);
  }

  @Get('/vehicle/:vehicleId/costs')
  @canAccessAllRefuels()
  @Validate({ params: vehicleIdParam })
  @McpTool({ description: 'Get vehicle fuel costs', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getVehicleFuelCosts(@Params('vehicleId') vehicleId: string) {
    return this.refuelService.getVehicleFuelCosts(vehicleId);
  }

  @Get('/trends/monthly')
  @canAccessAllRefuels()
  @McpTool({ description: 'Get monthly fuel trends', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getMonthlyFuelTrends() {
    return this.refuelService.getMonthlyFuelTrends();
  }

  @Get('/driver/:driverId/stats')
  @canAccessAllRefuels()
  @Validate({ params: driverIdParam })
  @McpTool({ description: 'Get driver refuel statistics', readOnly: true })
  @ResMsg('refuels.success.retrieved')
  async getDriverRefuelStats(@Params('driverId') driverId: string) {
    return this.refuelService.getDriverRefuelStats(driverId);
  }
}
