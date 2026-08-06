import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAdmin } from '@server/auth';

import { PayrollService } from './PayrollService';
import {
  deleteBulkPayslipsDto,
  payPayslipDto,
  payStaffBulkDto,
  payStaffDto,
  payslipIdParam,
  payslipPeriodParam,
  runPayrollDto,
  unpayStaffDto,
  updatePayslipDto,
  type DeleteBulkPayslipsDto,
  type PayPayslipDto,
  type PayStaffBulkDto,
  type PayStaffDto,
  type RunPayrollDto,
  type UnpayStaffDto,
  type UpdatePayslipDto,
} from './PayrollDto';

@ToolGroup('payroll')
@Controller('/payroll')
export class PayrollController {
  constructor(private payrollService: PayrollService) { }

  @Get()
  @isAdmin()
  @McpTool('List all payslips')
  @ResMsg('payroll.success.retrieved')
  async getAll() {
    return this.payrollService.getAll();
  }

  @Get('/period/:period')
  @isAdmin()
  @Validate({ params: payslipPeriodParam })
  @McpTool('List payslips for a payroll period (YYYY-MM) with summary')
  @ResMsg('payroll.success.retrieved')
  async getByPeriod(@Params('period') period: string) {
    return this.payrollService.getByPeriod(period);
  }

  @Get('/staff/:staffId')
  @isAdmin()
  @McpTool('List payslips for a staff member')
  @ResMsg('payroll.success.retrieved')
  async getByStaff(@Params('staffId') staffId: string) {
    return this.payrollService.getByStaff(staffId);
  }

  @Get('/:id')
  @isAdmin()
  @Validate({ params: payslipIdParam })
  @McpTool('Get a payslip by ID')
  @ResMsg('payroll.success.retrieved')
  async getById(@Params('id') id: string) {
    return this.payrollService.getById(id);
  }

  @Post('/run')
  @isAdmin()
  @Validate({ body: runPayrollDto })
  @McpTool({ description: 'Run payroll for a period — create pending payslips for active staff', confirm: { level: 'warning', message: 'confirm.payroll.run' } })
  @ResMsg('payroll.success.run')
  async run(@Body() body: RunPayrollDto, @User() user: { id: string }) {
    return this.payrollService.runPayroll(body, user.id);
  }

  @Post('/pay-staff')
  @isAdmin()
  @Validate({ body: payStaffDto })
  @McpTool({ description: 'Create and pay a payslip for a staff member in one step', confirm: { level: 'warning', message: 'confirm.payroll.pay' } })
  @ResMsg('payroll.success.paid')
  async payStaff(@Body() body: PayStaffDto, @User() user: { id: string }) {
    return this.payrollService.payStaff(body, user.id);
  }

  @Post('/pay-staff-bulk')
  @isAdmin()
  @Validate({ body: payStaffBulkDto })
  @McpTool({ description: 'Create and pay payslips for multiple staff members in one step', confirm: { level: 'warning', message: 'confirm.payroll.pay' } })
  @ResMsg('payroll.success.paid')
  async payStaffBulk(@Body() body: PayStaffBulkDto, @User() user: { id: string }) {
    return this.payrollService.payStaffBulk(body, user.id);
  }

  @Post('/unpay-staff')
  @isAdmin()
  @Validate({ body: unpayStaffDto })
  @McpTool({ description: 'Undo a payment — return a staff member payslip to pending for a period', confirm: { level: 'warning', message: 'confirm.payroll.unpay' } })
  @ResMsg('payroll.success.unpaid')
  async unpayStaff(@Body() body: UnpayStaffDto, @User() user: { id: string }) {
    return this.payrollService.unpayStaff(body, user.id);
  }

  @Post('/:id/pay')
  @isAdmin()
  @Validate({ params: payslipIdParam, body: payPayslipDto })
  @McpTool({ description: 'Mark a payslip as paid', confirm: { level: 'warning', message: 'confirm.payroll.pay' } })
  @ResMsg('payroll.success.paid')
  async pay(@Params('id') id: string, @Body() body: PayPayslipDto, @User() user: { id: string }) {
    return this.payrollService.pay(id, body, user.id);
  }

  @Put('/:id')
  @isAdmin()
  @Validate({ params: payslipIdParam, body: updatePayslipDto })
  @McpTool('Update a payslip by ID')
  @ResMsg('payroll.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdatePayslipDto, @User() user: { id: string }) {
    return this.payrollService.update(id, body, user.id);
  }

  @Delete('/bulk')
  @isAdmin()
  @Validate({ body: deleteBulkPayslipsDto })
  @McpTool({ description: 'Delete multiple payslips by IDs', confirm: { level: 'danger', message: 'confirm.payroll.bulkDelete' } })
  @ResMsg('payroll.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteBulkPayslipsDto, @User() user: { id: string }) {
    return this.payrollService.deleteBulk(body.ids, user.id);
  }

  @Delete('/:id')
  @isAdmin()
  @Validate({ params: payslipIdParam })
  @McpTool({ description: 'Delete a payslip by ID', confirm: { level: 'danger', message: 'confirm.payroll.delete' } })
  @ResMsg('payroll.success.deleted')
  async delete(@Params('id') id: string, @User() user: { id: string }) {
    return this.payrollService.delete(id, user.id);
  }
}
