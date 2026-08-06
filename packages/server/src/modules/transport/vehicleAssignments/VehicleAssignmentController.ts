import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { VehicleAssignmentService } from './VehicleAssignmentService';
import { isAuth } from '@server/auth';
import {
  assignDriverDto,
  assignmentIdParam,
  createVehicleAssignmentDto,
  driverIdParam,
  unassignVehicleAssignmentDto,
  updateVehicleAssignmentDto,
  vehicleIdParam,
  type AssignDriverDto,
  type CreateVehicleAssignmentDto,
  type UnassignVehicleAssignmentDto,
  type UpdateVehicleAssignmentDto,
} from './VehicleAssignmentDto';


@ToolGroup('vehicle-assignments')
@Controller('/vehicle-assignments')
export class VehicleAssignmentController {

  constructor(
    private vehicleAssignmentService: VehicleAssignmentService
  ) { }

  @Get('/')
  @isAuth()
  @McpTool('List all vehicle assignments')
  @ResMsg('vehicleAssignments.success.allRetrieved')
  async getAll() {
    return this.vehicleAssignmentService.getAll();
  }

  @Get('/vehicle/:vehicleId')
  @isAuth()
  @Validate({ params: vehicleIdParam })
  @McpTool('Get assignments by vehicle')
  @ResMsg('vehicleAssignments.success.retrieved')
  async getByVehicleId(@Params('vehicleId') vehicleId: string) {
    return this.vehicleAssignmentService.getByVehicleId(vehicleId);
  }

  @Get('/driver/:driverId')
  @isAuth()
  @Validate({ params: driverIdParam })
  @McpTool('Get assignments by driver')
  @ResMsg('vehicleAssignments.success.retrieved')
  async getByDriverId(@Params('driverId') driverId: string) {
    return this.vehicleAssignmentService.getByDriverId(driverId);
  }



  @Get('/:id')
  @isAuth()
  @Validate({ params: assignmentIdParam })
  @McpTool('Get a vehicle assignment by ID')
  @ResMsg('vehicleAssignments.success.retrieved')
  async getById(@Params('id') id: string) {
    return this.vehicleAssignmentService.getById(id);
  }

  @Post('/')
  @isAuth()
  @Validate(createVehicleAssignmentDto)
  @McpTool('Create a vehicle assignment')
  @ResMsg('vehicleAssignments.success.created')
  async create(@Body() body: CreateVehicleAssignmentDto, @User() user: { id: string }) {
    const assignmentData = {
      ...body,
      assignedBy: user?.id,
    };
    return this.vehicleAssignmentService.create(assignmentData);
  }

  @Post('/assign')
  @isAuth()
  @Validate(assignDriverDto)
  @McpTool('Assign a driver to a vehicle')
  @ResMsg('vehicleAssignments.success.assigned')
  async assignDriver(@Body() body: AssignDriverDto, @User() user: { id: string }) {
    const { vehicleId, driverId, assignmentDate } = body;
    return this.vehicleAssignmentService.assignDriver(
      vehicleId,
      driverId,
      assignmentDate,
      user?.id
    );
  }

  @Put('/:id')
  @isAuth()
  @Validate({ params: assignmentIdParam, body: updateVehicleAssignmentDto })
  @McpTool('Update a vehicle assignment')
  @ResMsg('vehicleAssignments.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateVehicleAssignmentDto) {
    return this.vehicleAssignmentService.update(id, body);
  }

  @Put('/:id/unassign')
  @isAuth()
  @Validate({ params: assignmentIdParam, body: unassignVehicleAssignmentDto })
  @McpTool('Unassign a vehicle assignment')
  @ResMsg('vehicleAssignments.success.unassigned')
  async unassign(@Params('id') id: string, @Body() body: UnassignVehicleAssignmentDto) {
    const { unassignmentDate } = body;
    return this.vehicleAssignmentService.unassign(id, unassignmentDate);
  }

  @Put('/vehicle/:vehicleId/unassign')
  @isAuth()
  @Validate({ params: vehicleIdParam, body: unassignVehicleAssignmentDto })
  @ResMsg('vehicleAssignments.success.unassigned')
  async unassignByVehicle(@Params('vehicleId') vehicleId: string, @Body() body: UnassignVehicleAssignmentDto) {
    const { unassignmentDate } = body;
    return this.vehicleAssignmentService.unassignDriver(vehicleId, unassignmentDate);
  }

  @Delete('/:id')
  @isAuth()
  @Validate({ params: assignmentIdParam })
  @McpTool('Delete a vehicle assignment')
  @ResMsg('vehicleAssignments.success.deleted')
  async delete(@Params('id') id: string) {
    return this.vehicleAssignmentService.delete(id);
  }
}
