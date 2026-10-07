import { z } from 'zod';
import { jevSyntheticCases } from './jevSyntheticCases';
export const jevModeDto = z.object({ mode: z.enum(['off', 'shadow', 'on']) }).strict();
export const jevSessionDto = z.object({ caseId: z.string().refine(id => jevSyntheticCases.some(item => item.id === id)) }).strict();
export type JevModeDto = z.infer<typeof jevModeDto>;
export type JevSessionDto = z.infer<typeof jevSessionDto>;
