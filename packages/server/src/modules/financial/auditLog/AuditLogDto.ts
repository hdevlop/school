import { z } from 'zod';
import { optionalId } from '@server/shared/fields';

export const auditLogQueryDto = z.object({
  entityType: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  actorId: optionalId,
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const auditLogIdParam = z.object({ id: z.string().min(1) });

export type AuditLogQueryDto = z.infer<typeof auditLogQueryDto>;
