import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAdmin } from '@server/auth';
import { StudentRouteService } from './StudentRouteService';
import {
  createStudentRouteDto,
  updateStudentRouteDto,
  reassignStudentRouteDto,
  studentRouteIdParam,
  vehicleIdParam,
  studentIdParam,
  type CreateStudentRouteDto,
  type UpdateStudentRouteDto,
  type ReassignStudentRouteDto,
} from './StudentRouteDto';

@ToolGroup('student-routes')
@Controller('/student-routes')
export class StudentRouteController {
  constructor(private studentRouteService: StudentRouteService) {}

  @Get()
  @isAdmin()
  @McpTool('List all student routes')
  @ResMsg('studentRoutes.success.retrieved')
  async getAll() {
    return this.studentRouteService.getAll();
  }

  @Get('/vehicle/:vehicleId')
  @isAdmin()
  @Validate({ params: vehicleIdParam })
  @McpTool('Get student routes by vehicle')
  @ResMsg('studentRoutes.success.retrieved')
  async getByVehicle(@Params('vehicleId') vehicleId: string) {
    return this.studentRouteService.getByVehicleId(vehicleId);
  }

  @Get('/student/:studentId')
  @isAdmin()
  @Validate({ params: studentIdParam })
  @McpTool('Get student route by student')
  @ResMsg('studentRoutes.success.retrieved')
  async getByStudent(@Params('studentId') studentId: string) {
    return this.studentRouteService.getByStudentId(studentId);
  }

  @Get('/:id')
  @isAdmin()
  @Validate({ params: studentRouteIdParam })
  @McpTool('Get a student route by ID')
  @ResMsg('studentRoutes.success.retrieved')
  async getById(@Params('id') id: string) {
    return this.studentRouteService.getById(id);
  }

  @Post()
  @isAdmin()
  @Validate(createStudentRouteDto)
  @McpTool('Assign a student to a route')
  @ResMsg('studentRoutes.success.assigned')
  async assign(@Body() body: CreateStudentRouteDto, @User() user: any) {
    return this.studentRouteService.assign({ ...body, assignedBy: user?.id });
  }

  @Put('/:id')
  @isAdmin()
  @Validate({ params: studentRouteIdParam, body: updateStudentRouteDto })
  @McpTool('Update a student route')
  @ResMsg('studentRoutes.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateStudentRouteDto) {
    return this.studentRouteService.update(id, body);
  }

  @Post('/:id/reassign')
  @isAdmin()
  @Validate({ params: studentRouteIdParam, body: reassignStudentRouteDto })
  @McpTool('Move a student transport assignment to another vehicle')
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
  @McpTool('Unassign a student from a route')
  @ResMsg('studentRoutes.success.unassigned')
  async unassign(@Params('id') id: string) {
    return this.studentRouteService.unassign(id);
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
