import { z } from 'zod';

export const chatDiagnosticsIdParam = z.object({ correlationId: z.string().min(1).max(200) });
export const listChatDiagnosticsDto = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type ListChatDiagnosticsDto = z.infer<typeof listChatDiagnosticsDto>;
