import { z } from 'zod';
import { jevBenchmarkCases } from './jevBenchmarkCases';
import { JEV_EXPERIMENT_ARMS } from './jevExperiment';
export const jevModeDto = z.object({ mode: z.enum(['off', 'shadow', 'on']) }).strict();
export const jevSessionDto = z.object({ caseId: z.string().refine(id => jevBenchmarkCases.some(item => item.id === id)),
  experimentArm: z.enum(JEV_EXPERIMENT_ARMS).optional() }).strict();
export const jevFixtureReadsDto = z.object({ action: z.literal('prepare') }).strict();
export type JevFixtureReadsDto = z.infer<typeof jevFixtureReadsDto>;
export type JevModeDto = z.infer<typeof jevModeDto>;
export type JevSessionDto = z.infer<typeof jevSessionDto>;
