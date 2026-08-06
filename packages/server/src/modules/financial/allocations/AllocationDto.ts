import { z } from 'zod';

const paymentAllocationSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  feeId: z.string().min(1, 'Fee ID is required'),
  installmentId: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['fee', 'installment']).default('installment'),
  notes: z.string().optional(),
});

export const createAllocationDto = paymentAllocationSchema;
export const updateAllocationDto = createAllocationDto.partial();

export const allocationIdParam = z.object({ id: z.string().min(1) });
export const paymentIdParam = z.object({ paymentId: z.string().min(1) });
export const studentIdParam = z.object({ studentId: z.string().min(1) });

export type CreateAllocationDto = z.infer<typeof createAllocationDto>;
export type UpdateAllocationDto = z.infer<typeof updateAllocationDto>;
