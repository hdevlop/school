import { Repository } from '../../../najm';
import { eq, desc, and, inArray, isNotNull, or, sql, sum } from 'drizzle-orm';
import { fees, feeInstallments, feeTypes, paymentAllocations, payments, students, classes, sections, users, studentEnrollments, studentEnrollmentPlacements } from '../../../database/schema';
import { DB } from '../../../database/db';
import { alias } from 'drizzle-orm/pg-core';
import { getBusinessDate, jsonAgg } from '../../../shared';
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

  // Every year's fees, one row per student with the student's current class.
  // An explicit all-year read: year-scoped lists use getAll.
  async getAllYears() {
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
          academicYear: fees.academicYear,
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

  async getAll(academicYearId: string, academicYear: string, studentId?: string) {
    // Pick one placement per enrollment before joining fees. Joining every
    // transfer would multiply each fee and inflate the financial aggregates.
    const lastPlacement = this.db.selectDistinctOn(
      [studentEnrollmentPlacements.enrollmentId], {
        enrollmentId: studentEnrollmentPlacements.enrollmentId,
        id: studentEnrollmentPlacements.id,
        classId: studentEnrollmentPlacements.classId,
        sectionId: studentEnrollmentPlacements.sectionId,
      },
    ).from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .where(eq(studentEnrollments.academicYearId, academicYearId))
      .orderBy(
        studentEnrollmentPlacements.enrollmentId,
        desc(studentEnrollmentPlacements.validFrom),
        desc(studentEnrollmentPlacements.id),
      ).as('fee_year_last_placement');

    const completedAllocatedForFee = sql`
      coalesce((
        select sum(${paymentAllocations.amount}::numeric)
        from ${paymentAllocations}
        inner join ${payments} on ${paymentAllocations.paymentId} = ${payments.id}
        where ${paymentAllocations.feeId} = ${fees.id}
          and ${payments.status} = 'completed'
      ), 0)
    `;

    const result = await this.db.select({
      studentId: students.id,
      studentName: students.name,
      studentCode: students.studentCode,
      studentImage: users.image,
      enrollmentId: studentEnrollments.id,
      placementId: lastPlacement.id,
      classId: classes.id,
      className: classes.name,
      sectionId: sections.id,
      sectionName: sections.name,
      totalFees: getTotalFeesCount().as('totalFees'),
      netAmount: getNetAmountSum().as('netAmount'),
      totalPaid: sql<string>`coalesce(sum(${completedAllocatedForFee}), 0)::text`.as('totalPaid'),
      totalDiscount: getTotalDiscountSum().as('totalDiscount'),
      totalDue: sql<string>`coalesce(sum(${fees.netAmount}::numeric - ${completedAllocatedForFee}), 0)::text`.as('totalDue'),
      paidCount: getStatusCount('paid').as('paidCount'),
      pendingCount: getStatusCount('pending').as('pendingCount'),
      partiallyPaidCount: getStatusCount('partiallyPaid').as('partiallyPaidCount'),
      overdueCount: getStatusCount('overdue').as('overdueCount'),
      fees: sql<Array<{ id: string; feeTypeName: string }>>`
        coalesce(json_agg(json_build_object('id', ${fees.id}, 'feeTypeName', ${feeTypes.name}))
          filter (where ${fees.id} is not null), '[]'::json)
      `.as('fees'),
    }).from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(studentEnrollments, and(
        eq(studentEnrollments.studentId, students.id),
        eq(studentEnrollments.academicYearId, academicYearId),
      ))
      .leftJoin(lastPlacement, eq(lastPlacement.enrollmentId, studentEnrollments.id))
      .leftJoin(classes, and(eq(lastPlacement.classId, classes.id), eq(classes.academicYear, academicYear)))
      .leftJoin(sections, and(eq(lastPlacement.sectionId, sections.id), eq(sections.classId, classes.id)))
      .leftJoin(fees, and(eq(fees.studentId, students.id), eq(fees.academicYear, academicYear)))
      .leftJoin(feeTypes, eq(fees.feeTypeId, feeTypes.id))
      // Keep a fee with unresolved enrollment visible, with unknown class.
      .where(and(
        studentId ? eq(students.id, studentId) : undefined,
        or(isNotNull(studentEnrollments.id), isNotNull(fees.id)),
      ))
      .groupBy(
        students.id, students.name, students.studentCode, users.image,
        studentEnrollments.id, lastPlacement.id,
        classes.id, classes.name, sections.id, sections.name,
      )
      .orderBy(desc(getMaxCreatedAt()), students.name);

    return result.map((student) => ({
      academicYear,
      student: {
        id: student.studentId,
        name: student.studentName,
        studentCode: student.studentCode,
        image: student.studentImage,
      },
      enrollmentId: student.enrollmentId,
      placementId: student.placementId,
      class: { id: student.classId, name: student.className },
      section: { id: student.sectionId, name: student.sectionName },
      totalFees: student.totalFees,
      netAmount: student.netAmount,
      totalPaid: student.totalPaid,
      totalDiscount: student.totalDiscount,
      totalDue: student.totalDue,
      paidCount: student.paidCount,
      pendingCount: student.pendingCount,
      partiallyPaidCount: student.partiallyPaidCount,
      overdueCount: student.overdueCount,
      fees: student.fees || [],
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

  private async listStudentFeeRows(studentId: string, academicYear?: string) {
    return this.db.select({
      ...getFeeBaseFields(),
      ...getFeeComputedFields(),
      ...getFeeRelations(),
      feeTypeName: feeTypes.name,
      feeTypeCategory: feeTypes.category,
      feeTypeAmount: feeTypes.amount,
      assignedBy: fees.assignedBy,
      assignerEmail: sql`${users.email}`.as('assignerEmail'),
    }).from(fees)
      .leftJoin(feeTypes, eq(fees.feeTypeId, feeTypes.id))
      .leftJoin(users, eq(fees.assignedBy, users.id))
      .where(and(eq(fees.studentId, studentId), academicYear ? eq(fees.academicYear, academicYear) : undefined))
      .orderBy(desc(fees.academicYear), desc(fees.createdAt));
  }

  // Every year's fees of one student: an explicit all-year read for trusted
  // callers (seeding, cross-year debt); year-scoped screens use getByStudent.
  async getByStudentAllYears(studentId: string) {
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

    const feesList = await this.listStudentFeeRows(studentId);
    return this.formatStudentFeeResponse(overview, feesList);
  }

  private formatStudentFeeResponse(
    overview: any,
    feesList: Awaited<ReturnType<FeeRepository['listStudentFeeRows']>>,
  ) {
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

  async getByStudent(studentId: string, academicYearId: string, academicYear: string) {
    const [annual] = await this.getAll(academicYearId, academicYear, studentId);
    if (!annual) return null;

    // These metrics must follow the fee year, including allocations made by a
    // receipt dated in another year. Money stays numeric in PostgreSQL here.
    const [metricsRows, feesList] = await Promise.all([
      this.db.select({
        totalOverdueAmount: sql<string>`coalesce((
          select sum(${feeInstallments.amount}::numeric)
          from ${feeInstallments}
          inner join ${fees} on ${feeInstallments.feeId} = ${fees.id}
          where ${fees.studentId} = ${studentId}
            and ${fees.academicYear} = ${academicYear}
            and ${feeInstallments.status} = 'overdue'
        ), 0)::text`,
        totalUnpaidAmount: sql<string>`coalesce((
          select sum(${feeInstallments.amount}::numeric)
          from ${feeInstallments}
          inner join ${fees} on ${feeInstallments.feeId} = ${fees.id}
          where ${fees.studentId} = ${studentId}
            and ${fees.academicYear} = ${academicYear}
            and ${feeInstallments.status} not in ('paid', 'cancelled')
        ), 0)::text`,
        avgPaymentAmount: sql<string>`coalesce((
          select round(avg(year_receipt_allocations.amount), 2)
          from (
            select sum(${paymentAllocations.amount}::numeric) as amount
            from ${paymentAllocations}
            inner join ${fees} on ${paymentAllocations.feeId} = ${fees.id}
            inner join ${payments} on ${paymentAllocations.paymentId} = ${payments.id}
            where ${fees.studentId} = ${studentId}
              and ${fees.academicYear} = ${academicYear}
              and ${payments.status} = 'completed'
            group by ${payments.id}
          ) year_receipt_allocations
        ), 0)::text`,
        lastPayment: sql<string | null>`(
          select max(${payments.paymentDate})
          from ${paymentAllocations}
          inner join ${fees} on ${paymentAllocations.feeId} = ${fees.id}
          inner join ${payments} on ${paymentAllocations.paymentId} = ${payments.id}
          where ${fees.studentId} = ${studentId}
            and ${fees.academicYear} = ${academicYear}
            and ${payments.status} = 'completed'
        )`,
      }).from(students).where(eq(students.id, studentId)).limit(1),
      this.listStudentFeeRows(studentId, academicYear),
    ]);

    const metrics = metricsRows[0];
    const response = this.formatStudentFeeResponse({
      studentId: annual.student.id,
      studentName: annual.student.name,
      studentCode: annual.student.studentCode,
      studentImage: annual.student.image,
      classId: annual.class.id,
      className: annual.class.name,
      sectionId: annual.section.id,
      sectionName: annual.section.name,
      totalFees: annual.totalFees,
      netAmount: annual.netAmount,
      totalPaid: annual.totalPaid,
      totalDiscount: annual.totalDiscount,
      totalDue: annual.totalDue,
      paidCount: annual.paidCount,
      pendingCount: annual.pendingCount,
      overdueCount: annual.overdueCount,
      totalOverdueAmount: metrics?.totalOverdueAmount ?? '0',
      totalUnpaidAmount: metrics?.totalUnpaidAmount ?? '0',
      avgPaymentAmount: metrics?.avgPaymentAmount ?? '0',
      lastPayment: metrics?.lastPayment ?? null,
    }, feesList);
    return {
      academicYear,
      enrollmentId: annual.enrollmentId,
      placementId: annual.placementId,
      ...response,
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

  async getOverdue(academicYearId: string, academicYear: string) {
    const today = formatDateOnly(getBusinessDate());
    const aliasUser = alias(users, 'overdue_year_user');
    const overdue = sql`EXISTS (
      SELECT 1 FROM ${feeInstallments}
      WHERE ${feeInstallments.feeId} = ${fees.id}
        AND ${feeInstallments.dueDate} < ${today}
        AND ${feeInstallments.status} NOT IN ('paid', 'cancelled')
    )`;
    const completedAllocated = sql<string>`coalesce((
      SELECT sum(${paymentAllocations.amount}::numeric)
      FROM ${paymentAllocations}
      INNER JOIN ${payments} ON ${paymentAllocations.paymentId} = ${payments.id}
      WHERE ${paymentAllocations.feeId} = ${fees.id}
        AND ${payments.status} = 'completed'
    ), 0)::text`;

    const rows = await this.db.select({
      id: fees.id,
      studentId: fees.studentId,
      feeTypeId: fees.feeTypeId,
      schedule: fees.schedule,
      academicYear: fees.academicYear,
      effectiveDate: fees.effectiveDate,
      baseAmount: fees.baseAmount,
      grossAmount: fees.grossAmount,
      netAmount: fees.netAmount,
      paidAmount: completedAllocated.as('completed_paid_amount'),
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
      overdueInstallments: sql<number>`(
        SELECT count(*)::int FROM ${feeInstallments}
        WHERE ${feeInstallments.feeId} = ${fees.id}
          AND ${feeInstallments.dueDate} < ${today}
          AND ${feeInstallments.status} NOT IN ('paid', 'cancelled')
      )`.as('overdue_installments'),
    }).from(fees)
      .leftJoin(students, eq(fees.studentId, students.id))
      .leftJoin(aliasUser, eq(students.userId, aliasUser.id))
      .leftJoin(feeTypes, eq(fees.feeTypeId, feeTypes.id))
      .where(and(eq(fees.academicYear, academicYear), overdue))
      .orderBy(desc(fees.createdAt));

    const studentIds = [...new Set(rows.map((row) => row.studentId).filter((id): id is string => !!id))];
    const placements = studentIds.length ? await this.db.select({
      studentId: studentEnrollments.studentId,
      classId: classes.id,
      className: classes.name,
      sectionId: sections.id,
      sectionName: sections.name,
      validFrom: studentEnrollmentPlacements.validFrom,
      validTo: studentEnrollmentPlacements.validTo,
    }).from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .innerJoin(classes, and(
        eq(studentEnrollmentPlacements.classId, classes.id),
        eq(classes.academicYear, academicYear),
      ))
      .innerJoin(sections, and(
        eq(studentEnrollmentPlacements.sectionId, sections.id),
        eq(sections.classId, classes.id),
      ))
      .where(and(
        eq(studentEnrollments.academicYearId, academicYearId),
        inArray(studentEnrollments.studentId, studentIds),
      ))
      .orderBy(desc(studentEnrollmentPlacements.validFrom), desc(studentEnrollmentPlacements.id)) : [];

    const placementsByStudent = new Map<string, typeof placements>();
    for (const placement of placements) {
      const list = placementsByStudent.get(placement.studentId) ?? [];
      list.push(placement);
      placementsByStudent.set(placement.studentId, list);
    }

    return rows.map((row) => {
      const placement = row.effectiveDate ? placementsByStudent.get(row.studentId)?.find((candidate) =>
        candidate.validFrom <= row.effectiveDate! &&
        (candidate.validTo === null || row.effectiveDate! < candidate.validTo)
      ) : undefined;
      return {
        ...row,
        class: { id: placement?.classId ?? null, name: placement?.className ?? null },
        section: { id: placement?.sectionId ?? null, name: placement?.sectionName ?? null },
      };
    });
  }

  async getOverdueSummary(academicYear: string) {
    const today = formatDateOnly(getBusinessDate());
    const [result] = await this.db.select({
      overdueCount: sql<number>`count(${fees.id})::int`,
      overdueAmount: sql<string>`coalesce(sum(greatest(
        "fees"."net_amount"::numeric - coalesce((
          SELECT sum("payment_allocations"."amount"::numeric)
          FROM ${paymentAllocations}
          INNER JOIN ${payments} ON "payment_allocations"."payment_id" = "payments"."id"
          WHERE "payment_allocations"."fee_id" = "fees"."id"
            AND "payments"."status" = 'completed'
        ), 0), 0)), 0)::text`,
      affectedStudents: sql<number>`count(distinct ${fees.studentId})::int`,
    }).from(fees).where(and(
      eq(fees.academicYear, academicYear),
      sql`EXISTS (
        SELECT 1 FROM ${feeInstallments}
        WHERE "fee_installments"."fee_id" = "fees"."id"
          AND "fee_installments"."due_date" < ${today}
          AND "fee_installments"."status" NOT IN ('paid', 'cancelled')
      )`,
    ));
    return {
      overdueCount: Number(result.overdueCount),
      overdueAmount: result.overdueAmount,
      affectedStudents: Number(result.affectedStudents),
    };
  }

  async getOverdueByStudent(studentId: string, academicYear: string) {
    const today = formatDateOnly(getBusinessDate());
    const paidAmount = sql<string>`coalesce((
      SELECT sum(${paymentAllocations.amount}::numeric)
      FROM ${paymentAllocations}
      INNER JOIN ${payments} ON ${paymentAllocations.paymentId} = ${payments.id}
      WHERE ${paymentAllocations.feeId} = ${fees.id}
        AND ${payments.status} = 'completed'
    ), 0)::text`;
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
        paidAmount,
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
          eq(fees.academicYear, academicYear),
          sql`EXISTS (
            SELECT 1 FROM ${feeInstallments}
            WHERE ${feeInstallments.feeId} = ${fees.id}
            AND ${feeInstallments.dueDate} < ${today}
            AND ${feeInstallments.status} NOT IN ('paid', 'cancelled')
          )`
        )
      )
      .orderBy(desc(fees.createdAt));
  }

}
