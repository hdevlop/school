import { Injectable, t } from '@server/najm';
import { StudentService } from '../students/StudentService';
import { TeacherService } from '../teachers/TeacherService';
import { ParentService } from '../parents/ParentService';
import { ExpenseService } from '../financial/expenses/ExpenseService';
import { PaymentService } from '../financial/payments';
import { FeeService } from '../financial/fees/FeeService';
import { AttendanceRepository } from '../attendance/AttendanceRepository';
import { EventService } from '../events/EventService';

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
    private eventService: EventService,
  ) { }

  async getTodaySnapshot() {
    const [
      studentAttendance,
      staffAttendance,
      todayPayments,
      todayExpenses,
      overdueFeesSummary,
      todayEvents,
    ] = await Promise.all([
      this.attendanceRepository.getToday('student').catch(() => []),
      this.attendanceRepository.getToday('staff').catch(() => []),
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

  async getAttendanceMonthly(type: 'student' | 'staff', academicYear: string) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const today = now.toISOString().split('T')[0];

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

    const [monthly, todayCounts, thisWeek, lastWeek] = await Promise.all([
      this.attendanceRepository.getMonthlyStats(type, academicYear),
      this.attendanceRepository.getAbsentLateCountsInRange(type, today, today),
      this.attendanceRepository.getPresentCountInRange(type, fmt(weekStart), fmt(weekEnd)),
      this.attendanceRepository.getPresentCountInRange(type, fmt(prevStart), fmt(prevEnd)),
    ]);

    const weeklyChangePct = lastWeek > 0
      ? ((thisWeek - lastWeek) / lastWeek) * 100
      : thisWeek > 0 ? 100 : 0;

    return {
      monthly,
      today: todayCounts.absent + todayCounts.late,
      todayAbsent: todayCounts.absent,
      todayLate: todayCounts.late,
      thisWeek,
      lastWeek,
      weeklyChangePct,
    };
  }

  async getAdminWidgets() {
    const studentsCount = await this.studentService.getCount();
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

  async getStudentsByGender() {
    return await this.studentService.getStudentsByGender();
  }

  async getTeacherWidgets(userId: string) {
    // Get teacher by userId to find teacherId
  }

  async getStudentWidgets(userId: string) {
    // Get student by userId to find studentId
  }

  async getParentWidgets(userId: string) {
    // Get parent by userId to find parentId
  }
}
