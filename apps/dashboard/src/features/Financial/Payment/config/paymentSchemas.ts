import { z } from 'zod';
import { PAYMENT_METHOD_VALUES } from '@sms/contracts';

type T = (key: string) => string;

const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/** A cleared number input holds `null`; an optional field reads it as not given. */
const optionalNumberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => (value === null ? undefined : value), numberField(schema).optional());

/**
 * The payment forms. They take `t` so a refused field reads in the page's
 * language; Zod's own defaults are English.
 */
export const createPaymentSchemas = (t: T) => {
  const tooLong = t('payments.validation.tooLong');
  const dateInvalid = t('payments.validation.dateInvalid');
  const amountInvalid = t('payments.validation.amountInvalid');
  const amountPositive = t('payments.validation.amountPositive');
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1).nullish().optional(),
  );
  const dateField = z.string().regex(
    /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
    dateInvalid,
  );
  const optionalDateField = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, dateInvalid)
    .nullable()
    .optional();

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
  const feePayment = z.object({
    studentId: optionalId,
    amount: optionalNumberField(z.number({ error: amountInvalid }).positive(amountPositive).max(1_000_000, t('payments.validation.amountTooLarge'))),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
    paymentDate: dateField,
    checkNumber: z.preprocess((val) => (val === '' ? null : val), z.string().max(50, tooLong).optional().nullable()),
    checkDueDate: z.preprocess((val) => (val === '' ? null : val), optionalDateField.nullable()),
    transactionRef: z.preprocess((val) => (val === '' ? null : val), z.string().max(100, tooLong).optional().nullable()),
    receiptNumber: z.preprocess((val) => (val === '' ? null : val), z.string().max(50, tooLong).optional().nullable()),
    processedBy: optionalId,
    notes: z.preprocess((val) => (val === '' ? null : val), z.string().max(1000, tooLong).optional().nullable()),
    allocations: z
      .array(
        z.object({
          feeId: optionalId,
          number: z.number().int().positive(),
          amount: numberField(z.number({ error: amountInvalid }).positive(amountPositive)),
        }),
      )
      .optional()
      .nullable(),
  });

  /** The details step of taking a payment; a cheque needs its number and due date. */
  const details = feePayment.pick({
    amount: true,
    paymentMethod: true,
    paymentDate: true,
    transactionRef: true,
    notes: true,
  }).extend({
    checkNumber: z.string().optional().or(z.literal('')),
    checkDueDate: z.string().optional().or(z.literal('')),
    checkBank: z.string().optional().or(z.literal('')),
  }).refine(
    (data) => data.paymentMethod !== 'check' || Boolean(data.checkNumber?.trim()),
    { message: t('payments.validation.checkNumberRequired'), path: ['checkNumber'] },
  ).refine(
    (data) => data.paymentMethod !== 'check' || /^\d{4}-\d{2}-\d{2}$/.test(data.checkDueDate ?? ''),
    { message: t('payments.validation.checkDueDateRequired'), path: ['checkDueDate'] },
  );

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
  const paymentEdit = z.object({
    id: z.string(),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
    paymentDate: z.string().min(1, t('payments.validation.paymentDateRequired')),
    checkNumber: z.string().max(50, tooLong).optional().nullable(),
    checkDueDate: z.string().optional().nullable(),
    transactionRef: z.string().max(100, tooLong).optional().nullable(),
    receiptNumber: z.string().max(50, tooLong).optional().nullable(),
    notes: z.string().max(1000, tooLong).optional().nullable(),
  });

  return { feePayment, details, paymentEdit };
};

type PaymentSchemas = ReturnType<typeof createPaymentSchemas>;
export type FeePaymentFormValues = z.input<PaymentSchemas['feePayment']>;
export type PaymentEditFormValues = z.input<PaymentSchemas['paymentEdit']>;
