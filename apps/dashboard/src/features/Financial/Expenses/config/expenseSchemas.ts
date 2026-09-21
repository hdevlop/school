import { z } from 'zod';
import { EXPENSE_CATEGORY_VALUES, EXPENSE_STATUS_VALUES, PAYMENT_METHOD_VALUES } from '@sms/contracts';

import {
  dateField,
  num,
  optionalDateField,
  optionalId,
} from '@/shared/forms/fieldPrimitives';

/**
 * What the school spends.
 *
 * `paymentMethod` and `paymentDate` are nullable because an expense is
 * recorded when it is incurred and paid later — an unpaid expense has neither.
 */
export const expenseSchema = z.object({
  id: optionalId,
  category: z.enum(EXPENSE_CATEGORY_VALUES),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  amount: num().positive('Amount must be greater than 0').max(10000000, 'Amount too large'),
  expenseDate: dateField,
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES).optional().nullable(),
  paymentDate: optionalDateField.nullable(),
  vendor: z.string().max(200, 'Vendor name too long').optional().nullable(),
  invoiceNumber: z.string().max(100, 'Invoice number too long').optional().nullable(),
  receiptNumber: z.string().max(100, 'Receipt number too long').optional().nullable(),
  checkNumber: z.string().max(50, 'Check number too long').optional().nullable(),
  transactionRef: z.string().max(100, 'Transaction reference too long').optional().nullable(),
  status: z.enum(EXPENSE_STATUS_VALUES).default('pending'),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export type ExpenseFormValues = z.input<typeof expenseSchema>;
