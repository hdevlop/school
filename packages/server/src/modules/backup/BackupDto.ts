import { z } from 'zod';

/** Compared with the signed-in administrator's password; never stored. */
export const resetSchoolDto = z.object({ password: z.string().min(1).max(200) });

export type ResetSchoolDto = z.infer<typeof resetSchoolDto>;
