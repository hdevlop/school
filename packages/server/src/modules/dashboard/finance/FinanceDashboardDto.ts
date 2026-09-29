import { z } from 'zod';

// The year comes from the request's year scope (`config/yearScope.ts`), which
// also declares it for MCP; these queries carry only their own filters.
export const overdueQueryDto = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
export type OverdueQueryDto = z.infer<typeof overdueQueryDto>;

export const recentPaymentsQueryDto = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});
export type RecentPaymentsQueryDto = z.infer<typeof recentPaymentsQueryDto>;
