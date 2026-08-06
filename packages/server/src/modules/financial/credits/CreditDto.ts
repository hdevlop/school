import { z } from 'zod';
import { num, requiredId } from '@server/shared/fields';

export const applyCreditDto = z.object({
  studentId: requiredId,
  amount: num().positive('Amount must be greater than 0').max(1_000_000, 'Amount too large'),
});

export const creditStudentIdParam = z.object({ studentId: z.string().min(1) });

export type ApplyCreditDto = z.infer<typeof applyCreditDto>;
