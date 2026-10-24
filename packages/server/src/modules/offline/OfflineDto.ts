import { z } from 'zod';
export const installationDto = z.object({ installationId: z.uuid(), installationEpoch: z.uuid() }).strict();
export const snapshotDto = installationDto.extend({
  kind: z.enum(['shared', 'year']),
  authorizationGeneration: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const pageDto = z.object({ id: z.string().regex(/^\d+$/), page: z.coerce.number().int().min(0).max(10000) });
export const pageQuery = installationDto.extend({ authorizationGeneration: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export type SnapshotInput = z.infer<typeof snapshotDto>;
