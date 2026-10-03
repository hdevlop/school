import { Controller, Get, t, ResMsg } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { DashboardService } from './DashboardService';
import { isAuth, isAdmin, isFinancial, isStaff } from '../../auth';

@ToolGroup('dashboard')
@Controller('/dashboard')
@isAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) { }

  @Get('/today')
  @isAdmin()
  @McpTool({ description: 'Get today snapshot — attendance, income, expenses, overdue fees, events', readOnly: true })
  @ResMsg('dashboards.success.retrieved')
  async getTodaySnapshot() {
    return this.dashboardService.getTodaySnapshot();
  }

  // The finance dashboard's summary cards, for the roles it admits.
  @Get('/widgets')
  @isFinancial()
  async getWidgets() {
    const data = await this.dashboardService.getWidgets();
    return {
      data,
      message: t('dashboards.success.retrieved'),
      status: 'success'
    };
  }

  // School-wide counts and attendance are for staff, not parents or students.
  @Get('/students-by-gender')
  @isStaff()
  async getStudentsByGender() {
    const data = await this.dashboardService.getStudentsByGender();
    return {
      data,
      message: t('dashboards.success.retrieved'),
      status: 'success'
    };
  }

  @Get('/attendance/students-monthly')
  @isStaff()
  async getStudentAttendanceMonthly() {
    const data = await this.dashboardService.getAttendanceMonthly('student');
    return { data, message: t('dashboards.success.retrieved'), status: 'success' };
  }

  @Get('/attendance/staff-monthly')
  @isStaff()
  async getStaffAttendanceMonthly() {
    const data = await this.dashboardService.getAttendanceMonthly('staff');
    return { data, message: t('dashboards.success.retrieved'), status: 'success' };
  }
}
