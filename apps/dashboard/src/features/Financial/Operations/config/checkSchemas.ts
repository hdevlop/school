import { z } from 'zod';

/** Why a check bounced or was voided. The server stores and requires it. */
export const checkReasonSchema = z.object({
  reason: z.string().trim().min(1),
});

export type CheckReasonValues = z.infer<typeof checkReasonSchema>;
