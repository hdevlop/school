import { z } from 'zod';

export const academicYearQueryDto = z.object({
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{4}$/, 'academicYear must be in the form YYYY-YYYY')
    .optional(),
});
export type AcademicYearQueryDto = z.infer<typeof academicYearQueryDto>;

export const overdueQueryDto = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
export type OverdueQueryDto = z.infer<typeof overdueQueryDto>;

export const recentPaymentsQueryDto = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});
export type RecentPaymentsQueryDto = z.infer<typeof recentPaymentsQueryDto>;

