import { z } from 'zod';
import { dateField, optionalDateField, optionalId, requiredId, money } from '../../../shared/fields';
import { paymentMethodEnum, paymentStatusEnum } from '../../../shared/enums';

const paymentAllocationSchema = z.object({
  feeId: requiredId,
  number: z.coerce.number().int().positive('Installment must be a positive number'),
  amount: money().positive('Amount must be greater than 0'),
});

const paymentBaseSchema = z.object({
  amount: money().positive('Amount must be greater than 0').max(1_000_000, 'Amount too large'),
  paymentMethod: paymentMethodEnum,
  paymentDate: dateField,
  checkNumber: z.preprocess((val) => (val === '' ? null : val), z.string().max(50, 'Check number too long').optional().nullable()),
  checkDueDate: z.preprocess((val) => (val === '' ? null : val), optionalDateField.nullable()),
  checkBank: z.preprocess((val) => (val === '' ? null : val), z.string().max(120, 'Bank name too long').optional().nullable()),
  settledDate: optionalDateField.nullable(),
  transactionRef: z.preprocess((val) => (val === '' ? null : val), z.string().max(100, 'Transaction reference too long').optional().nullable()),
  receiptNumber: z.preprocess((val) => (val === '' ? null : val), z.string().max(50, 'Receipt number too long').optional().nullable()),
  status: paymentStatusEnum.optional(),
  processedBy: optionalId,
  notes: z.preprocess((val) => (val === '' ? null : val), z.string().max(1000, 'Notes too long').optional().nullable()),
});

export const createPaymentDto = paymentBaseSchema.omit({ status: true, settledDate: true }).extend({
  studentId: requiredId,
  allocations: z.array(paymentAllocationSchema).min(1, 'At least one allocation is required').optional(),
  autoAllocate: z.boolean().optional().default(false),
  keepRemainderAsCredit: z.boolean().optional().default(false),
  idempotencyKey: z.string().uuid().optional(),
}).superRefine((value, ctx) => {
  const hasExplicit = Boolean(value.allocations?.length);
  if (hasExplicit === value.autoAllocate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide allocations or enable autoAllocate, but not both',
    });
  }
  if (value.paymentMethod === 'check') {
    if (!value.checkNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'checkNumber is required for check payments', path: ['checkNumber'] });
    }
    if (!value.checkDueDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'checkDueDate is required for check payments', path: ['checkDueDate'] });
    }
  }
});

// One parent paying for several children: one receipt, one payment per child.
// Each child's payment is exactly what its installments take; change is handed
// back at the desk, never kept as credit.
const familyChildSchema = z.object({
  studentId: requiredId,
  allocations: z.array(paymentAllocationSchema).min(1, 'At least one allocation is required'),
});

export const createFamilyPaymentDto = paymentBaseSchema.pick({
  paymentMethod: true,
  paymentDate: true,
  checkNumber: true,
  checkDueDate: true,
  checkBank: true,
  transactionRef: true,
  notes: true,
}).extend({
  parentId: requiredId,
  children: z.array(familyChildSchema).min(1, 'Select at least one child to pay for').max(20, 'Too many children on one receipt'),
  idempotencyKey: z.string().uuid().optional(),
}).superRefine((value, ctx) => {
  const studentIds = value.children.map((child) => child.studentId);
  if (new Set(studentIds).size !== studentIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Each child can appear only once on a receipt', path: ['children'] });
  }
  for (const [index, child] of value.children.entries()) {
    const cents = child.allocations.reduce((sum, allocation) => sum + Math.round(allocation.amount * 100), 0);
    if (cents > 100_000_000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount too large', path: ['children', index, 'allocations'] });
    }
  }
  if (value.paymentMethod === 'check') {
    if (!value.checkNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'checkNumber is required for check payments', path: ['checkNumber'] });
    }
    if (!value.checkDueDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'checkDueDate is required for check payments', path: ['checkDueDate'] });
    }
  }
});

export const familyReceiptIdParam = z.object({ id: z.string().min(1) });

export const updatePaymentDto = paymentBaseSchema
  .omit({ amount: true, processedBy: true, status: true })
  .partial()
  .strict();

export const refundPaymentDto = z.object({
  reason: z.string().optional().nullable(),
});

export const voidPaymentDto = z.object({
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
});

export const checkStatusDto = z.object({
  status: z.enum(['deposited', 'completed', 'bounced']),
  reason: z.string().max(500, 'Reason too long').optional(),
  settledDate: optionalDateField,
});

export const paymentIdParam = z.object({ id: z.string().min(1) });
export const studentIdParam = z.object({ studentId: z.string().min(1) });
export const feeIdParam = z.object({ feeId: z.string().min(1) });
export const receiptNumberParam = z.object({ receiptNumber: z.string().min(1) });
const revenueQuerySchema = z.object({});

export const revenueQueryDto = revenueQuerySchema.default({});
export const monthlyRevenueQueryDto = revenueQuerySchema.extend({
  year: z.coerce.number().int().min(2000).max(new Date().getFullYear() + 10),
});
export const topPayingStudentsQueryDto = revenueQuerySchema.extend({
  limit: z.coerce.number().int().positive().max(100).optional(),
}).default({});

export type CreatePaymentDto = z.infer<typeof createPaymentDto>;
export type CreateFamilyPaymentDto = z.infer<typeof createFamilyPaymentDto>;
export type UpdatePaymentDto = z.infer<typeof updatePaymentDto>;
export type RefundPaymentDto = z.infer<typeof refundPaymentDto>;
export type VoidPaymentDto = z.infer<typeof voidPaymentDto>;
export type CheckStatusDto = z.infer<typeof checkStatusDto>;
export type RevenueQueryDto = z.infer<typeof revenueQueryDto>;
export type MonthlyRevenueQueryDto = z.infer<typeof monthlyRevenueQueryDto>;
export type TopPayingStudentsQueryDto = z.infer<typeof topPayingStudentsQueryDto>;
