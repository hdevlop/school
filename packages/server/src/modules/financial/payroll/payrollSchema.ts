import { date, pgEnum, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import {
  createRef,
  idField,
  moneyField,
  paymentMethodEnum,
  processedByRef,
  timestamps,
} from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { staffRef } from '../../staff/staffSchema';

export const payslipStatusEnum = pgEnum('payslipStatus', getEnumValues('payslipStatus'));

export const payslips = pgTable('payslips', {
  id: idField(),
  staffId: staffRef('restrict'),                    // ⚠ restrict — keep payslip history on delete
  staffName: text('staff_name').notNull(),          // snapshot
  staffRole: text('staff_role').notNull(),          // snapshot
  period: text('period').notNull(),                 // 'YYYY-MM'
  baseSalary: moneyField('base_salary').notNull(),  // snapshot
  totalAllowances: moneyField('total_allowances').default('0'),
  totalDeductions: moneyField('total_deductions').default('0'),
  grossAmount: moneyField('gross_amount').notNull(),   // base + allowances
  netAmount: moneyField('net_amount').notNull(),       // gross − deductions
  status: payslipStatusEnum('status').notNull().default('pending'),
  paymentMethod: paymentMethodEnum('payment_method'),
  paymentDate: date('payment_date'),
  payslipNumber: text('payslip_number').unique(),
  transactionRef: text('transaction_ref'),
  processedBy: processedByRef(),
  notes: text('notes'),
  ...timestamps,
}, (table) => ({
  staffPeriodUnique: uniqueIndex('payslips_staff_period_unique').on(table.staffId, table.period),
}));

export const payslipRef = createRef('payslip_id', () => payslips.id);
