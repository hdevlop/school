import { Injectable, t } from '../../najm';
import { StudentService } from '../students/StudentService';
import { TeacherService } from '../teachers/TeacherService';
import { ParentService } from '../parents/ParentService';
import { ExpenseService } from '../financial/expenses/ExpenseService';
import { PaymentService } from '../financial/payments';
import { FeeService } from '../financial/fees/FeeService';
import { AttendanceRepository } from '../attendance/AttendanceRepository';
import { EventService } from '../events/EventService';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { holdsDay } from '../academicYears/academicRecordYear';
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
  // Its own rule needs the year: today's figures belong only to the year that
  // holds today. Students take it explicitly until their own module turn.
  @Year() private readonly year!: ResolvedAcademicYear;

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

  private holdsToday() {
    return holdsDay(this.year, localToday());
  }

  // Today's attendance, cash and events exist only in the year that holds
  // today; any other year reports none rather than today's under its name.
  // Overdue fees are the selected fee year's, as of today.
  async getTodaySnapshot() {
    if (!this.holdsToday()) {
      return {
        attendance: null,
        income: null,
        expenses: null,
        overdueFees: await this.feeService.getOverdueSummary(),
        events: null,
      };
    }

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
      this.paymentService.getToday(),
      this.expenseService.getToday(),
      this.feeService.getOverdueSummary(),
      this.eventService.getTodayEvents(),
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

  // The selected year's months, counted as that year's lists count them.
  // Today's and this week's figures belong to the year that holds today, so
  // any other year reports none rather than today's under its name.
  async getAttendanceMonthly(type: 'student' | 'staff') {
    const [monthly, current] = await Promise.all([
      this.attendanceRepository.getMonthlyStats(type),
      this.holdsToday() ? this.getCurrentAttendanceFigures(type) : null,
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

  // The finance dashboard's cards: the selected year's enrollments, fee-year
  // revenue and paid expenses over its reporting dates. Teachers and parents
  // are not recorded per year, so their counts are current.
  async getWidgets() {
    const [studentsCount, teachersCount, parentsCount, earnings, expenses] = await Promise.all([
      this.studentService.getCount(),
      this.teacherService.getCount(),
      this.parentService.getCount(),
      this.paymentService.getTotalRevenue(),
      this.expenseService.getTotalExpenses(),
    ]);

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
    return this.studentService.getStudentsByGender();
  }
}
