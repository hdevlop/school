import { z } from 'zod';

export const migrationIssueIdParam = z.object({ id: z.string().min(1) });
export const listMigrationIssuesDto = z.object({
  status: z.enum(['open', 'resolved', 'dismissed']).default('open'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).optional(),
});
export const reviewMigrationIssueDto = z.object({
  status: z.enum(['resolved', 'dismissed']),
  resolutionNote: z.string().trim().min(10).max(2000),
});

export type ListMigrationIssuesDto = z.infer<typeof listMigrationIssuesDto>;
export type ReviewMigrationIssueDto = z.infer<typeof reviewMigrationIssueDto>;
