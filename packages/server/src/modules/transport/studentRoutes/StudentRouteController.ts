import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Validate } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAdmin } from '../../../auth';
import { StudentRouteService } from './StudentRouteService';
import {
  createStudentRouteDto,
  updateStudentRouteDto,
  reassignStudentRouteDto,
  unassignStudentRouteDto,
  studentRouteIdParam,
  vehicleIdParam,
  studentIdParam,
  type CreateStudentRouteDto,
  type UpdateStudentRouteDto,
  type ReassignStudentRouteDto,
  type UnassignStudentRouteDto,
} from './StudentRouteDto';

@ToolGroup('student-routes')
@Controller('/student-routes')
export class StudentRouteController {
  constructor(private studentRouteService: StudentRouteService) {}

  @Get()
  @isAdmin()
  @McpTool({ description: 'List all student routes', readOnly: true })
  @ResMsg('studentRoutes.success.retrieved')
  async getAll() {
    return this.studentRouteService.getAll();
  }

  @Get('/vehicle/:vehicleId')
  @isAdmin()
  @Validate({ params: vehicleIdParam })
  @McpTool({ description: 'Get student routes by vehicle', readOnly: true })
  @ResMsg('studentRoutes.success.retrieved')
  async getByVehicle(@Params('vehicleId') vehicleId: string) {
    return this.studentRouteService.getByVehicleId(vehicleId);
  }

  @Get('/student/:studentId')
  @isAdmin()
  @Validate({ params: studentIdParam })
  @McpTool({ description: 'Get student route by student', readOnly: true })
  @ResMsg('studentRoutes.success.retrieved')
  async getByStudent(@Params('studentId') studentId: string) {
    return this.studentRouteService.getByStudentId(studentId);
  }

  @Get('/:id')
  @isAdmin()
  @Validate({ params: studentRouteIdParam })
  @McpTool({ description: 'Get a student route by ID', readOnly: true })
  @ResMsg('studentRoutes.success.retrieved')
  async getById(@Params('id') id: string) {
    return this.studentRouteService.getById(id);
  }

  @Post()
  @isAdmin()
  @Validate(createStudentRouteDto)
  @McpTool({ description: 'Assign a student to a route', confirm: { level: 'warning', message: 'confirm.studentRoutes.assign' } })
  @ResMsg('studentRoutes.success.assigned')
  async assign(@Body() body: CreateStudentRouteDto, @User() user: any) {
    return this.studentRouteService.assign({ ...body, assignedBy: user?.id });
  }

  @Put('/:id')
  @isAdmin()
  @Validate({ params: studentRouteIdParam, body: updateStudentRouteDto })
  @McpTool({ description: 'Update a student route', confirm: { level: 'warning', message: 'confirm.studentRoutes.update' } })
  @ResMsg('studentRoutes.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateStudentRouteDto) {
    return this.studentRouteService.update(id, body);
  }

  @Post('/:id/reassign')
  @isAdmin()
  @Validate({ params: studentRouteIdParam, body: reassignStudentRouteDto })
  @McpTool({ description: 'Move a student transport assignment to another vehicle', confirm: { level: 'warning', message: 'confirm.studentRoutes.reassign' } })
  @ResMsg('studentRoutes.success.updated')
  async reassign(
    @Params('id') id: string,
    @Body() body: ReassignStudentRouteDto,
    @User() user: any,
  ) {
    return this.studentRouteService.reassign(id, body, user?.id);
  }

  @Delete('/:id/unassign')
  @isAdmin()
  @Validate({ params: studentRouteIdParam })
  @McpTool({ description: 'Unassign a student from a route', confirm: { level: 'warning', message: 'confirm.studentRoutes.unassign' } })
  @ResMsg('studentRoutes.success.unassigned')
  async unassign(@Params('id') id: string) {
    return this.studentRouteService.unassign(id);
  }

  @Post('/:id/unassign')
  @isAdmin()
  @Validate({ params: studentRouteIdParam, body: unassignStudentRouteDto })
  @McpTool({ description: 'Unassign a student from a route on a selected-year date', confirm: { level: 'warning', message: 'confirm.studentRoutes.unassignAt' } })
  @ResMsg('studentRoutes.success.unassigned')
  async unassignAt(@Params('id') id: string, @Body() body: UnassignStudentRouteDto) {
    return this.studentRouteService.unassign(id, body.unassignmentDate);
  }

  @Delete('/:id')
  @isAdmin()
  @Validate({ params: studentRouteIdParam })
  @McpTool('Delete a student route')
  @ResMsg('studentRoutes.success.deleted')
  async delete(@Params('id') id: string) {
    return this.studentRouteService.delete(id);
  }
}
