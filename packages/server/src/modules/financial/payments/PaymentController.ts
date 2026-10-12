import { Body, Controller, Get, Params, Post, Put, ResMsg, User, Validate } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { PaymentService } from './PaymentService';
import { CanSchoolWide } from '../../../auth';
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
  @CanSchoolWide('read:payments')
  @McpTool({ description: 'List all payments', readOnly: true })
  @ResMsg('fees.success.paymentsRetrieved')
  async getAll() {
    return this.paymentService.getAll();
  }

  @Get('/today')
  @CanSchoolWide('read:payments')
  @McpTool({ description: "List today's payments with summary. Paiements reçus aujourd’hui. المدفوعات اليوم.", readOnly: true })
  @ResMsg('fees.success.paymentsRetrieved')
  async getToday() {
    return this.paymentService.getToday();
  }

  @Get('/this-month')
  @CanSchoolWide('read:payments')
  @McpTool({ description: "List this month's payments with summary. Paiements et recettes de ce mois. المدفوعات والمداخيل هذا الشهر.", readOnly: true })
  @ResMsg('fees.success.paymentsRetrieved')
  async getThisMonth() {
    return this.paymentService.getThisMonth();
  }

  @Get('/this-week')
  @CanSchoolWide('read:payments')
  @McpTool({ description: "List this week's payments with summary", readOnly: true })
  @ResMsg('fees.success.paymentsRetrieved')
  async getThisWeek() {
    return this.paymentService.getThisWeek();
  }

  @Get('/pending-checks')
  @CanSchoolWide('read:payments')
  @McpTool({ description: 'List pending and deposited checks', readOnly: true })
  @ResMsg('fees.success.paymentsRetrieved')
  async getPendingChecks() {
    return this.paymentService.getPendingChecks();
  }

  @Get('/overdue-checks')
  @CanSchoolWide('read:payments')
  @McpTool({ description: 'List checks whose due date has passed', readOnly: true })
  @ResMsg('fees.success.paymentsRetrieved')
  async getOverdueChecks() {
    return this.paymentService.getOverdueChecks();
  }

  @Post('/stats/revenue')
  @CanSchoolWide('read:payments')
  @Validate(revenueQueryDto)
  @McpTool({ description: 'Get total revenue allocated to fees of the academic year', readOnly: true })
  @ResMsg('fees.success.revenueRetrieved')
  async getTotalRevenue() {
    const revenue = await this.paymentService.getTotalRevenue();
    return { revenue };
  }

  @Post('/stats/revenue-by-payment-method')
  @CanSchoolWide('read:payments')
  @Validate(revenueQueryDto)
  @McpTool({ description: 'Get revenue breakdown by payment method', readOnly: true })
  @ResMsg('fees.success.revenueRetrieved')
  async getRevenueByPaymentMethod() {
    return this.paymentService.getRevenueByPaymentMethod();
  }

  @Post('/stats/monthly-revenue')
  @CanSchoolWide('read:payments')
  @Validate(monthlyRevenueQueryDto)
  @McpTool({ description: 'Get monthly revenue for a given year', readOnly: true })
  @ResMsg('fees.success.revenueRetrieved')
  async getMonthlyRevenue(@Body() body: MonthlyRevenueQueryDto) {
    return this.paymentService.getMonthlyRevenue(body.year);
  }

  @Post('/stats/revenue-stats')
  @CanSchoolWide('read:payments')
  @Validate(revenueQueryDto)
  @McpTool({ description: 'Get full revenue statistics', readOnly: true })
  @ResMsg('fees.success.statsRetrieved')
  async getRevenueStats() {
    return this.paymentService.getRevenueStats();
  }

  @Post('/stats/top-paying-students')
  @CanSchoolWide('read:payments')
  @Validate(topPayingStudentsQueryDto)
  @McpTool({ description: 'Get top paying students', readOnly: true })
  @ResMsg('fees.success.dataRetrieved')
  async getTopPayingStudents(@Body() body: TopPayingStudentsQueryDto) {
    return this.paymentService.getTopPayingStudents(body?.limit ?? 10);
  }

  @Get('/:id')
  @CanSchoolWide('read:payments')
  @Validate({ params: paymentIdParam })
  @McpTool({ description: 'Get a payment by ID', readOnly: true })
  @ResMsg('fees.success.paymentsRetrieved')
  async getById(@Params('id') id: string) {
    return this.paymentService.getById(id);
  }

  @Get('/student/:studentId')
  @CanSchoolWide('read:payments')
  @Validate({ params: studentIdParam })
  @McpTool({ description: 'Get payments for a student by student ID. Paiements d’un élève. مدفوعات تلميذ.', readOnly: true })
  @ResMsg('fees.success.paymentsRetrieved')
  async getByStudent(@Params('studentId') studentId: string) {
    return this.paymentService.getByStudent(studentId);
  }

  @Get('/fee/:feeId')
  @CanSchoolWide('read:payments')
  @Validate({ params: feeIdParam })
  @McpTool({ description: 'Get receipts allocated to a fee in the selected year', readOnly: true })
  @ResMsg('fees.success.paymentsRetrieved')
  async getByFeeId(@Params('feeId') feeId: string) {
    return this.paymentService.getByFeeId(feeId);
  }

  @Get('/receipt/:receiptNumber')
  @CanSchoolWide('read:payments')
  @Validate({ params: receiptNumberParam })
  @McpTool({ description: 'Get a payment by receipt number', readOnly: true })
  @ResMsg('fees.success.paymentsRetrieved')
  async getByReceiptNumber(@Params('receiptNumber') receiptNumber: string) {
    return this.paymentService.getByReceiptNumber(receiptNumber);
  }

  @Post()
  @CanSchoolWide('create:payments')
  @Validate(createPaymentDto)
  @McpTool({ description: 'Record a new payment', confirm: { level: 'warning', message: 'confirm.payments.record' } })
  @ResMsg('fees.success.paymentRecorded')
  async record(@Body() body: CreatePaymentDto, @User() user: { id: string }) {
    return this.paymentService.record(body, user.id);
  }

  @Put('/:id')
  @CanSchoolWide('update:payments')
  @Validate({ params: paymentIdParam, body: updatePaymentDto })
  @McpTool({ description: 'Update a payment by ID', confirm: { level: 'warning', message: 'confirm.payments.update' } })
  @ResMsg('fees.success.paymentUpdated')
  async updateById(@Params('id') id: string, @Body() body: UpdatePaymentDto, @User() user: { id: string }) {
    return this.paymentService.update(id, body, user.id);
  }

  @Post('/:id/refund')
  @CanSchoolWide('update:payments')
  @Validate({ params: paymentIdParam, body: refundPaymentDto })
  @McpTool('Refund a payment by ID')
  @ResMsg('fees.success.paymentRefunded')
  async refund(@Params('id') id: string, @Body() body: RefundPaymentDto, @User() user: { id: string }) {
    const { reason } = body;
    return this.paymentService.refund(id, reason || undefined, user.id);
  }

  @Post('/:id/void')
  @CanSchoolWide('update:payments')
  @Validate({ params: paymentIdParam, body: voidPaymentDto })
  @McpTool({ description: 'Void a payment (replaces hard delete)', confirm: { level: 'danger', message: 'confirm.payments.void' } })
  @ResMsg('fees.success.paymentVoided')
  async voidPayment(@Params('id') id: string, @Body() body: VoidPaymentDto, @User() user: { id: string }) {
    return this.paymentService.voidPayment(id, body, user.id);
  }

  @Post('/:id/check-status')
  @CanSchoolWide('update:payments')
  @Validate({ params: paymentIdParam, body: checkStatusDto })
  @McpTool({ description: 'Update a check status (deposit, complete, bounce, void)', confirm: { level: 'warning', message: 'confirm.payments.checkStatus' } })
  @ResMsg('fees.success.paymentUpdated')
  async updateCheckStatus(@Params('id') id: string, @Body() body: CheckStatusDto, @User() user: { id: string }) {
    return this.paymentService.updateCheckStatus(id, body, user.id);
  }
}
