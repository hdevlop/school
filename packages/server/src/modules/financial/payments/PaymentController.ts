import { Body, Controller, Get, Params, Post, Put, ResMsg, User, Validate } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { PaymentService } from './PaymentService';
import { isFinancial } from '../../../auth';
import {
  checkStatusDto,
  createPaymentDto,
  monthlyRevenueQueryDto,
  paymentIdParam,
  feeIdParam,
  receiptNumberParam,
  refundPaymentDto,
  revenueQueryDto,
  studentIdParam,
  topPayingStudentsQueryDto,
  updatePaymentDto,
  voidPaymentDto,
  type CheckStatusDto,
  type CreatePaymentDto,
  type MonthlyRevenueQueryDto,
  type RefundPaymentDto,
  type TopPayingStudentsQueryDto,
  type UpdatePaymentDto,
  type VoidPaymentDto,
} from './PaymentDto';


@ToolGroup('payments')
@Controller('/payments')
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
  ) { }

  @Get()
  @isFinancial()
  @McpTool('List all payments')
  @ResMsg('fees.success.paymentsRetrieved')
  async getAll() {
    return this.paymentService.getAll();
  }

  @Get('/today')
  @isFinancial()
  @McpTool("List today's payments with summary")
  @ResMsg('fees.success.paymentsRetrieved')
  async getToday() {
    return this.paymentService.getToday();
  }

  @Get('/this-month')
  @isFinancial()
  @McpTool("List this month's payments with summary")
  @ResMsg('fees.success.paymentsRetrieved')
  async getThisMonth() {
    return this.paymentService.getThisMonth();
  }

  @Get('/this-week')
  @isFinancial()
  @McpTool("List this week's payments with summary")
  @ResMsg('fees.success.paymentsRetrieved')
  async getThisWeek() {
    return this.paymentService.getThisWeek();
  }

  @Get('/pending-checks')
  @isFinancial()
  @McpTool('List pending and deposited checks')
  @ResMsg('fees.success.paymentsRetrieved')
  async getPendingChecks() {
    return this.paymentService.getPendingChecks();
  }

  @Get('/overdue-checks')
  @isFinancial()
  @McpTool('List checks whose due date has passed')
  @ResMsg('fees.success.paymentsRetrieved')
  async getOverdueChecks() {
    return this.paymentService.getOverdueChecks();
  }

  @Post('/stats/revenue')
  @isFinancial()
  @Validate(revenueQueryDto)
  @McpTool('Get total revenue allocated to fees of the academic year')
  @ResMsg('fees.success.revenueRetrieved')
  async getTotalRevenue() {
    const revenue = await this.paymentService.getTotalRevenue();
    return { revenue };
  }

  @Post('/stats/revenue-by-payment-method')
  @isFinancial()
  @Validate(revenueQueryDto)
  @McpTool('Get revenue breakdown by payment method')
  @ResMsg('fees.success.revenueRetrieved')
  async getRevenueByPaymentMethod() {
    return this.paymentService.getRevenueByPaymentMethod();
  }

  @Post('/stats/monthly-revenue')
  @isFinancial()
  @Validate(monthlyRevenueQueryDto)
  @McpTool('Get monthly revenue for a given year')
  @ResMsg('fees.success.revenueRetrieved')
  async getMonthlyRevenue(@Body() body: MonthlyRevenueQueryDto) {
    return this.paymentService.getMonthlyRevenue(body.year);
  }

  @Post('/stats/revenue-stats')
  @isFinancial()
  @Validate(revenueQueryDto)
  @McpTool('Get full revenue statistics')
  @ResMsg('fees.success.statsRetrieved')
  async getRevenueStats() {
    return this.paymentService.getRevenueStats();
  }

  @Post('/stats/top-paying-students')
  @isFinancial()
  @Validate(topPayingStudentsQueryDto)
  @McpTool('Get top paying students')
  @ResMsg('fees.success.dataRetrieved')
  async getTopPayingStudents(@Body() body: TopPayingStudentsQueryDto) {
    return this.paymentService.getTopPayingStudents(body?.limit ?? 10);
  }

  @Get('/:id')
  @isFinancial()
  @Validate({ params: paymentIdParam })
  @McpTool('Get a payment by ID')
  @ResMsg('fees.success.paymentsRetrieved')
  async getById(@Params('id') id: string) {
    return this.paymentService.getById(id);
  }

  @Get('/student/:studentId')
  @isFinancial()
  @Validate({ params: studentIdParam })
  @McpTool('Get payments for a student by student ID')
  @ResMsg('fees.success.paymentsRetrieved')
  async getByStudent(@Params('studentId') studentId: string) {
    return this.paymentService.getByStudent(studentId);
  }

  @Get('/fee/:feeId')
  @isFinancial()
  @Validate({ params: feeIdParam })
  @McpTool('Get receipts allocated to a fee in the selected year')
  @ResMsg('fees.success.paymentsRetrieved')
  async getByFeeId(@Params('feeId') feeId: string) {
    return this.paymentService.getByFeeId(feeId);
  }

  @Get('/receipt/:receiptNumber')
  @isFinancial()
  @Validate({ params: receiptNumberParam })
  @McpTool('Get a payment by receipt number')
  @ResMsg('fees.success.paymentsRetrieved')
  async getByReceiptNumber(@Params('receiptNumber') receiptNumber: string) {
    return this.paymentService.getByReceiptNumber(receiptNumber);
  }

  @Post()
  @isFinancial()
  @Validate(createPaymentDto)
  @McpTool({ description: 'Record a new payment', confirm: { level: 'warning', message: 'confirm.payments.record' } })
  @ResMsg('fees.success.paymentRecorded')
  async record(@Body() body: CreatePaymentDto, @User() user: { id: string }) {
    return this.paymentService.record(body, user.id);
  }

  @Put('/:id')
  @isFinancial()
  @Validate({ params: paymentIdParam, body: updatePaymentDto })
  @McpTool({ description: 'Update a payment by ID', confirm: { level: 'warning', message: 'confirm.payments.update' } })
  @ResMsg('fees.success.paymentUpdated')
  async update(@Params('id') id: string, @Body() body: UpdatePaymentDto, @User() user: { id: string }) {
    return this.paymentService.update(id, body, user.id);
  }

  @Post('/:id/refund')
  @isFinancial()
  @Validate({ params: paymentIdParam, body: refundPaymentDto })
  @McpTool('Refund a payment by ID')
  @ResMsg('fees.success.paymentRefunded')
  async refund(@Params('id') id: string, @Body() body: RefundPaymentDto, @User() user: { id: string }) {
    const { reason } = body;
    return this.paymentService.refund(id, reason || undefined, user.id);
  }

  @Post('/:id/void')
  @isFinancial()
  @Validate({ params: paymentIdParam, body: voidPaymentDto })
  @McpTool({ description: 'Void a payment (replaces hard delete)', confirm: { level: 'danger', message: 'confirm.payments.void' } })
  @ResMsg('fees.success.paymentVoided')
  async voidPayment(@Params('id') id: string, @Body() body: VoidPaymentDto, @User() user: { id: string }) {
    return this.paymentService.voidPayment(id, body, user.id);
  }

  @Post('/:id/check-status')
  @isFinancial()
  @Validate({ params: paymentIdParam, body: checkStatusDto })
  @McpTool({ description: 'Update a check status (deposit, complete, bounce, void)', confirm: { level: 'warning', message: 'confirm.payments.checkStatus' } })
  @ResMsg('fees.success.paymentUpdated')
  async updateCheckStatus(@Params('id') id: string, @Body() body: CheckStatusDto, @User() user: { id: string }) {
    return this.paymentService.updateCheckStatus(id, body, user.id);
  }
}
