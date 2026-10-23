import { z } from 'zod';
import { EXPENSE_CATEGORY_VALUES, EXPENSE_STATUS_VALUES, PAYMENT_METHOD_VALUES } from '@sms/contracts';

type T = (key: string) => string;

const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/**
 * What the school spends, and the record-payment dialog. They take `t` so a
 * refused field reads in the page's language; Zod's own defaults are English.
 *
 * `paymentMethod` and `paymentDate` are nullable because an expense is
 * recorded when it is incurred and paid later — an unpaid expense has neither.
 * The payment dialog posts to the server's payment route, which takes the
 * method and date; a cheque also needs its number.
 */
export const createExpenseSchemas = (t: T) => {
  const tooLong = t('expenses.validation.tooLong');
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1).nullish().optional(),
  );
  const dateField = z.string().regex(
    /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
    t('expenses.validation.dateInvalid'),
  );
  const optionalDateField = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, t('expenses.validation.dateInvalid'))
    .nullable()
    .optional();

  const expense = z.object({
    id: optionalId,
    category: z.enum(EXPENSE_CATEGORY_VALUES, { error: t('expenses.validation.categoryRequired') }),
    title: z.string().min(3, t('expenses.validation.titleMinLength')).max(200, tooLong),
    amount: numberField(z.number({ error: t('expenses.validation.amountRequired') }).positive(t('expenses.validation.amountPositive')).max(10000000, t('expenses.validation.amountTooLarge'))),
    expenseDate: dateField,
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES).optional().nullable(),
    paymentDate: optionalDateField.nullable(),
    vendor: z.string().max(200, tooLong).optional().nullable(),
    invoiceNumber: z.string().max(100, tooLong).optional().nullable(),
    receiptNumber: z.string().max(100, tooLong).optional().nullable(),
    checkNumber: z.string().max(50, tooLong).optional().nullable(),
    transactionRef: z.string().max(100, tooLong).optional().nullable(),
    status: z.enum(EXPENSE_STATUS_VALUES).default('pending'),
    notes: z.string().max(1000, tooLong).optional().nullable(),
  });

  const payment = z.object({
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('expenses.validation.dateInvalid')),
    checkNumber: z.string().max(50, tooLong).optional().nullable(),
  }).refine((data) => data.paymentMethod !== 'check' || Boolean(data.checkNumber?.trim()), {
    message: t('expenses.validation.checkNumberRequired'),
    path: ['checkNumber'],
  });

  const rejection = z.object({
    rejectionReason: z.string().trim()
      .min(10, t('expenses.validation.rejectionReasonMinLength'))
      .max(1000, tooLong),
  });

  return { expense, payment, rejection };
};

export type ExpenseFormValues = z.input<ReturnType<typeof createExpenseSchemas>['expense']>;
export type ExpensePaymentValues = z.input<ReturnType<typeof createExpenseSchemas>['payment']>;
