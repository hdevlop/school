import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Validate } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { FeeService } from './FeeService';
import { buildFeeRecalculationResponse } from './buildFeeRecalculationResponse';
import { isFinancial } from '../../../auth';
import {
  createFeeDto,
  createFeesBulkDto,
  classBulkFeeDto,
  deleteFeesBulkInputDto,
  deleteFeesBulkDto,
  feeIdParam,
  overdueStudentBody,
  studentIdParam,
  updateFeeDto,
  type CreateFeeDto,
  type CreateFeesBulkDto,
  type ClassBulkFeeDto,
  type DeleteFeesBulkDto,
  type UpdateFeeDto,
  type OverdueStudentBody,
} from './FeeDto';

@ToolGroup('fees')
@Controller('/fees')
export class FeeController {
  constructor(
    private feeService: FeeService,
  ) { }

  @Get()
  @isFinancial()
  @McpTool('List all fees')
  @ResMsg('fees.success.retrieved')
  async getFees() {
    return this.feeService.getAll();
  }

  @Get('/outstanding')
  @isFinancial()
  @McpTool('List students owing fees of any school year, with every year summed')
  @ResMsg('fees.success.retrieved')
  async getOutstanding() {
    return this.feeService.getOutstanding();
  }

  @Get('/overdue')
  @isFinancial()
  @McpTool('List all overdue fees with student info')
  @ResMsg('fees.success.retrieved')
  async getOverdue() {
    return this.feeService.getOverdue();
  }

  @Get('/overdue/summary')
  @isFinancial()
  @McpTool('Get overdue fees summary for dashboard')
  @ResMsg('fees.success.retrieved')
  async getOverdueSummary() {
    return this.feeService.getOverdueSummary();
  }

  @Post('/mcp/overdue/student')
  @isFinancial()
  @Validate({ body: overdueStudentBody })
  @McpTool('Get overdue fees for a specific student')
  @ResMsg('fees.success.retrieved')
  async getOverdueByStudent(@Body() body: OverdueStudentBody) {
    return this.feeService.getOverdueByStudent(body.studentId);
  }

  // Every year's fees of one student: the explicit all-year read behind
  // other years' unpaid fees, whatever year is viewed.
  @Get('/student/:studentId/all-years')
  @isFinancial()
  @Validate({ params: studentIdParam })
  @McpTool("Get a student's fees of every school year, to find unpaid fees of other years")
  @ResMsg('fees.success.retrieved')
  async getByStudentAllYears(@Params('studentId') studentId: string) {
    return this.feeService.getByStudentAllYears(studentId);
  }

  @Get('/student/:studentId')
  @isFinancial()
  @Validate({ params: studentIdParam })
  @McpTool('Get fees for a student by student ID')
  @ResMsg('fees.success.retrieved')
  async getByStudent(@Params('studentId') studentId: string) {
    return this.feeService.getByStudent(studentId);
  }

  @Get('/:id')
  @isFinancial()
  @Validate({ params: feeIdParam })
  @McpTool('Get a fee by ID')
  @ResMsg('fees.success.retrieved')
  async getFee(@Params('id') id: string) {
    return this.feeService.getById(id);
  }

  @Post()
  @isFinancial()
  @Validate(createFeeDto)
  @McpTool({ description: 'Create a new fee', confirm: { level: 'warning', message: 'confirm.fees.create' } })
  @ResMsg('fees.success.created')
  async create(@Body() body: CreateFeeDto, @User() user: { id: string; role?: string }) {
    return this.feeService.create(body, user.id, user.role);
  }

  @Post('/bulk')
  @isFinancial()
  @Validate(createFeesBulkDto)
  @McpTool({ description: 'Create multiple fees in bulk', confirm: { level: 'warning', message: 'confirm.fees.bulkCreate' } })
  @ResMsg('fees.success.bulkCreated')
  async createBulk(@Body() body: CreateFeesBulkDto, @User() user: { id: string; role?: string }) {
    return this.feeService.createBulk(body.fees, user.id, user.role);
  }

  @Post('/bulk-class')
  @isFinancial()
  @Validate(classBulkFeeDto)
  @McpTool({ description: 'Assign a fee to all students in a class', confirm: { level: 'warning', message: 'confirm.fees.bulkClass' } })
  @ResMsg('fees.success.bulkCreated')
  async createClassBulk(@Body() body: ClassBulkFeeDto, @User() user: { id: string; role?: string }) {
    return this.feeService.createClassBulk(body, user.id, user.role);
  }

  @Put('/:id')
  @isFinancial()
  @Validate({ params: feeIdParam, body: updateFeeDto })
  @McpTool({ description: 'Update a fee by ID', confirm: { level: 'warning', message: 'confirm.fees.update' } })
  @ResMsg('fees.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateFeeDto, @User() user: { id: string; role?: string }) {
    return this.feeService.update(id, body, user.id, user.role);
  }

  @Delete('/bulk')
  @isFinancial()
  @Validate(deleteFeesBulkDto)
  @ResMsg('fees.success.bulkDeleted')
  async deleteBulkHttp(@Body() body: DeleteFeesBulkDto, @User() user: { id: string; role?: string }) {
    return this.feeService.deleteBulk(body.ids, user.id, user.role);
  }

  @Post('/bulk/delete')
  @isFinancial()
  @Validate(deleteFeesBulkInputDto)
  @McpTool({ description: 'Delete multiple fees by IDs', confirm: { level: 'danger', message: 'confirm.fees.bulkDelete' } })
  @ResMsg('fees.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteFeesBulkDto, @User() user: { id: string; role?: string }) {
    return this.feeService.deleteBulk(body.ids, user.id, user.role);
  }

  @Delete('/:id')
  @isFinancial()
  @Validate({ params: feeIdParam })
  @McpTool({ description: 'Delete a fee by ID', confirm: { level: 'danger', message: 'confirm.fees.delete' } })
  @ResMsg('fees.success.deleted')
  async delete(@Params('id') id: string, @User() user: { id: string; role?: string }) {
    return this.feeService.delete(id, user.id, user.role);
  }

  @Post('/recalculate/:id')
  @isFinancial()
  @Validate({ params: feeIdParam })
  @McpTool({ description: 'Recalculate total allocated amount for a fee', confirm: { level: 'notice', message: 'confirm.fees.recalculate' } })
  @ResMsg('fees.success.updated')
  async recalculateFee(@Params('id') id: string, @User() user: { role?: string }) {
    const recalculatedFee = await this.feeService.recalculate(id, user.role);
    return buildFeeRecalculationResponse(id, recalculatedFee);
  }
}
