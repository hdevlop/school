import { z } from 'zod';
import { num, optionalId } from '@server/shared/fields';
import { feeTypeStatusEnum, paymentTypeEnum } from '@server/shared/enums';

const feeTypeSchema = z.object({
  id: optionalId,
  name: z.string().min(2, 'Fee type name must be at least 2 characters').max(100, 'Fee type name too long'),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  category: z.string(),
  amount: num().positive('Amount must be greater than 0').max(100000, 'Amount too large'),
  paymentType: paymentTypeEnum.default('recurring'),
  status: feeTypeStatusEnum.default('active').optional(),
});

export const createFeeTypeDto = feeTypeSchema.omit({ id: true });
export const updateFeeTypeDto = createFeeTypeDto.partial().extend({
  paymentType: paymentTypeEnum.optional(),
  status: feeTypeStatusEnum.optional(),
});

export const feeTypeIdParam = z.object({ id: z.string().min(1) });

export type CreateFeeTypeDto = z.infer<typeof createFeeTypeDto>;
export type UpdateFeeTypeDto = z.infer<typeof updateFeeTypeDto>;
