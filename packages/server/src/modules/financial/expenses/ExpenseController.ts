import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { ExpenseService } from './ExpenseService';
import { isFinancial } from '@server/auth';
import {
  createExpenseDto,
  expenseApprovalDto,
  expenseDateRangeParam,
  expenseIdParam,
  expensePaymentDto,
  updateExpenseDto,
  type CreateExpenseDto,
  type ExpenseApprovalDto,
  type ExpensePaymentDto,
  type UpdateExpenseDto,
} from './ExpenseDto';

@ToolGroup('expenses')
@Controller('/expenses')
export class ExpenseController {
  constructor(
    private expenseService: ExpenseService,
  ) { }

  @Get()
  @isFinancial()
  @McpTool('List all expenses')
  @ResMsg('expenses.success.retrieved')
  async getExpenses() {
    return this.expenseService.getAll();
  }

  @Get('/today')
  @isFinancial()
  @McpTool("List today's paid expenses with summary")
  @ResMsg('expenses.success.retrieved')
  async getToday() {
    return this.expenseService.getToday();
  }

  @Get('/this-month')
  @isFinancial()
  @McpTool("List this month's paid expenses with summary")
  @ResMsg('expenses.success.retrieved')
  async getThisMonth() {
    return this.expenseService.getThisMonth();
  }

  @Get('/summary')
  @isFinancial()
  @McpTool('Get expense summary for dashboard')
  @ResMsg('expenses.success.retrieved')
  async getSummary() {
    return this.expenseService.getSummary();
  }

  @Get('/pending')
  @isFinancial()
  @McpTool('List expenses pending approval')
  @ResMsg('expenses.success.retrieved')
  async getPendingApprovals() {
    return this.expenseService.getPendingApprovals();
  }

  @Get('/date-range/:startDate/:endDate')
  @isFinancial()
  @Validate({ params: expenseDateRangeParam })
  @McpTool('Get expenses within a date range')
  @ResMsg('expenses.success.retrieved')
  async getByDateRange(@Params('startDate') startDate: string, @Params('endDate') endDate: string) {
    return this.expenseService.getByDateRange(startDate, endDate);
  }

  @Get('/:id')
  @isFinancial()
  @Validate({ params: expenseIdParam })
  @McpTool('Get an expense by ID')
  @ResMsg('expenses.success.retrieved')
  async getExpense(@Params('id') id: string) {
    return this.expenseService.getById(id);
  }

  @Post()
  @isFinancial()
  @Validate(createExpenseDto)
  @McpTool('Create a new expense')
  @ResMsg('expenses.success.created')
  async create(@Body() body: CreateExpenseDto, @User() user: { id: string }) {
    return this.expenseService.create(body, user.id);
  }

  @Post('/:id/approve')
  @isFinancial()
  @Validate({ params: expenseIdParam, body: expenseApprovalDto })
  @McpTool('Approve or reject an expense')
  @ResMsg('expenses.success.updated')
  async handleApproval(@Params('id') id: string, @Body() body: ExpenseApprovalDto, @User() user: { id: string }) {
    return this.expenseService.handleApproval(id, body, user.id);
  }

  @Post('/:id/payment')
  @isFinancial()
  @Validate({ params: expenseIdParam, body: expensePaymentDto })
  @McpTool('Record a payment for an expense')
  @ResMsg('expenses.success.paymentRecorded')
  async recordPayment(@Params('id') id: string, @Body() body: ExpensePaymentDto, @User() user: { id: string }) {
    return this.expenseService.recordPayment(id, body, user.id);
  }

  @Put('/:id')
  @isFinancial()
  @Validate({ params: expenseIdParam, body: updateExpenseDto })
  @McpTool('Update an expense by ID')
  @ResMsg('expenses.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateExpenseDto, @User() user: { id: string }) {
    return this.expenseService.update(id, body, user.id);
  }

  @Delete('/:id')
  @isFinancial()
  @Validate({ params: expenseIdParam })
  @McpTool('Delete an expense by ID')
  @ResMsg('expenses.success.deleted')
  async delete(@Params('id') id: string, @User() user: { id: string }) {
    return this.expenseService.delete(id, user.id);
  }

}
