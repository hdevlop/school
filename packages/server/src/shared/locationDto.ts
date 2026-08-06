import { z } from 'zod';

export const latitudeDto = z.number().min(-90).max(90).optional().nullable();
export const longitudeDto = z.number().min(-180).max(180).optional().nullable();
export const placeIdDto = z.string().max(255).optional().nullable();

export const locationDto = z.object({
  address: z.string().min(1).max(500),
  placeId: placeIdDto,
  latitude: latitudeDto,
  longitude: longitudeDto,
});

export type LocationDto = z.infer<typeof locationDto>;
