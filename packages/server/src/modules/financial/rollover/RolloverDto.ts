import { z } from 'zod';
import { requiredId } from '@server/shared/fields';
import { academicYearField } from '@server/shared/fields';

export const rolloverDto = z.object({
  fromYear: academicYearField,
  toYear: academicYearField,
  classIds: z.array(requiredId).optional(),
  feeTypeIds: z.array(requiredId).optional(),
  copyDiscounts: z.boolean().default(false),
  includeOneTimeFees: z.boolean().default(false),
  dryRun: z.boolean().default(true),
  idempotencyKey: z.string().uuid(),
});

export const commitRolloverDto = rolloverDto.extend({
  runId: requiredId,
  confirmSettingsUpdate: z.boolean().default(false),
});

export type RolloverDto = z.infer<typeof rolloverDto>;
export type CommitRolloverDto = z.infer<typeof commitRolloverDto>;
