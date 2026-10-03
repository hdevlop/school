import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Validate } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { InstallmentService } from './InstallmentService';
import { isFinancial } from '../../../auth';
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
  @isFinancial()
  @McpTool({ description: 'List all installments', readOnly: true })
  @ResMsg('fees.success.installmentsRetrieved')
  async getAll() {
    return this.installmentService.getAll();
  }

  @Get('/overdue')
  @isFinancial()
  @McpTool({ description: 'List overdue installments', readOnly: true })
  @ResMsg('fees.success.installmentsRetrieved')
  async getOverdue() {
    return this.installmentService.getOverdue();
  }

  @Get('/pending')
  @isFinancial()
  @McpTool({ description: 'List pending installments', readOnly: true })
  @ResMsg('fees.success.installmentsRetrieved')
  async getPending() {
    return this.installmentService.getPending();
  }

  @Get('/paid')
  @isFinancial()
  @McpTool({ description: 'List paid installments', readOnly: true })
  @ResMsg('fees.success.installmentsRetrieved')
  async getPaid() {
    return this.installmentService.getPaid();
  }

  @Get('/fee/:feeId')
  @isFinancial()
  @Validate({ params: feeIdParam })
  @McpTool({ description: 'Get installments for a fee by fee ID', readOnly: true })
  @ResMsg('fees.success.installmentsRetrieved')
  async getByFeeId(@Params('feeId') feeId: string) {
    return this.installmentService.getByFeeId(feeId);
  }

  @Get('/stats')
  @isFinancial()
  @McpTool({ description: 'Get installment statistics', readOnly: true })
  @ResMsg('fees.success.statsRetrieved')
  async getStats() {
    return this.installmentService.getInstallmentStats();
  }

  @Get('/:id')
  @isFinancial()
  @Validate({ params: installmentIdParam })
  @McpTool({ description: 'Get an installment by ID', readOnly: true })
  @ResMsg('fees.success.installmentsRetrieved')
  async getById(@Params('id') id: string) {
    return this.installmentService.getById(id);
  }

  @Post()
  @isFinancial()
  @Validate(createInstallmentDto)
  @McpTool({ description: 'Create a new installment', confirm: { level: 'warning', message: 'confirm.installments.create' } })
  @ResMsg('fees.success.installmentCreated')
  async create(@Body() body: CreateInstallmentDto) {
    return this.installmentService.create(body);
  }

  @Put('/:id')
  @isFinancial()
  @Validate({ params: installmentIdParam, body: updateInstallmentDto })
  @McpTool({ description: 'Update an installment by ID', confirm: { level: 'warning', message: 'confirm.installments.update' } })
  @ResMsg('fees.success.installmentUpdated')
  async update(@Params('id') id: string, @Body() body: UpdateInstallmentDto) {
    return this.installmentService.update(id, body);
  }

  @Delete('/:id')
  @isFinancial()
  @Validate({ params: installmentIdParam })
  @McpTool('Delete an installment by ID')
  @ResMsg('fees.success.installmentDeleted')
  async delete(@Params('id') id: string) {
    return this.installmentService.delete(id);
  }



}
