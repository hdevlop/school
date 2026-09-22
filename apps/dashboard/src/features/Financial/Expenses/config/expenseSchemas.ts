import { z } from 'zod';
import { EXPENSE_CATEGORY_VALUES, EXPENSE_STATUS_VALUES, PAYMENT_METHOD_VALUES } from '@sms/contracts';

const optionalId = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1, 'ID cannot be empty').nullish().optional(),
);
const dateField = z.string().regex(
  /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
  'Date must be in YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-MM-YY, or DD-MM-YYYY format',
);
const optionalDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .nullable()
  .optional();
const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

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
  amount: numberField(z.number({ error: 'Must be a valid number' }).positive('Amount must be greater than 0').max(10000000, 'Amount too large')),
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
