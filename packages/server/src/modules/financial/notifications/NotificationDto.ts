import { z } from 'zod';
import { optionalId } from '../../../shared/fields';
import { isValidDateOnly } from '../utils/dateOnly';

export const runNotificationsDto = z.object({
  businessDate: z.string().refine(isValidDateOnly, 'Date must be a valid YYYY-MM-DD date').optional(),
  dryRun: z.boolean().optional().default(false),
  actorId: optionalId,
  daysAhead: z.number().int().min(0).max(365).optional(),
}).strict(); // FIX: SEC-005 — cron input is data, never SQL syntax.

export const listRecentNotificationsDto = z.object({ limit: z.number().int().min(1).max(100).optional() }).strict();

export const notificationsBusinessDateParam = z.object({
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type RunNotificationsDto = z.infer<typeof runNotificationsDto>;
