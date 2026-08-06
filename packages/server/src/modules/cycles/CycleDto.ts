import { z } from 'zod';

const labelsField = z.record(z.string(), z.string().min(1)).nullable().optional();

const cycleSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1, 'Cycle name is required').max(100, 'Cycle name too long'),
  labels: labelsField,
  sortOrder: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export const createCycleDto = cycleSchema.omit({ id: true });
export const updateCycleDto = createCycleDto.partial();
export const cycleIdParam = z.object({ id: z.string().min(1) });

export type CreateCycleDto = z.infer<typeof createCycleDto>;
export type UpdateCycleDto = z.infer<typeof updateCycleDto>;
