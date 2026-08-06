import { z } from 'zod';
import { optionalId } from '@server/shared/fields';

export const runNotificationsDto = z.object({
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  dryRun: z.boolean().optional().default(false),
  actorId: optionalId,
});

export const notificationsBusinessDateParam = z.object({
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type RunNotificationsDto = z.infer<typeof runNotificationsDto>;
