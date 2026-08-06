import { boolean, date, integer, pgEnum, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import {
  assignedByRef,
  createRef,
  idField,
  moneyField,
  timestamps,
} from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { feeTypeRef } from '../feeTypes/feeTypeSchema';
import { studentRef } from '../../students/studentSchema';

export const scheduleEnum = pgEnum('schedule', getEnumValues('schedule'));
export const feeStatusEnum = pgEnum('feeStatus', getEnumValues('feeStatus'));
export const feeInstallmentStatusEnum = pgEnum('feeInstallmentStatus', getEnumValues('feeInstallmentStatus'));

export const fees = pgTable('fees', {
  id: idField(10),
  studentId: studentRef(),
  feeTypeId: feeTypeRef(),
  schedule: scheduleEnum('schedule').default('oneTime'),
  academicYear: text('academic_year').notNull(),
  baseAmount: moneyField('base_amount').notNull(),
  grossAmount: moneyField('gross_amount').notNull(),
  netAmount: moneyField('net_amount').notNull(),
  paidAmount: moneyField('paid_amount').default('0'),
  discountAmount: moneyField('discount_amount').default('0'),
  discountReason: text('discount_reason').default(''),
  effectiveDate: date('effective_date'),
  status: feeStatusEnum('status').notNull().default('pending'),
  assignedBy: assignedByRef(),
  notes: text('notes'),
  ...timestamps,
}, (table) => ({
  studentFeeTypeAcademicYearUnique: uniqueIndex('fees_student_fee_type_academic_year_unique')
    .on(table.studentId, table.feeTypeId, table.academicYear),
}));

export const feeRef = createRef('fee_id', () => fees.id);

export const feeInstallments = pgTable('fee_installments', {
  id: idField(10),
  feeId: feeRef(),
  number: integer('number').notNull(),
  dueDate: date('due_date').notNull(),
  amount: moneyField('amount').notNull(),
  paidAmount: moneyField('paid_amount').default('0'),
  status: feeInstallmentStatusEnum('status').default('pending').notNull(),
  ...timestamps,
});

export const feeInstallmentRef = createRef('installment_id', () => feeInstallments.id);
