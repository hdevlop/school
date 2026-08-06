import { z } from 'zod';
import { dateField, num, optionalId } from '@server/shared/fields';
import { feeInstallmentStatusEnum } from '@server/shared/enums';

const feeInstallmentSchema = z.object({
  feeId: optionalId,
  number: num().int().min(1, 'Installment must be at least 1'),
  dueDate: dateField,
  amount: num().positive('Amount must be greater than 0').max(100000, 'Amount too large'),
  paidAmount: num().min(0, 'Paid amount cannot be negative').max(100000, 'Amount too large').optional(),
  status: feeInstallmentStatusEnum.optional(),
});

export const createInstallmentDto = feeInstallmentSchema;
export const updateInstallmentDto = createInstallmentDto.partial();

export const installmentIdParam = z.object({ id: z.string().min(1) });
export const feeIdParam = z.object({ feeId: z.string().min(1) });

export type CreateInstallmentDto = z.infer<typeof createInstallmentDto>;
export type UpdateInstallmentDto = z.infer<typeof updateInstallmentDto>;
