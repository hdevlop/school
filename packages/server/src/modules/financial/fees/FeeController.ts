import { Body, Controller, Delete, Get, Params, Post, Put, Query, ResMsg, User, Validate } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { FeeService } from './FeeService';
import { buildFeeRecalculationResponse } from './buildFeeRecalculationResponse';
import { CanSchoolWide, isAdministrator } from '../../../auth';
import { FeeImportService } from './FeeImportService';
import { importStudentFeesDto, importStudentFeesWithDatesDto, previewFeeImportDatesDto,
  type ImportStudentFeesDto, type ImportStudentFeesWithDatesDto, type PreviewFeeImportDatesDto } from './FeeImportDto';
import {
  addOccasionalChargeDto,
  type AddOccasionalChargeDto,
  createFeeDto,
  createFeesBulkDto,
  classBulkFeeDto,
  deleteFeesBulkInputDto,
  deleteFeesBulkDto,
  feeIdParam,
  listFeesQueryDto,
  overdueStudentBody,
  studentIdParam,
  updateFeeDto,
  type CreateFeeDto,
  type CreateFeesBulkDto,
  type ClassBulkFeeDto,
  type DeleteFeesBulkDto,
  type UpdateFeeDto,
  type OverdueStudentBody,
  type ListFeesQueryDto,
} from './FeeDto';

@ToolGroup('fees')
@Controller('/fees')
export class FeeController {
  constructor(
    private feeService: FeeService,
    private feeImportService: FeeImportService,
  ) { }

  @Get()
  @CanSchoolWide('read:fees')
  @Validate({ query: listFeesQueryDto })
  @McpTool({ description: 'List student fee totals in the selected year, optionally filtered by class, section and exact payment schedule. tuitionPayment=paidInFull returns only tuition totals fully paid through today, regardless of installment schedule.', readOnly: true })
  @ResMsg('fees.success.retrieved')
  async getFees(@Query() filters: ListFeesQueryDto = {}) {
    return this.feeService.getAll(filters);
  }

  @Get('/summary')
  @CanSchoolWide('read:fees')
  @McpTool({ description: 'Get selected-year fee collections by payment method and overdue installment balances through today', readOnly: true })
  @ResMsg('fees.success.statsRetrieved')
  async getSummary() {
    return this.feeService.getSummary();
  }

  @Get('/outstanding')
  @CanSchoolWide('read:fees')
  @McpTool({ description: 'List students owing fees of any school year, with every year summed. Élèves qui doivent encore payer. التلاميذ الذين لم يدفعوا الرسوم بعد.', readOnly: true })
  @ResMsg('fees.success.retrieved')
  async getOutstanding() {
    return this.feeService.getOutstanding();
  }

  @Get('/overdue')
  @CanSchoolWide('read:fees')
  @McpTool({ description: 'List all overdue fees with student info. Frais impayés en retard. الرسوم المتأخرة غير المدفوعة.', readOnly: true })
  @ResMsg('fees.success.retrieved')
  async listOverdue() {
    return this.feeService.getOverdue();
  }

  @Get('/overdue/summary')
  @CanSchoolWide('read:fees')
  @McpTool({ description: 'Get overdue fees summary for dashboard', readOnly: true })
  @ResMsg('fees.success.retrieved')
  async getOverdueSummary() {
    return this.feeService.getOverdueSummary();
  }

  @Post('/mcp/overdue/student')
  @CanSchoolWide('read:fees')
  @Validate({ body: overdueStudentBody })
  @McpTool({ description: 'Get overdue fees for a specific student', readOnly: true })
  @ResMsg('fees.success.retrieved')
  async getOverdueByStudent(@Body() body: OverdueStudentBody) {
    return this.feeService.getOverdueByStudent(body.studentId);
  }

  // Every year's fees of one student: the explicit all-year read behind
  // other years' unpaid fees, whatever year is viewed.
  @Get('/student/:studentId/all-years')
  @CanSchoolWide('read:fees')
  @Validate({ params: studentIdParam })
  @McpTool({ description: "Get a student's fees of every school year, to find unpaid fees of other years", readOnly: true })
  @ResMsg('fees.success.retrieved')
  async getByStudentAllYears(@Params('studentId') studentId: string) {
    return this.feeService.getByStudentAllYears(studentId);
  }

  @Get('/student/:studentId')
  @CanSchoolWide('read:fees')
  @Validate({ params: studentIdParam })
  @McpTool({ description: 'Get fees for a student by student ID. Frais d’un élève. رسوم تلميذ.', readOnly: true })
  @ResMsg('fees.success.retrieved')
  async getStudentFees(@Params('studentId') studentId: string) {
    return this.feeService.getByStudent(studentId);
  }

  @Get('/:id')
  @CanSchoolWide('read:fees')
  @Validate({ params: feeIdParam })
  @McpTool({ description: 'Get a fee by ID', readOnly: true })
  @ResMsg('fees.success.retrieved')
  async getFeeById(@Params('id') id: string) {
    return this.feeService.getById(id);
  }

  @Post()
  @CanSchoolWide('create:fees')
  @Validate(createFeeDto)
  @McpTool({ description: 'Create a new fee', confirm: { level: 'warning', message: 'confirm.fees.create' } })
  @ResMsg('fees.success.created')
  async createFee(@Body() body: CreateFeeDto, @User() user: { id: string; role?: string }) {
    return this.feeService.create(body, user.id, user.role);
  }

  @Post('/bulk')
  @CanSchoolWide('create:fees')
  @Validate(createFeesBulkDto)
  @McpTool({ description: 'Create multiple fees in bulk', confirm: { level: 'warning', message: 'confirm.fees.bulkCreate' } })
  @ResMsg('fees.success.bulkCreated')
  async createBulk(@Body() body: CreateFeesBulkDto, @User() user: { id: string; role?: string }) {
    return this.feeService.createBulk(body.fees, user.id, user.role);
  }

  @Post('/import')
  @CanSchoolWide('create:fees', 'update:fees', 'create:payments', 'update:payments')
  @Validate(importStudentFeesDto)
  @ResMsg('fees.success.bulkCreated')
  async importStudentFees(@Body() body: ImportStudentFeesDto, @User() user: { id: string; role?: string }) {
    return this.feeImportService.importStudent(body, user);
  }

  @Post('/import/preview-dates')
  @CanSchoolWide('create:fees', 'update:fees', 'create:payments')
  @Validate(previewFeeImportDatesDto)
  @ResMsg('fees.success.retrieved')
  async previewImportDates(@Body() body: PreviewFeeImportDatesDto) {
    return this.feeImportService.previewDates(body.students);
  }

  @Post('/import/with-dates')
  @isAdministrator()
  @CanSchoolWide('create:fees', 'update:fees', 'create:payments', 'update:payments', 'update:students')
  @Validate(importStudentFeesWithDatesDto)
  @ResMsg('fees.success.bulkCreated')
  async importStudentFeesWithDates(@Body() body: ImportStudentFeesWithDatesDto, @User() user: { id: string; role?: string }) {
    return this.feeImportService.importStudent(body, user);
  }

  @Post('/bulk-class')
  @CanSchoolWide('create:fees')
  @Validate(classBulkFeeDto)
  @McpTool({ description: 'Assign a fee to all students in a class', confirm: { level: 'warning', message: 'confirm.fees.bulkClass' } })
  @ResMsg('fees.success.bulkCreated')
  async createClassBulk(@Body() body: ClassBulkFeeDto, @User() user: { id: string; role?: string }) {
    return this.feeService.createClassBulk(body, user.id, user.role);
  }

  @Put('/:id')
  @CanSchoolWide('update:fees')
  @Validate({ params: feeIdParam, body: updateFeeDto })
  @McpTool({ description: 'Update a fee by ID', confirm: { level: 'warning', message: 'confirm.fees.update' } })
  @ResMsg('fees.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateFeeDto, @User() user: { id: string; role?: string }) {
    return this.feeService.update(id, body, user.id, user.role);
  }

  @Post('/:id/occasional-charges')
  @CanSchoolWide('update:fees')
  @Validate({ params: feeIdParam, body: addOccasionalChargeDto })
  @ResMsg('fees.success.updated')
  async addOccasionalCharge(@Params('id') id: string, @Body() body: AddOccasionalChargeDto, @User() user: { id: string; role?: string }) {
    return this.feeService.addOccasionalCharge(id, body, user.id, user.role);
  }

  @Delete('/bulk')
  @CanSchoolWide('delete:fees')
  @Validate(deleteFeesBulkDto)
  @ResMsg('fees.success.bulkDeleted')
  async deleteBulkHttp(@Body() body: DeleteFeesBulkDto, @User() user: { id: string; role?: string }) {
    return this.feeService.deleteBulk(body.ids, user.id, user.role);
  }

  @Post('/bulk/delete')
  @CanSchoolWide('delete:fees')
  @Validate(deleteFeesBulkInputDto)
  @McpTool({ description: 'Delete multiple fees by IDs', confirm: { level: 'danger', message: 'confirm.fees.bulkDelete' } })
  @ResMsg('fees.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteFeesBulkDto, @User() user: { id: string; role?: string }) {
    return this.feeService.deleteBulk(body.ids, user.id, user.role);
  }

  @Delete('/:id')
  @CanSchoolWide('delete:fees')
  @Validate({ params: feeIdParam })
  @McpTool({ description: 'Delete a fee by ID', confirm: { level: 'danger', message: 'confirm.fees.delete' } })
  @ResMsg('fees.success.deleted')
  async deleteById(@Params('id') id: string, @User() user: { id: string; role?: string }) {
    return this.feeService.delete(id, user.id, user.role);
  }

  @Post('/recalculate/:id')
  @CanSchoolWide('update:fees')
  @Validate({ params: feeIdParam })
  @McpTool({ description: 'Recalculate total allocated amount for a fee', confirm: { level: 'notice', message: 'confirm.fees.recalculate' } })
  @ResMsg('fees.success.updated')
  async recalculateFee(@Params('id') id: string, @User() user: { role?: string }) {
    const recalculatedFee = await this.feeService.recalculate(id, user.role);
    return buildFeeRecalculationResponse(id, recalculatedFee);
  }
}
