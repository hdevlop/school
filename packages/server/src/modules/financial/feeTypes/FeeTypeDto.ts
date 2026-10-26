import { z } from 'zod';
import { optionalId, money } from '../../../shared/fields';
import { feeTypeStatusEnum, paymentTypeEnum } from '../../../shared/enums';

const feeTypeSchema = z.object({
  id: optionalId,
  name: z.string().min(2, 'Fee type name must be at least 2 characters').max(100, 'Fee type name too long'),
  labels: z.record(z.string(), z.string().trim().min(1).max(100, 'Fee type name too long')).nullish(),
  image: z.string().nullish(),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  category: z.string(),
  amount: money().positive('Amount must be greater than 0').max(100000, 'Amount too large'),
  paymentType: paymentTypeEnum.default('recurring'),
  status: feeTypeStatusEnum.default('active').optional(),
});

export const createFeeTypeDto = feeTypeSchema.omit({ id: true });
export const updateFeeTypeDto = createFeeTypeDto.partial().extend({
  paymentType: paymentTypeEnum.optional(),
  status: feeTypeStatusEnum.optional(),
});

export const feeTypeIdParam = z.object({ id: z.string().min(1) });

// Validation restores multipart files after validating the MCP-safe schema.
type ImageInput = { image?: string | File | Blob | null };
export type CreateFeeTypeDto = Omit<z.infer<typeof createFeeTypeDto>, 'image'> & ImageInput;
export type UpdateFeeTypeDto = Omit<z.infer<typeof updateFeeTypeDto>, 'image'> & ImageInput;
