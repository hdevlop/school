import { z } from 'zod';
export const visitRequestSchema = z.object({
  parentName: z.string().trim().min(2).max(120), phone: z.string().regex(/^\+?[1-9][\d]{0,15}$/),
  email: z.string().email().max(254).or(z.literal('')).optional(), cycleId: z.string().optional(),
  message: z.string().max(1000).optional(), website: z.string().max(1000).optional(),
});
