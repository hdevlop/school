import { Controller, Get, t, ResMsg } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { DashboardService } from './DashboardService';
import { isAuth, isFinancial, isAdministrator, CanSchoolWide } from '../../auth';

@ToolGroup('dashboard')
@Controller('/dashboard')
@isAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) { }

  @Get('/today')
  @isAdministrator()
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

  // Each school-wide chart asks for the permission of the records it counts,
  // so the roles screen decides who sees it. A teacher, parent or student
  // granted that permission still reads only their own rows elsewhere.
  @Get('/students-by-gender')
  @CanSchoolWide('read:students')
  async getStudentsByGender() {
    const data = await this.dashboardService.getStudentsByGender();
    return {
      data,
      message: t('dashboards.success.retrieved'),
      status: 'success'
    };
  }

  @Get('/attendance/students-monthly')
  @CanSchoolWide('read:attendance')
  async getStudentAttendanceMonthly() {
    const data = await this.dashboardService.getAttendanceMonthly('student');
    return { data, message: t('dashboards.success.retrieved'), status: 'success' };
  }

  @Get('/attendance/staff-monthly')
  @CanSchoolWide('read:staff-attendance')
  async getStaffAttendanceMonthly() {
    const data = await this.dashboardService.getAttendanceMonthly('staff');
    return { data, message: t('dashboards.success.retrieved'), status: 'success' };
  }
}
