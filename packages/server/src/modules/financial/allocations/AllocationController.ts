import { Controller, Get, Delete, Params, ResMsg, User, Validate } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isFinancial } from '../../../auth';
import { AllocationService } from './AllocationService';
import { allocationIdParam, paymentIdParam, studentIdParam } from './AllocationDto';


@ToolGroup('payment-allocations')
@Controller('/payment-allocations')
export class AllocationController {
  constructor(
    private allocationService: AllocationService,
  ) { }


  @Get()
  @isFinancial()
  @McpTool({ description: 'List all payment allocations', readOnly: true })
  @ResMsg('fees.success.allocationsRetrieved')
  async getAll() {
    return this.allocationService.getAll();
  }

  @Get('/:id')
  @isFinancial()
  @Validate({ params: allocationIdParam })
  @McpTool({ description: 'Get a payment allocation by ID', readOnly: true })
  @ResMsg('fees.success.allocationRetrieved')
  async getById(@Params('id') id: string) {
    return this.allocationService.getById(id);
  }

  @Get('/payment/:paymentId')
  @isFinancial()
  @Validate({ params: paymentIdParam })
  @McpTool({ description: 'Get allocations for a payment by payment ID', readOnly: true })
  @ResMsg('fees.success.allocationsRetrieved')
  async getByPaymentId(@Params('paymentId') paymentId: string) {
    return this.allocationService.getByPaymentId(paymentId);
  }

  @Get('/student/:studentId')
  @isFinancial()
  @Validate({ params: studentIdParam })
  @McpTool({ description: 'Get allocations for a student by student ID', readOnly: true })
  @ResMsg('fees.success.allocationsRetrieved')
  async getByStudentId(@Params('studentId') studentId: string) {
    return this.allocationService.getByStudentId(studentId);
  }

  @Delete('/:id')
  @isFinancial()
  @Validate({ params: allocationIdParam })
  @McpTool('Delete a payment allocation by ID')
  @ResMsg('fees.success.allocationDeleted')
  async delete(@Params('id') id: string, @User() user: { id: string }) {
    return this.allocationService.delete(id, user.id);
  }
}
