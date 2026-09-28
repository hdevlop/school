import { Injectable, t } from '../../najm';
import { StudentService } from '../students/StudentService';
import { TeacherService } from '../teachers/TeacherService';
import { ParentService } from '../parents/ParentService';
import { ExpenseService } from '../financial/expenses/ExpenseService';
import { PaymentService } from '../financial/payments';
import { FeeService } from '../financial/fees/FeeService';
import { AttendanceRepository } from '../attendance/AttendanceRepository';
import { EventService } from '../events/EventService';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { getBusinessDate, getBusinessDateOnly } from '../../shared/businessDate';

const NO_CURRENT_ATTENDANCE = {
  today: null,
  todayAbsent: null,
  todayLate: null,
  thisWeek: null,
  lastWeek: null,
  weeklyChangePct: null,
};

function localToday() {
  return getBusinessDateOnly();
}

@Injectable()
export class DashboardService {

  constructor(
    private studentService: StudentService,
    private teacherService: TeacherService,
    private parentService: ParentService,
    private paymentService: PaymentService,
    private expenseService: ExpenseService,
    private attendanceRepository: AttendanceRepository,
    private feeService: FeeService,
    private eventService: EventService
  ) { }

  async getTodaySnapshot(_year: ResolvedAcademicYear) {
    const [
      studentAttendance,
      staffAttendance,
      todayPayments,
      todayExpenses,
      overdueFeesSummary,
      todayEvents,
    ] = await Promise.all([
      this.attendanceRepository.getToday('student'),
      this.attendanceRepository.getToday('staff'),
      this.paymentService.getToday().catch(() => ({ payments: [], summary: { total: 0, count: 0 } })),
      this.expenseService.getToday().catch(() => ({ expenses: [], summary: { total: 0, count: 0 } })),
      this.feeService.getOverdueSummary().catch(() => ({ overdueCount: 0, overdueAmount: 0, affectedStudents: 0 })),
      this.eventService.getTodayEvents().catch(() => []),
    ]);

    return {
      attendance: {
        students: studentAttendance,
        staff: staffAttendance,
      },
      income: todayPayments.summary,
      expenses: todayExpenses.summary,
      overdueFees: overdueFeesSummary,
      events: todayEvents,
    };
  }

  // One registered year's months, counted as that year's lists count them.
  // Today's and this week's figures belong to the year that holds today, so
  // any other year reports none rather than today's under its name.
  async getAttendanceMonthly(type: 'student' | 'staff', year: ResolvedAcademicYear) {
    const today = localToday();
    const holdsToday = today >= year.reportingStartsOn && today <= year.reportingEndsOn;
    const [monthly, current] = await Promise.all([
      this.attendanceRepository.getMonthlyStatsForYear(type, year),
      holdsToday ? this.getCurrentAttendanceFigures(type) : null,
    ]);
    return { monthly, ...(current ?? NO_CURRENT_ATTENDANCE) };
  }

  private async getCurrentAttendanceFigures(type: 'student' | 'staff') {
    const now = getBusinessDate();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const today = localToday();

    const fmt = (d: Date) => {
      const x = new Date(d);
      x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
      return x.toISOString().split('T')[0];
    };

    const weekEnd = new Date(now);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    const prevEnd = new Date(weekStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);

    const [todayCounts, thisWeek, lastWeek] = await Promise.all([
      this.attendanceRepository.getAbsentLateCountsInRange(type, today, today),
      this.attendanceRepository.getPresentCountInRange(type, fmt(weekStart), fmt(weekEnd)),
      this.attendanceRepository.getPresentCountInRange(type, fmt(prevStart), fmt(prevEnd)),
    ]);

    const weeklyChangePct = lastWeek > 0
      ? ((thisWeek - lastWeek) / lastWeek) * 100
      : thisWeek > 0 ? 100 : 0;

    return {
      today: todayCounts.absent + todayCounts.late,
      todayAbsent: todayCounts.absent,
      todayLate: todayCounts.late,
      thisWeek,
      lastWeek,
      weeklyChangePct,
    };
  }

  // Total Students counts the selected year's enrollments, defaulting to the
  // active year; the other widgets keep their school-wide figures.
  async getAdminWidgets(year: ResolvedAcademicYear) {
    const studentsCount = await this.studentService.getCount(year);
    const teachersCount = await this.teacherService.getCount();
    const parentsCount = await this.parentService.getCount();
    const earnings = await this.paymentService.getTotalRevenue();
    const expenses = await this.expenseService.getTotalExpenses()

    return [
      {
        title: t('dashboard.widgets.totalStudents'),
        icon: 'studentImage',
        value: studentsCount.count || 0,
      },
      {
        title: t('dashboard.widgets.totalTeachers'),
        icon: 'teacherImage',
        value: teachersCount.count || 0,
      },
      {
        title: t('dashboard.widgets.totalParents'),
        icon: 'parentsImage',
        value: parentsCount.count || 0,
      },
      {
        title: t('dashboard.widgets.totalEarnings'),
        icon: 'feesImage',
        value: `${earnings || 0} DH`,
      },
      {
        title: t('dashboard.widgets.totalExpenses'),
        icon: 'expensesImage',
        value: `${expenses || 0} DH`,
      }
    ];
  }

  async getStudentsByGender(year: ResolvedAcademicYear) {
    return this.studentService.getStudentsByGender(year);
  }

  async getTeacherWidgets(_userId: string) {
    // Get teacher by userId to find teacherId
  }

  async getStudentWidgets(_userId: string) {
    // Get student by userId to find studentId
  }

  async getParentWidgets(_userId: string) {
    // Get parent by userId to find parentId
  }
}
