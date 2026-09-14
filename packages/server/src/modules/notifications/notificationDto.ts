import { z } from 'zod';

const base64url = z.string().trim().min(1).max(500).regex(/^[A-Za-z0-9_-]+={0,2}$/);

export const notificationListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread: z.preprocess((value) => value === 'true' || value === true ? true : value === 'false' || value === false ? false : undefined, z.boolean().optional()),
});
export const notificationIdParams = z.object({ id: z.string().min(1).max(40) });
export const pushSubscriptionDto = z.object({
  endpoint: z.string().trim().url().max(2_000),
  p256dh: base64url,
  auth: base64url,
});
export const pushUnsubscribeDto = z.object({ endpoint: z.string().trim().url().max(2_000) });

export type NotificationListQuery = z.input<typeof notificationListQuery>;
export type PushSubscriptionDto = z.input<typeof pushSubscriptionDto>;
export type PushUnsubscribeDto = z.input<typeof pushUnsubscribeDto>;
