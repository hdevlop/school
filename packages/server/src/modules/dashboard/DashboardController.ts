import { Controller, Get, t, User, ResMsg } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { DashboardService } from './DashboardService';
import { isAuth, isAdmin } from '@server/auth';

@ToolGroup('dashboard')
@Controller('/dashboard')
@isAuth()
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
  ) { }

  @Get('/today')
  @isAdmin()
  @McpTool('Get today snapshot — attendance, income, expenses, overdue fees, events')
  @ResMsg('dashboards.success.retrieved')
  async getTodaySnapshot() {
    return this.dashboardService.getTodaySnapshot();
  }

  @Get('/widgets')

  async getWidgets(@User() user) {
    let widgets;

    switch (user.role) {
      case 'admin':
        widgets = await this.dashboardService.getAdminWidgets();
        break;
      case 'teacher':
        widgets = await this.dashboardService.getTeacherWidgets(user.id);
        break;
      case 'student':
        widgets = await this.dashboardService.getStudentWidgets(user.id);
        break;
      case 'parent':
        widgets = await this.dashboardService.getParentWidgets(user.id);
        break;
      default:
        widgets = {};
    }

    return {
      data: widgets,
      message: t('dashboards.success.retrieved'),
      status: 'success'
    };
  }

  @Get('/students-by-gender')
  async getStudentsByGender() {
    const data = await this.dashboardService.getStudentsByGender();
    return {
      data,
      message: t('dashboards.success.retrieved'),
      status: 'success'
    };
  }

  @Get('/attendance/students-monthly')
  async getStudentAttendanceMonthly() {
    const data = await this.dashboardService.getAttendanceMonthly('student', this.currentAcademicYear());
    return { data, message: t('dashboards.success.retrieved'), status: 'success' };
  }

  @Get('/attendance/staff-monthly')
  async getStaffAttendanceMonthly() {
    const data = await this.dashboardService.getAttendanceMonthly('staff', this.currentAcademicYear());
    return { data, message: t('dashboards.success.retrieved'), status: 'success' };
  }

  private currentAcademicYear(): string {
    const now = new Date();
    const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return `${start}-${start + 1}`;
  }
}
