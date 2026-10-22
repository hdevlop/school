import { z } from 'zod';

/** Why a check bounced or was voided. The server stores and requires it. */
export const createCheckReasonSchema = (t: (key: string) => string) => z.object({
  reason: z.string({ error: t('validationMessages.reasonIsRequired') }).trim()
    .min(1, t('validationMessages.reasonIsRequired'))
    .max(500, t('validationMessages.reasonTooLong')),
});

export type CheckReasonValues = z.infer<ReturnType<typeof createCheckReasonSchema>>;
