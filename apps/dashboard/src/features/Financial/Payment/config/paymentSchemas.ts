import { z } from 'zod';
import { PAYMENT_METHOD_VALUES } from '@sms/contracts';

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
 * Taking a payment, and correcting one that was already taken.
 *
 * The `z.preprocess((val) => val === "" ? null : val, ...)` wrappers are
 * load-bearing rather than decoration: a cleared optional text input submits
 * `''`, and the API stores that as an empty check number instead of no check
 * number. Collapsing it to `null` is what keeps "not applicable" distinct from
 * "blank".
 *
 * `status` is absent on purpose. A payment's state — deposited, bounced,
 * voided — is the server's to move through as checks clear; the dashboard
 * records the payment and reads the state back.
 */
export const feePaymentSchema = z.object({
  studentId: optionalId,
  amount: numberField(z.number({ error: 'Must be a valid number' }).positive('Amount must be greater than 0').max(1_000_000, 'Amount too large')).optional(),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
  paymentDate: dateField,
  checkNumber: z.preprocess((val) => (val === '' ? null : val), z.string().max(50, 'Check number too long').optional().nullable()),
  checkDueDate: z.preprocess((val) => (val === '' ? null : val), optionalDateField.nullable()),
  transactionRef: z.preprocess((val) => (val === '' ? null : val), z.string().max(100, 'Transaction reference too long').optional().nullable()),
  receiptNumber: z.preprocess((val) => (val === '' ? null : val), z.string().max(50, 'Receipt number too long').optional().nullable()),
  processedBy: optionalId,
  notes: z.preprocess((val) => (val === '' ? null : val), z.string().max(1000, 'Notes too long').optional().nullable()),
  allocations: z
    .array(
      z.object({
        feeId: optionalId,
        number: z.number().int().positive('Installment must be a positive number'),
        amount: numberField(z.number({ error: 'Must be a valid number' }).positive('Amount must be greater than 0')),
      }),
    )
    .optional()
    .nullable(),
});

/**
 * Editing a payment already on file.
 *
 * Neither the amount nor the allocations appear: changing what a payment paid
 * for is a reallocation, not an edit, and it goes through its own flow. This
 * form fixes the paperwork — the method, the date, the reference numbers.
 *
 * `paymentDate` is checked only for presence rather than with the create form's
 * date pattern, which is how this dialog has always behaved; the value comes
 * back from the API already normalized.
 */
export const paymentEditSchema = z.object({
  id: z.string(),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
  paymentDate: z.string().min(1, 'Payment date is required'),
  checkNumber: z.string().max(50, 'Check number too long').optional().nullable(),
  checkDueDate: z.string().optional().nullable(),
  transactionRef: z.string().max(100, 'Transaction reference too long').optional().nullable(),
  receiptNumber: z.string().max(50, 'Receipt number too long').optional().nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export type FeePaymentFormValues = z.input<typeof feePaymentSchema>;
export type PaymentEditFormValues = z.input<typeof paymentEditSchema>;
