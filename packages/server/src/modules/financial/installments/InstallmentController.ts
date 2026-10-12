import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Validate } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { InstallmentService } from './InstallmentService';
import { CanSchoolWide } from '../../../auth';
import {
  createInstallmentDto,
  feeIdParam,
  installmentIdParam,
  updateInstallmentDto,
  type CreateInstallmentDto,
  type UpdateInstallmentDto,
} from './InstallmentDto';

@ToolGroup('installments')
@Controller('/installments')
export class InstallmentController {
  constructor(
    private installmentService: InstallmentService,
  ) { }

  @Get()
  @CanSchoolWide('read:fees')
  @McpTool({ description: 'List all installments', readOnly: true })
  @ResMsg('fees.success.installmentsRetrieved')
  async getAll() {
    return this.installmentService.getAll();
  }

  @Get('/overdue')
  @CanSchoolWide('read:fees')
  @McpTool({ description: 'List overdue installments', readOnly: true })
  @ResMsg('fees.success.installmentsRetrieved')
  async getOverdue() {
    return this.installmentService.getOverdue();
  }

  @Get('/pending')
  @CanSchoolWide('read:fees')
  @McpTool({ description: 'List pending installments', readOnly: true })
  @ResMsg('fees.success.installmentsRetrieved')
  async getPending() {
    return this.installmentService.getPending();
  }

  @Get('/paid')
  @CanSchoolWide('read:fees')
  @McpTool({ description: 'List paid installments', readOnly: true })
  @ResMsg('fees.success.installmentsRetrieved')
  async getPaid() {
    return this.installmentService.getPaid();
  }

  @Get('/fee/:feeId')
  @CanSchoolWide('read:fees')
  @Validate({ params: feeIdParam })
  @McpTool({ description: 'Get installments for a fee by fee ID', readOnly: true })
  @ResMsg('fees.success.installmentsRetrieved')
  async getByFeeId(@Params('feeId') feeId: string) {
    return this.installmentService.getByFeeId(feeId);
  }

  @Get('/stats')
  @CanSchoolWide('read:fees')
  @McpTool({ description: 'Get installment statistics', readOnly: true })
  @ResMsg('fees.success.statsRetrieved')
  async getStats() {
    return this.installmentService.getInstallmentStats();
  }

  @Get('/:id')
  @CanSchoolWide('read:fees')
  @Validate({ params: installmentIdParam })
  @McpTool({ description: 'Get an installment by ID', readOnly: true })
  @ResMsg('fees.success.installmentsRetrieved')
  async getById(@Params('id') id: string) {
    return this.installmentService.getById(id);
  }

  @Post()
  @CanSchoolWide('create:fees')
  @Validate(createInstallmentDto)
  @McpTool({ description: 'Create a new installment', confirm: { level: 'warning', message: 'confirm.installments.create' } })
  @ResMsg('fees.success.installmentCreated')
  async create(@Body() body: CreateInstallmentDto) {
    return this.installmentService.create(body);
  }

  @Put('/:id')
  @CanSchoolWide('update:fees')
  @Validate({ params: installmentIdParam, body: updateInstallmentDto })
  @McpTool({ description: 'Update an installment by ID', confirm: { level: 'warning', message: 'confirm.installments.update' } })
  @ResMsg('fees.success.installmentUpdated')
  async update(@Params('id') id: string, @Body() body: UpdateInstallmentDto, @User() user: { id: string }) {
    return this.installmentService.update(id, body, user.id);
  }

  @Delete('/:id')
  @CanSchoolWide('delete:fees')
  @Validate({ params: installmentIdParam })
  @McpTool('Delete an installment by ID')
  @ResMsg('fees.success.installmentDeleted')
  async delete(@Params('id') id: string) {
    return this.installmentService.delete(id);
  }



}
