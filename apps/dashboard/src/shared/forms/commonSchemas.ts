import { z } from 'zod';

/**
 * Form shapes with no single owner.
 *
 * A map picker writes the same `{ address, latitude, longitude }` object
 * wherever it appears — a student's home, the school itself, a bus stop — so
 * the shape belongs to the picker, not to any one of those features. Keep this
 * file to shapes that are genuinely like that; a schema a single feature binds
 * a form to goes in that feature's `config/`.
 */
export const locationValueSchema = z.object({
  address: z.string().max(500, 'Address too long'),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

export type LocationValue = z.infer<typeof locationValueSchema>;
