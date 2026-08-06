import { feeInstallments, fees, paymentAllocations, payments, students } from '@server/database/schema';
import { jsonAggSubquery } from '@server/shared';
import { asc, eq, sql } from 'drizzle-orm';

export const getTotalFeesCount = () => {
   return sql`COUNT(${fees.id})::int`;
};

export const getNetAmountSum = () => {
   return sql`COALESCE(SUM(${fees.netAmount}::numeric), 0)::text`;
};

export const getTotalPaidSum = () => {
   return sql`COALESCE(SUM(${fees.paidAmount}::numeric), 0)::text`;
};

export const getTotalDiscountSum = () => {
   return sql`COALESCE(SUM(${fees.discountAmount}::numeric), 0)::text`;
};

export const getTotalDueSum = () => {
   return sql`COALESCE(SUM((${fees.netAmount}::numeric - ${fees.paidAmount}::numeric)), 0)::text`;
};

export const getStatusCount = (status: 'paid' | 'pending' | 'overdue' | 'partiallyPaid') => {
   return sql`COUNT(CASE WHEN ${fees.status} = ${status} THEN 1 END)::int`;
};

export const getMaxCreatedAt = () => {
   return sql`MAX(${fees.createdAt})`;
};

export const getTotalDue = () => {
   return sql`(${fees.netAmount}::numeric - ${fees.paidAmount}::numeric)::text`;
};

export const getTotalInstallments = () => {
   return sql`(
    SELECT COUNT(*)::int 
    FROM ${feeInstallments} 
    WHERE ${feeInstallments.feeId} = ${fees.id}
    AND ${feeInstallments.status} != 'cancelled'
  )`;
};

export const getPaidInstallments = () => {
   return sql`(
    SELECT COUNT(*)::int 
    FROM ${feeInstallments} 
    WHERE ${feeInstallments.feeId} = ${fees.id} 
    AND ${feeInstallments.status} = 'paid'
  )`;
};

export const getPaymentCount = () => {
   return sql`(
    SELECT COUNT(DISTINCT ${paymentAllocations.paymentId})::int
    FROM ${paymentAllocations}
    WHERE ${paymentAllocations.feeId} = ${fees.id}
  )`;
};

export const getPaymentsJson = () => {
   return sql`COALESCE((
    SELECT json_agg(json_build_object(
      'id', ${payments.id},
      'amount', ${payments.amount},
      'paymentDate', ${payments.paymentDate},
      'paymentMethod', ${payments.paymentMethod},
      'checkNumber', ${payments.checkNumber},
      'checkDueDate', ${payments.checkDueDate},
      'transactionRef', ${payments.transactionRef},
      'receiptNumber', ${payments.receiptNumber},
      'status', ${payments.status},
      'processedBy', ${payments.processedBy}
    ) ORDER BY ${payments.paymentDate} DESC)
    FROM ${payments}
    INNER JOIN ${paymentAllocations} ON ${paymentAllocations.paymentId} = ${payments.id}
    WHERE ${paymentAllocations.feeId} = ${fees.id}
  ), '[]'::json)`;
};

export const getTotalOverdueAmount = () => {
   return sql`
    COALESCE(
      (SELECT SUM(${feeInstallments.amount}::numeric)
       FROM ${feeInstallments}
       INNER JOIN ${fees} f ON ${feeInstallments.feeId} = f.id
       WHERE f.student_id = ${students.id}
       AND ${feeInstallments.status} = 'overdue'),
      0
    )::text
  `;
};

export const getTotalUnpaidAmount = () => {
   return sql`
    COALESCE(
      (SELECT SUM(${feeInstallments.amount}::numeric)
       FROM ${feeInstallments}
       INNER JOIN ${fees} f ON ${feeInstallments.feeId} = f.id
       WHERE f.student_id = ${students.id}
       AND ${feeInstallments.status} NOT IN ('paid', 'cancelled')),
      0
    )::text
  `;
};

export const getOverdueInstallments = () => {
   return sql`(
    SELECT COUNT(*)::int 
    FROM ${feeInstallments} 
    WHERE ${feeInstallments.feeId} = ${fees.id} 
    AND ${feeInstallments.status} = 'overdue'
  )`;
};


export function getFeeBaseFields() {
   return {
      id: fees.id,
      studentId: fees.studentId,
      feeTypeId: fees.feeTypeId,
      schedule: fees.schedule,
      academicYear: fees.academicYear,
      effectiveDate: fees.effectiveDate,
      baseAmount: fees.baseAmount,
      grossAmount: fees.grossAmount,
      netAmount: fees.netAmount,
      paidAmount: fees.paidAmount,
      discountAmount: fees.discountAmount,
      status: fees.status,
      notes: fees.notes,
      createdAt: fees.createdAt,
      updatedAt: fees.updatedAt,
   };
}

export function getFeeComputedFields() {
   return {
      paidAmount: getPaidAmount().as('paid_amount'),
      status: getFeeStatus().as('status'),
      totalDue: getTotalDue().as('total_due'),
      totalInstallments: getTotalInstallments().as('total_installments'),
      paidInstallments: getPaidInstallments().as('paid_installments'),
      overdueInstallments: getOverdueInstallments().as('overdue_installments'),
      paymentCount: getPaymentCount().as('payment_count'),
   };
}

export function getFeeRelations() {
   return {
      installments: jsonAggSubquery({
         id: feeInstallments.id,
         number: feeInstallments.number,
         dueDate: feeInstallments.dueDate,
         amount: feeInstallments.amount,
         paidAmount: feeInstallments.paidAmount,
         completedAmount: sql`COALESCE((
            SELECT SUM(${paymentAllocations.amount}::numeric)
            FROM ${paymentAllocations}
            INNER JOIN ${payments} ON ${paymentAllocations.paymentId} = ${payments.id}
            WHERE ${paymentAllocations.installmentId} = ${feeInstallments.id}
            AND ${payments.status} = 'completed'
         ), 0)::text`,
         reservedAmount: sql`COALESCE((
            SELECT SUM(${paymentAllocations.amount}::numeric)
            FROM ${paymentAllocations}
            INNER JOIN ${payments} ON ${paymentAllocations.paymentId} = ${payments.id}
            WHERE ${paymentAllocations.installmentId} = ${feeInstallments.id}
            AND ${payments.status} IN ('pending', 'deposited')
         ), 0)::text`,
         availableAmount: sql`GREATEST(
            ${feeInstallments.amount}::numeric
            - COALESCE((
               SELECT SUM(${paymentAllocations.amount}::numeric)
               FROM ${paymentAllocations}
               INNER JOIN ${payments} ON ${paymentAllocations.paymentId} = ${payments.id}
               WHERE ${paymentAllocations.installmentId} = ${feeInstallments.id}
               AND ${payments.status} = 'completed'
            ), 0)
            - COALESCE((
               SELECT SUM(${paymentAllocations.amount}::numeric)
               FROM ${paymentAllocations}
               INNER JOIN ${payments} ON ${paymentAllocations.paymentId} = ${payments.id}
               WHERE ${paymentAllocations.installmentId} = ${feeInstallments.id}
               AND ${payments.status} IN ('pending', 'deposited')
            ), 0),
            0
         )::text`,
         paidDate: sql`(
            SELECT MAX(${payments.paymentDate})
            FROM ${paymentAllocations}
            INNER JOIN ${payments} ON ${paymentAllocations.paymentId} = ${payments.id}
            WHERE ${paymentAllocations.installmentId} = ${feeInstallments.id}
            AND ${payments.status} = 'completed'
         )`,
         status: feeInstallments.status,
      }, feeInstallments, eq(feeInstallments.feeId, fees.id), asc(feeInstallments.number)).as('installments'),
      payments: getPaymentsJson().as('payments'),
   };
}

export const getPaidAmount = () => {
   return sql`
    COALESCE(
      (SELECT SUM(${paymentAllocations.amount}::numeric)
       FROM ${paymentAllocations}
       INNER JOIN ${payments} ON ${paymentAllocations.paymentId} = ${payments.id}
       WHERE ${paymentAllocations.feeId} = ${fees.id}
       AND ${payments.status} = 'completed'),
      0
    )::text
  `;
};

export const getFeeStatus = () => {
   return sql`
    CASE
      WHEN (
        SELECT COALESCE(SUM(${paymentAllocations.amount}::numeric), 0)
        FROM ${paymentAllocations}
        INNER JOIN ${payments} ON ${paymentAllocations.paymentId} = ${payments.id}
        WHERE ${paymentAllocations.feeId} = ${fees.id}
        AND ${payments.status} = 'completed'
      ) >= ${fees.netAmount}::numeric THEN 'paid'

      WHEN (
        SELECT COALESCE(SUM(${paymentAllocations.amount}::numeric), 0)
        FROM ${paymentAllocations}
        INNER JOIN ${payments} ON ${paymentAllocations.paymentId} = ${payments.id}
        WHERE ${paymentAllocations.feeId} = ${fees.id}
        AND ${payments.status} = 'completed'
      ) > 0 THEN 'partiallyPaid'

      WHEN EXISTS (
        SELECT 1 FROM ${feeInstallments}
        WHERE ${feeInstallments.feeId} = ${fees.id}
        AND ${feeInstallments.dueDate} < CURRENT_DATE
        AND ${feeInstallments.status} NOT IN ('paid', 'cancelled')
      ) THEN 'overdue'

      ELSE 'pending'
    END
  `;
};

export const getAvgPaymentAmount = () => {
   return sql`
    COALESCE(
   (SELECT ROUND(AVG(${payments.amount}::numeric), 2)
       FROM ${payments}
       INNER JOIN ${paymentAllocations} ON ${paymentAllocations.paymentId} = ${payments.id}
       INNER JOIN ${fees} ON ${paymentAllocations.feeId} = ${fees.id}
       WHERE ${fees.studentId} = ${students.id}
       AND ${payments.status} = 'completed'),
      0
    )::text
  `;
};

export const getLastPaymentDate = () => {
   return sql`
  (SELECT MAX(${payments.paymentDate})
   FROM ${payments}
   INNER JOIN ${paymentAllocations} ON ${paymentAllocations.paymentId} = ${payments.id}
   INNER JOIN ${fees} ON ${paymentAllocations.feeId} = ${fees.id}
   WHERE ${fees.studentId} = ${students.id}
   AND ${payments.status} = 'completed')
`;
};



