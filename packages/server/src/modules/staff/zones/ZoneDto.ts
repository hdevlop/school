import { z } from 'zod';

const zoneSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1, 'Zone name is required').max(100, 'Zone name too long'),
  building: z.string().max(100, 'Building too long').optional().nullable(),
  floor: z.string().max(50, 'Floor too long').optional().nullable(),
  description: z.string().max(500, 'Description too long').optional().nullable(),
});

export const createZoneDto = zoneSchema.omit({ id: true });
export const updateZoneDto = createZoneDto.partial();
export const zoneIdParam = z.object({ id: z.string().min(1) });

export type CreateZoneDto = z.infer<typeof createZoneDto>;
export type UpdateZoneDto = z.infer<typeof updateZoneDto>;
