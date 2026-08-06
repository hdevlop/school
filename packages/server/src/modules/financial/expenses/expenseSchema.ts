import { date, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import {
  approvedByRef,
  idField,
  moneyField,
  paidByRef,
  paymentMethodEnum,
  timestamps,
} from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';

export const expenseCategoryEnum = pgEnum('expenseCategory', getEnumValues('expenseCategory'));
export const expenseStatusEnum = pgEnum('expenseStatus', getEnumValues('expenseStatus'));

export const expenses = pgTable('expenses', {
  id: idField(),
  category: expenseCategoryEnum('category').notNull(),
  title: text('title').notNull(),
  amount: moneyField('amount').notNull(),
  expenseDate: date('expense_date').notNull(),
  vendor: text('vendor'),
  paymentMethod: paymentMethodEnum('payment_method'),
  paymentDate: date('payment_date'),
  invoiceNumber: text('invoice_number'),
  receiptNumber: text('receipt_number'),
  checkNumber: text('check_number'),
  transactionRef: text('transaction_ref'),
  status: expenseStatusEnum('status').default('pending'),
  approvedBy: approvedByRef(),
  approvedAt: timestamp('approved_at', { mode: 'string' }),
  rejectionReason: text('rejection_reason'),
  paidBy: paidByRef(),
  notes: text('notes'),
  ...timestamps,
});
