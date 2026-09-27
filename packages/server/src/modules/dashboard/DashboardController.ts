import { Controller, Get, t, User, ResMsg, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { DashboardService } from './DashboardService';
import { isAuth, isAdmin, isStaff } from '../../auth';
import { dashboardYearQuery } from './DashboardDto';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';

@ToolGroup('dashboard')
@Controller('/dashboard')
@isAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) { }

  @Get('/today')
  @isAdmin()
  @Validate({ query: dashboardYearQuery })
  @McpTool('Get today snapshot — attendance, income, expenses, overdue fees, events')
  @ResMsg('dashboards.success.retrieved')
  async getTodaySnapshot(@Year() year: ResolvedAcademicYear) {
    return this.dashboardService.getTodaySnapshot(year);
  }

  @Get('/widgets')
  @Validate({ query: dashboardYearQuery })
  async getWidgets(@User() user, @Year() year: ResolvedAcademicYear) {
    let widgets;

    switch (user.role) {
      case 'admin':
        widgets = await this.dashboardService.getAdminWidgets(year);
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

  // School-wide counts and attendance are for staff, not parents or students.
  @Get('/students-by-gender')
  @isStaff()
  @Validate({ query: dashboardYearQuery })
  async getStudentsByGender(@Year() year: ResolvedAcademicYear) {
    const data = await this.dashboardService.getStudentsByGender(year);
    return {
      data,
      message: t('dashboards.success.retrieved'),
      status: 'success'
    };
  }

  @Get('/attendance/students-monthly')
  @isStaff()
  @Validate({ query: dashboardYearQuery })
  async getStudentAttendanceMonthly(@Year() year: ResolvedAcademicYear) {
    const data = await this.dashboardService.getAttendanceMonthly('student', year);
    return { data, message: t('dashboards.success.retrieved'), status: 'success' };
  }

  @Get('/attendance/staff-monthly')
  @isStaff()
  @Validate({ query: dashboardYearQuery })
  async getStaffAttendanceMonthly(@Year() year: ResolvedAcademicYear) {
    const data = await this.dashboardService.getAttendanceMonthly('staff', year);
    return { data, message: t('dashboards.success.retrieved'), status: 'success' };
  }
}
