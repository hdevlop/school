import { Repository } from '../../../najm';
import { and, desc, eq, gt, gte, lt, lte, ne, sql, type AnyColumn, type SQL, type SQLWrapper } from 'drizzle-orm';
import {
  expenses,
  feeInstallments,
  fees,
  payments,
  payslips,
  students,
  classes,
  users,
  studentEnrollments,
  studentEnrollmentPlacements,
  paymentAllocations,
} from '../../../database/schema';
import { DB } from '../../../database/db';
import { formatDateOnly } from '../../financial/utils/dateOnly';
import { getBusinessDate } from '../../../shared/businessDate';
import { monthsBetween } from '@sms/contracts/academic-years';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';

const businessToday = () => formatDateOnly(getBusinessDate()) as string;

/** Whole days from one date-only value to another. */
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

// The day a receipt counts as cash: its settlement date, else its payment date.
const cashDate = sql`COALESCE(${payments.settledDate}, ${payments.paymentDate})`;

// Balances by how long past due they are on `today`.
function agingBuckets(dueDate: AnyColumn | SQLWrapper, balance: SQLWrapper, today: string) {
  const sumWhen = (condition: SQL) =>
    sql<string>`COALESCE(SUM(CASE WHEN ${condition} THEN ${balance} ELSE 0 END), 0)`;
  return {
    current: sumWhen(sql`${dueDate} >= ${today}`),
    d1_30: sumWhen(sql`${dueDate} < ${today} AND ${dueDate} >= (${today}::date - INTERVAL '30 days')`),
    d31_60: sumWhen(sql`${dueDate} < (${today}::date - INTERVAL '30 days') AND ${dueDate} >= (${today}::date - INTERVAL '60 days')`),
    d60plus: sumWhen(sql`${dueDate} < (${today}::date - INTERVAL '60 days')`),
  };
}

// The finance dashboard's reads of the selected year: fees by their stored
// year label, cash by date over the year's own reporting interval.
@Repository()
export class FinanceDashboardRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;

  // The selected fee year's uncancelled installments, with what completed
  // receipts paid on each. Every balance and collection figure reads these
  // rather than the cached paid column, which stops following an installment
  // once it is cancelled; a mixed-year receipt counts only toward its targets.
  private yearInstallments() {
    const completed = this.db.select({
      installmentId: paymentAllocations.installmentId,
      feeId: paymentAllocations.feeId,
      paid: sql<string>`COALESCE(SUM(${paymentAllocations.amount}), 0)`.as('paid'),
    }).from(paymentAllocations)
      .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .where(eq(payments.status, 'completed'))
      .groupBy(paymentAllocations.installmentId, paymentAllocations.feeId)
      .as('completed_installment_allocations');

    return this.db.select({
      feeId: fees.id,
      studentId: fees.studentId,
      dueDate: feeInstallments.dueDate,
      amount: feeInstallments.amount,
      paid: sql<string>`COALESCE(${completed.paid}, 0)`.as('paid'),
      balance: sql<string>`GREATEST(${feeInstallments.amount} - COALESCE(${completed.paid}, 0), 0)`.as('balance'),
    }).from(feeInstallments)
      .innerJoin(fees, eq(feeInstallments.feeId, fees.id))
      .leftJoin(completed, and(
        eq(completed.installmentId, feeInstallments.id),
        eq(completed.feeId, fees.id),
      ))
      .where(and(
        eq(fees.academicYear, this.year.label),
        ne(feeInstallments.status, 'cancelled'),
      ))
      .as('year_installments');
  }

  // Cash moved over an inclusive date range, one condition per source:
  // completed receipts by cash date; paid expenses by expense date, as the
  // Expenses module totals them; paid payslips by payment date.
  private receiptsIn(from: string, to: string) {
    return and(eq(payments.status, 'completed'), gte(cashDate, from), lte(cashDate, to));
  }

  private expensesIn(from: string, to: string) {
    return and(eq(expenses.status, 'paid'), gte(expenses.expenseDate, from), lte(expenses.expenseDate, to));
  }

  private payrollIn(from: string, to: string) {
    return and(eq(payslips.status, 'paid'), gte(payslips.paymentDate, from), lte(payslips.paymentDate, to));
  }

  async getAging() {
    const today = businessToday();
    const installments = this.yearInstallments();
    const [row] = await this.db.select(agingBuckets(installments.dueDate, installments.balance, today))
      .from(installments)
      .where(gt(installments.balance, '0'));

    return {
      current: Number(row?.current ?? 0),
      d1_30: Number(row?.d1_30 ?? 0),
      d31_60: Number(row?.d31_60 ?? 0),
      d60plus: Number(row?.d60plus ?? 0),
    };
  }

  async getOverdue(limit: number) {
    const today = businessToday();
    const installments = this.yearInstallments();
    const rows = await this.db.select({
      studentId: students.id,
      studentName: students.name,
      studentCode: students.studentCode,
      studentImage: users.image,
      gender: students.gender,
      totalOverdue: sql<string>`COALESCE(SUM(${installments.balance}), 0)`,
      oldestDueDate: sql<string>`MIN(${installments.dueDate})`,
    }).from(installments)
      .innerJoin(students, eq(installments.studentId, students.id))
      .leftJoin(users, eq(students.userId, users.id))
      .where(and(lt(installments.dueDate, today), gt(installments.balance, '0')))
      .groupBy(students.id, students.name, students.studentCode, users.image, students.gender)
      .orderBy(sql`MIN(${installments.dueDate}) ASC`)
      .limit(limit);

    return rows.map((row) => {
      const oldestDueDate = formatDateOnly(row.oldestDueDate);
      return {
        studentId: row.studentId,
        studentName: row.studentName,
        studentCode: row.studentCode,
        studentImage: row.studentImage,
        gender: row.gender,
        totalOverdue: Number(row.totalOverdue ?? 0),
        daysOverdue: oldestDueDate ? daysBetween(oldestDueDate, today) : 0,
        oldestDueDate: row.oldestDueDate,
      };
    });
  }

  /** Detailed AR aging per student — one row per student with all four buckets. */
  async getAgingDetail() {
    const today = businessToday();
    const installments = this.yearInstallments();
    const rows = await this.db.select({
      studentId: students.id,
      studentName: students.name,
      studentCode: students.studentCode,
      ...agingBuckets(installments.dueDate, installments.balance, today),
      total: sql<string>`COALESCE(SUM(${installments.balance}), 0)`,
    }).from(installments)
      .innerJoin(students, eq(installments.studentId, students.id))
      .where(gt(installments.balance, '0'))
      .groupBy(students.id, students.name, students.studentCode)
      .orderBy(sql`SUM(${installments.balance}) DESC`);

    return rows.map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
      studentCode: row.studentCode,
      current: Number(row.current ?? 0),
      d1_30: Number(row.d1_30 ?? 0),
      d31_60: Number(row.d31_60 ?? 0),
      d60plus: Number(row.d60plus ?? 0),
      total: Number(row.total ?? 0),
    }));
  }

  /** What was due by today on the selected fee year's installments, and what completed receipts paid on them. */
  async getCollectionTotals() {
    const installments = this.yearInstallments();
    const [row] = await this.db.select({
      due: sql<string>`COALESCE(SUM(${installments.amount}), 0)`,
      paid: sql<string>`COALESCE(SUM(${installments.paid}), 0)`,
    }).from(installments)
      .where(lte(installments.dueDate, businessToday()));

    return { due: Number(row?.due ?? 0), paid: Number(row?.paid ?? 0) };
  }

  /** Receipts in, and expenses plus paid payroll out, over an inclusive date range. */
  async getCashTotals(from: string, to: string) {
    const [incomeRow] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .where(this.receiptsIn(from, to));

    const [expensesRow] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(this.expensesIn(from, to));

    // Payroll is a separate cash-out source (payslips, not expenses).
    const [payrollRow] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${payslips.netAmount}), 0)` })
      .from(payslips)
      .where(this.payrollIn(from, to));

    return {
      income: Number(incomeRow?.total ?? 0),
      expenses: Number(expensesRow?.total ?? 0) + Number(payrollRow?.total ?? 0),
    };
  }

  /** Cash in and out for each month of the selected year's reporting interval. */
  async getMonthlyCash() {
    const { reportingStartsOn: from, reportingEndsOn: to } = this.year;

    const incomeMonth = sql<string>`TO_CHAR(${cashDate}, 'YYYY-MM')`;
    const incomeRows = await this.db
      .select({ month: incomeMonth, total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .where(this.receiptsIn(from, to))
      .groupBy(incomeMonth);

    const expenseMonth = sql<string>`TO_CHAR(${expenses.expenseDate}, 'YYYY-MM')`;
    const expenseRows = await this.db
      .select({ month: expenseMonth, total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(this.expensesIn(from, to))
      .groupBy(expenseMonth);

    const payrollMonth = sql<string>`TO_CHAR(${payslips.paymentDate}, 'YYYY-MM')`;
    const payslipRows = await this.db
      .select({ month: payrollMonth, total: sql<string>`COALESCE(SUM(${payslips.netAmount}), 0)` })
      .from(payslips)
      .where(this.payrollIn(from, to))
      .groupBy(payrollMonth);

    const incomeMap = new Map(incomeRows.map((r) => [r.month, Number(r.total)]));
    const expenseMap = new Map(expenseRows.map((r) => [r.month, Number(r.total)]));
    // Fold paid payroll into the cash-out series alongside expenses.
    for (const r of payslipRows) {
      expenseMap.set(r.month, (expenseMap.get(r.month) ?? 0) + Number(r.total));
    }

    return monthsBetween(from, to).map((key) => ({
      month: key,
      income: incomeMap.get(key) ?? 0,
      expenses: expenseMap.get(key) ?? 0,
    }));
  }

  /** The latest completed receipts whose cash date falls in the selected year. */
  async getRecentPayments(limit: number) {
    const rows = await this.db
      .select({
        paymentId: payments.id,
        studentId: payments.studentId,
        studentName: students.name,
        amount: payments.amount,
        method: payments.paymentMethod,
        paidAt: payments.paymentDate,
      })
      .from(payments)
      .leftJoin(students, eq(payments.studentId, students.id))
      .where(this.receiptsIn(this.year.reportingStartsOn, this.year.reportingEndsOn))
      .orderBy(desc(cashDate), desc(payments.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      paymentId: r.paymentId,
      studentId: r.studentId,
      studentName: r.studentName,
      amount: Number(r.amount ?? 0),
      method: r.method,
      paidAt: r.paidAt,
    }));
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  /** Paid expenses by category, and paid payroll, over the selected year's reporting interval. */
  async getExpenseBreakdown() {
    const { reportingStartsOn: from, reportingEndsOn: to } = this.year;

    const rows = await this.db
      .select({
        category: expenses.category,
        total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
        count: sql<string>`COUNT(*)`,
      })
      .from(expenses)
      .where(this.expensesIn(from, to))
      .groupBy(expenses.category)
      .orderBy(sql`SUM(${expenses.amount}) DESC`);

    // Payroll lives in payslips, not expenses — surface it as its own breakdown bucket.
    const [payrollRow] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${payslips.netAmount}), 0)`,
        count: sql<string>`COUNT(*)`,
      })
      .from(payslips)
      .where(this.payrollIn(from, to));

    const breakdown = rows.map((r) => ({
      category: r.category,
      total: Number(r.total ?? 0),
      count: Number(r.count ?? 0),
    }));

    const payrollTotal = Number(payrollRow?.total ?? 0);
    if (payrollTotal > 0) {
      breakdown.push({
        category: 'payroll',
        total: payrollTotal,
        count: Number(payrollRow?.count ?? 0),
      });
    }

    return breakdown.sort((a, b) => b.total - a.total);
  }

  /**
   * Collection rate (paid / due) per class for the selected year. The class
   * is the one the student last sat in that year, from the year's dated
   * placements. Only the active year may fall back to a student's current
   * class, which is that year's class; for any other year the current class
   * would be a false one, so an undated student counts under "No class".
   */
  async getCollectionByClass(isActiveYear: boolean) {
    const installments = this.yearInstallments();

    // One placement per enrollment, so a transfer does not count a fee twice.
    const lastPlacement = this.db.selectDistinctOn(
      [studentEnrollmentPlacements.enrollmentId], {
        enrollmentId: studentEnrollmentPlacements.enrollmentId,
        classId: studentEnrollmentPlacements.classId,
      },
    ).from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .where(eq(studentEnrollments.academicYearId, this.year.id))
      .orderBy(
        studentEnrollmentPlacements.enrollmentId,
        desc(studentEnrollmentPlacements.validFrom),
        desc(studentEnrollmentPlacements.id),
      ).as('collection_last_placement');
    const yearClassId = isActiveYear
      ? sql`COALESCE(${lastPlacement.classId}, ${students.classId})`
      : lastPlacement.classId;

    const rows = await this.db
      .select({
        classId: classes.id,
        className: classes.name,
        due: sql<string>`COALESCE(SUM(${installments.amount}), 0)`,
        paid: sql<string>`COALESCE(SUM(${installments.paid}), 0)`,
        studentCount: sql<string>`COUNT(DISTINCT ${students.id})`,
      })
      .from(installments)
      .innerJoin(students, eq(installments.studentId, students.id))
      .leftJoin(studentEnrollments, and(
        eq(studentEnrollments.studentId, students.id),
        eq(studentEnrollments.academicYearId, this.year.id),
      ))
      .leftJoin(lastPlacement, eq(lastPlacement.enrollmentId, studentEnrollments.id))
      .leftJoin(classes, and(eq(classes.id, yearClassId), eq(classes.academicYear, this.year.label)))
      .where(lte(installments.dueDate, businessToday()))
      .groupBy(classes.id, classes.name)
      .orderBy(classes.name);

    return rows.map((r) => {
      const due  = Number(r.due ?? 0);
      const paid = Number(r.paid ?? 0);
      return {
        classId: r.classId,
        className: r.className ?? 'No class',
        due,
        paid,
        rate: due > 0 ? (paid / due) * 100 : 0,
        studentCount: Number(r.studentCount ?? 0),
      };
    });
  }
}
