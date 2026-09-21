import { z } from 'zod';
import { FEE_TYPE_STATUS_VALUES, PAYMENT_TYPE_VALUES } from '@sms/contracts';

import { num, optionalId } from '@/shared/forms/fieldPrimitives';

/**
 * A fee type — the template a student's actual fees are created from.
 *
 * `category` is a plain string rather than `z.enum(FEE_CATEGORY_VALUES)`, and
 * that is how it has always been: the column is text, the API accepts any
 * label, and a school that invents "swimming" should be able to use it. The
 * select offers the contract's categories as a convenience, not as a limit —
 * see `feeTypeOptions.ts`.
 */
export const feeTypeSchema = z.object({
  id: optionalId,
  name: z.string().min(2, 'Fee type name must be at least 2 characters').max(100, 'Fee type name too long'),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  category: z.string(),
  amount: num().positive('Amount must be greater than 0').max(1_000_00, 'Amount too large'),
  paymentType: z.enum(PAYMENT_TYPE_VALUES).default('recurring'),
  status: z.enum(FEE_TYPE_STATUS_VALUES).default('active').optional(),
});

export type FeeTypeFormValues = z.input<typeof feeTypeSchema>;
