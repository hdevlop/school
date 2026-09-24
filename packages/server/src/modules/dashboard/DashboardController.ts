import { Controller, Get, t, User, ResMsg } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { DashboardService } from './DashboardService';
import { isAuth, isAdmin } from '../../auth';
import { SettingsRepository } from '../settings/SettingsRepository';
import { getCurrentAcademicYear } from '../financial/utils';

@ToolGroup('dashboard')
@Controller('/dashboard')
@isAuth()
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
    private settingsRepository: SettingsRepository,
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
    const data = await this.dashboardService.getAttendanceMonthly('student', await this.currentAcademicYear());
    return { data, message: t('dashboards.success.retrieved'), status: 'success' };
  }

  @Get('/attendance/staff-monthly')
  async getStaffAttendanceMonthly() {
    const data = await this.dashboardService.getAttendanceMonthly('staff', await this.currentAcademicYear());
    return { data, message: t('dashboards.success.retrieved'), status: 'success' };
  }

  private async currentAcademicYear(): Promise<string> {
    const settings = await this.settingsRepository.getPublicSettings();
    return settings?.currentAcademicYear || getCurrentAcademicYear();
  }
}
