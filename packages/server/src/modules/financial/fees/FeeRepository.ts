import { Repository } from '@server/najm';
import { eq, desc, asc, and, count, inArray, sql, sum, avg } from 'drizzle-orm';
import { fees, feeInstallments, feeTypes, paymentAllocations, payments, students, classes, sections, users } from '@server/database/schema';
import { DB } from '@server/database/db';
import { alias } from 'drizzle-orm/pg-core';
import { getBusinessDate, jsonAgg } from '@server/shared';
import { formatDateOnly } from '../utils/dateOnly';
import {
  getAvgPaymentAmount,
  getFeeBaseFields,
  getFeeComputedFields,
  getFeeRelations,
  getLastPaymentDate,
  getMaxCreatedAt,
  getNetAmountSum,
  getPaidInstallments,
  getPaymentCount,
  getStatusCount,
  getTotalDiscountSum,
  getTotalDue,
  getTotalDueSum,
  getTotalFeesCount,
  getTotalInstallments,
  getTotalOverdueAmount,
  getTotalPaidSum,
  getTotalUnpaidAmount
} from './FeeUtils';

@Repository()
export class FeeRepository {
  declare db: DB;

  // ============================================
  // Shared Field Builders
  // ============================================


  // ============================================
  // Query Builders
  // ============================================

  private buildFeeQuery() {
    const assignerUser = alias(users, 'assigner_user');

    return this.db
      .select({
        ...getFeeBaseFields(),
        totalDue: getTotalDue().as('total_due'),
        totalInstallments: getTotalInstallments().as('total_installments'),
        paidInstallments: getPaidInstallments().as('paid_installments'),
        paymentCount: getPaymentCount().as('payment_count'),

        student: {
          id: students.id,
          name: students.name,
          studentCode: students.studentCode,
          image: users.image,
        },
        feeType: {
          id: feeTypes.id,
          name: feeTypes.name,
          category: feeTypes.category,
          description: feeTypes.description,
          amount: feeTypes.amount,
        },
        class: {
          id: classes.id,
          name: classes.name,
        },
        section: {
          id: sections.id,
          name: sections.name,
        },
        assigner: {
          id: assignerUser.id,
          email: assignerUser.email,
          image: assignerUser.image,
        },
        ...getFeeRelations(),
      })
      .from(fees)
      .leftJoin(students, eq(fees.studentId, students.id))
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(feeTypes, eq(fees.feeTypeId, feeTypes.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .leftJoin(assignerUser, eq(fees.assignedBy, assignerUser.id));
  }

  // ============================================
  // Public Methods
  // ============================================

  async getAll() {
    const result = await this.db
      .select({
        studentId: students.id,
        studentName: students.name,
        studentCode: students.studentCode,
        studentImage: users.image,
        classId: classes.id,
        className: classes.name,
        sectionId: sections.id,
        sectionName: sections.name,
        totalFees: getTotalFeesCount().as('totalFees'),
        netAmount: getNetAmountSum().as('netAmount'),
        totalPaid: getTotalPaidSum().as('totalPaid'),
        totalDiscount: getTotalDiscountSum().as('totalDiscount'),
        totalDue: getTotalDueSum().as('totalDue'),
        paidCount: getStatusCount('paid').as('paidCount'),
        pendingCount: getStatusCount('pending').as('pendingCount'),
        partiallyPaidCount: getStatusCount('partiallyPaid').as('partiallyPaidCount'),
        overdueCount: getStatusCount('overdue').as('overdueCount'),
        fees: jsonAgg({
          id: fees.id,
          feeTypeName: feeTypes.name,
        }).as('fees'),
      })
      .from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .leftJoin(fees, eq(fees.studentId, students.id))
      .leftJoin(feeTypes, eq(fees.feeTypeId, feeTypes.id))
      .groupBy(students.id, students.name, students.studentCode, users.image, classes.id, classes.name, sections.id, sections.name)
      .orderBy(desc(getMaxCreatedAt()));

    return result.map(student => ({
      student: {
        id: student.studentId,
        name: student.studentName,
        studentCode: student.studentCode,
        image: student.studentImage,
      },
      class: {
        id: student.classId,
        name: student.className,
      },
      section: {
        id: student.sectionId,
        name: student.sectionName,
      },
      totalFees: student.totalFees,
      netAmount: student.netAmount,
      totalPaid: student.totalPaid,
      totalDiscount: student.totalDiscount,
      totalDue: student.totalDue,
      paidCount: student.paidCount,
      pendingCount: student.pendingCount,
      partiallyPaidCount: student.partiallyPaidCount,
      overdueCount: student.overdueCount,
      fees: student.fees || []
    }));
  }

  async getByIds(ids) {
    if (!ids || ids.length === 0) return [];

    return await this.buildFeeQuery()
      .where(inArray(fees.id, ids))
      .orderBy(desc(fees.createdAt));
  }

  async getById(id: string) {
    const [fee] = await this.buildFeeQuery()
      .where(eq(fees.id, id))
      .limit(1);

    if (fee) {
      return {
        ...fee,
        installments: fee.installments || [],
        payments: fee.payments || [],
      }
    }

    return null;
  }

  async getByStudent(studentId: string) {
    // Get overview data
    const [overview] = await this.db
      .select({
        studentId: students.id,
        studentName: students.name,
        studentCode: students.studentCode,
        studentImage: users.image,
        classId: classes.id,
        className: classes.name,
        sectionId: sections.id,
        sectionName: sections.name,

        totalFees: getTotalFeesCount().as('totalFees'),
        netAmount: getNetAmountSum().as('netAmount'),
        totalPaid: getTotalPaidSum().as('totalPaid'),
        totalDiscount: getTotalDiscountSum().as('totalDiscount'),
        totalDue: getTotalDueSum().as('totalDue'),

        paidCount: getStatusCount('paid').as('paidCount'),
        pendingCount: getStatusCount('pending').as('pendingCount'),
        overdueCount: getStatusCount('overdue').as('overdueCount'),

        totalOverdueAmount: getTotalOverdueAmount().as('totalOverdueAmount'),
        totalUnpaidAmount: getTotalUnpaidAmount().as('totalUnpaidAmount'),
        lastPayment: getLastPaymentDate().as('lastPayment'),
        avgPaymentAmount: getAvgPaymentAmount().as('avgPaymentAmount'),
      })
      .from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .leftJoin(fees, eq(fees.studentId, students.id))

      .where(eq(students.id, studentId))
      .groupBy(students.id, students.name, students.studentCode, users.image, classes.id, classes.name, sections.id, sections.name);

    if (!overview) return null;

    const feesList = await this.db
      .select({
        ...getFeeBaseFields(),
        ...getFeeComputedFields(),
        ...getFeeRelations(),

        feeTypeName: feeTypes.name,
        feeTypeCategory: feeTypes.category,
        feeTypeAmount: feeTypes.amount,
        assignedBy: fees.assignedBy,
        assignerEmail: sql`${users.email}`.as('assignerEmail'),
      })
      .from(fees)
      .leftJoin(feeTypes, eq(fees.feeTypeId, feeTypes.id))
      .leftJoin(users, eq(fees.assignedBy, users.id))
      .where(eq(fees.studentId, studentId))
      .orderBy(desc(fees.academicYear), desc(fees.createdAt));

    const totalOverdueInstallments = feesList.reduce(
      (sum, fee) => sum + Number(fee.overdueInstallments || 0),
      0,
    );
    const hasOverdueFees = totalOverdueInstallments > 0;
    const alertMessage = hasOverdueFees
      ? `${totalOverdueInstallments} Overdue Payments `
      : '';

    return {
      student: {
        id: overview.studentId,
        name: overview.studentName,
        studentCode: overview.studentCode,
        image: overview.studentImage,
      },
      assignment: {
        class: {
          id: overview.classId,
          name: overview.className,
        },
        section: {
          id: overview.sectionId,
          name: overview.sectionName,
        },
      },
      summary: {
        totalFees: overview.totalFees,
        netAmount: overview.netAmount,
        totalPaid: overview.totalPaid,
        totalDiscount: overview.totalDiscount,
        totalDue: overview.totalDue,
        paidCount: overview.paidCount,
        pendingCount: overview.pendingCount,
        overdueCount: overview.overdueCount,
        totalOverdueAmount: overview.totalOverdueAmount,
        totalUnpaidAmount: overview.totalUnpaidAmount,
        avgPaymentAmount: overview.avgPaymentAmount,
        lastPayment: overview.lastPayment,

      },
      alerts: {
        hasOverdueFees,
        overdueCount: totalOverdueInstallments,
        message: alertMessage,
      },
      fees: feesList.map(fee => {
        const grossAmount = Number(fee.grossAmount) || 0;
        const netAmount = Number(fee.netAmount) || 0;
        const paidAmount = Number(fee.paidAmount) || 0;
        const discountAmount = Number(fee.discountAmount) || 0;
        const balance = netAmount - paidAmount;

        const getCategoryIcon = (category: string): string => {
          const iconMap: Record<string, string> = {
            tuition: '🎓',
            registration: '📝',
            library: '📚',
            lab: '🔬',
            sports: '⚽',
            transport: '🚌',
            meal: '🍽️',
            cafeteria: '🍽️',
            hostel: '🏠',
            exam: '📄',
            activity: '🎨',
            misc: '📋',
          };
          return iconMap[category?.toLowerCase()] || '💰';
        };

        return {
          id: fee.id,
          name: fee.feeTypeName,
          feeTypeId: fee.feeTypeId,
          studentId: overview.studentId,
          icon: getCategoryIcon(fee.feeTypeCategory),
          type: fee.feeTypeCategory,
          schedule: fee.schedule,
          academicYear: fee.academicYear,
          baseAmount: Number(fee.baseAmount) || 0,
          grossAmount,
          netAmount,
          paidAmount,
          discount: discountAmount,
          balance,
          status: fee.status,
          notes: fee.notes,
          assignedBy: fee.assignedBy,
          assignerEmail: fee.assignerEmail,
          createdAt: fee.createdAt,
          updatedAt: fee.updatedAt,
          totalInstallments: fee.totalInstallments,
          paidInstallments: fee.paidInstallments,
          overdueInstallments: fee.overdueInstallments,
          paymentCount: fee.paymentCount,
          installments: fee.installments || [],
          payments: fee.payments || [],
        };
      })
    };
  }

  async getByStudentAndYear(studentId, academicYear, feeTypeId) {
    const [fee] = await this.buildFeeQuery()
      .where(
        and(
          eq(fees.studentId, studentId),
          eq(fees.academicYear, academicYear),
          eq(fees.feeTypeId, feeTypeId)
        )
      )
      .limit(1);

    return fee;
  }

  async getByStudentAndFeeType(studentId, feeTypeId) {
    const [fee] = await this.buildFeeQuery()
      .where(
        and(
          eq(fees.studentId, studentId),
          eq(fees.feeTypeId, feeTypeId)
        )
      )
      .orderBy(desc(fees.academicYear), desc(fees.createdAt))
      .limit(1);

    return fee;
  }

  async create(data) {
    const [newFee] = await this.db
      .insert(fees)
      .values(data)
      .returning();
    return newFee;
  }

  async update(id, data) {
    const [updatedFee] = await this.db
      .update(fees)
      .set(data)
      .where(eq(fees.id, id))
      .returning();
    return updatedFee;
  }

  async delete(id) {
    const [deletedFee] = await this.db
      .delete(fees)
      .where(eq(fees.id, id))
      .returning();
    return deletedFee;
  }

  async deleteAll() {
    const deletedFees = await this.db
      .delete(fees)
      .returning();

    return {
      deletedCount: deletedFees.length,
      deletedFees: deletedFees
    };
  }

  async getAllocatedTotal(feeId: string) {
    const [result] = await this.db
      .select({
        total: sum(paymentAllocations.amount),
      })
      .from(paymentAllocations)
      .leftJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .where(
        and(
          eq(paymentAllocations.feeId, feeId),
          eq(payments.status, 'completed')
        )
      );

    return Number(result?.total) || 0;
  }

  async getFeeIdsByStudent(studentId: string): Promise<string[]> {
    const result = await this.db
      .select({ id: fees.id })
      .from(fees)
      .where(eq(fees.studentId, studentId));

    return result.map(fee => fee.id);
  }

  async getOverdue() {
    const today = formatDateOnly(getBusinessDate());
    const aliasUser = alias(users, 'alias_user');

    return await this.db
      .select({
        id: fees.id,
        studentId: fees.studentId,
        feeTypeId: fees.feeTypeId,
        schedule: fees.schedule,
        academicYear: fees.academicYear,
        baseAmount: fees.baseAmount,
        grossAmount: fees.grossAmount,
        netAmount: fees.netAmount,
        paidAmount: fees.paidAmount,
        discountAmount: fees.discountAmount,
        status: fees.status,
        notes: fees.notes,
        createdAt: fees.createdAt,
        updatedAt: fees.updatedAt,
        student: {
          id: students.id,
          name: students.name,
          studentCode: students.studentCode,
          image: aliasUser.image,
        },
        feeType: {
          id: feeTypes.id,
          name: feeTypes.name,
          category: feeTypes.category,
          amount: feeTypes.amount,
        },
        class: {
          id: classes.id,
          name: classes.name,
        },
        section: {
          id: sections.id,
          name: sections.name,
        },
        overdueInstallments: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${feeInstallments}
          WHERE ${feeInstallments.feeId} = ${fees.id}
          AND ${feeInstallments.status} != 'paid'
          AND ${feeInstallments.dueDate} < ${today}
        )`.as('overdue_installments'),
      })
      .from(fees)
      .leftJoin(students, eq(fees.studentId, students.id))
      .leftJoin(aliasUser, eq(students.userId, aliasUser.id))
      .leftJoin(feeTypes, eq(fees.feeTypeId, feeTypes.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .where(
        sql`EXISTS (
          SELECT 1 FROM ${feeInstallments}
          WHERE ${feeInstallments.feeId} = ${fees.id}
          AND ${feeInstallments.dueDate} < ${today}
          AND ${feeInstallments.status} != 'paid'
        )`
      )
      .orderBy(desc(fees.createdAt));
  }

  async getOverdueSummary() {
    const today = formatDateOnly(getBusinessDate());
    const [result] = await this.db
      .select({
        overdueCount: sql<number>`COUNT(DISTINCT ${fees.id})`,
        overdueAmount: sql<number>`COALESCE(SUM(${fees.netAmount}::numeric - ${fees.paidAmount}::numeric), 0)`,
        affectedStudents: sql<number>`COUNT(DISTINCT ${fees.studentId})`,
      })
      .from(fees)
      .where(
        sql`EXISTS (
          SELECT 1 FROM ${feeInstallments}
          WHERE ${feeInstallments.feeId} = ${fees.id}
          AND ${feeInstallments.dueDate} < ${today}
          AND ${feeInstallments.status} != 'paid'
        )`
      );

    return {
      overdueCount: Number(result.overdueCount),
      overdueAmount: Number(result.overdueAmount),
      affectedStudents: Number(result.affectedStudents),
    };
  }

  async getOverdueByStudent(studentId: string) {
    const today = formatDateOnly(getBusinessDate());
    return await this.db
      .select({
        id: fees.id,
        studentId: fees.studentId,
        feeTypeId: fees.feeTypeId,
        schedule: fees.schedule,
        academicYear: fees.academicYear,
        baseAmount: fees.baseAmount,
        grossAmount: fees.grossAmount,
        netAmount: fees.netAmount,
        paidAmount: fees.paidAmount,
        discountAmount: fees.discountAmount,
        status: fees.status,
        notes: fees.notes,
        createdAt: fees.createdAt,
        updatedAt: fees.updatedAt,
        feeType: {
          id: feeTypes.id,
          name: feeTypes.name,
          category: feeTypes.category,
          amount: feeTypes.amount,
        },
      })
      .from(fees)
      .leftJoin(feeTypes, eq(fees.feeTypeId, feeTypes.id))
      .where(
        and(
          eq(fees.studentId, studentId),
          sql`EXISTS (
            SELECT 1 FROM ${feeInstallments}
            WHERE ${feeInstallments.feeId} = ${fees.id}
            AND ${feeInstallments.dueDate} < ${today}
            AND ${feeInstallments.status} != 'paid'
          )`
        )
      )
      .orderBy(desc(fees.createdAt));
  }
}
