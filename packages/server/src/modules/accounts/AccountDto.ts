import { z } from 'zod';

export const accountIdParam = z.object({ id: z.string().min(1) });
