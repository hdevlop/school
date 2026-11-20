import { z } from 'zod';
import { TEST_PART_LIMITS as limits } from '@sms/contracts';

/**
 * The questions of an exam or assessment. Each keeps the id the form gave it,
 * so a count entered in the class report stays on its question when the list
 * is edited.
 */
export const testPartsDto = z.array(z.object({
  id: z.string().trim().min(1).max(limits.id),
  label: z.string().trim().min(1).max(limits.label),
})).max(limits.parts).refine(
  (parts) => new Set(parts.map((part) => part.id)).size === parts.length,
  { message: 'validationMessages.duplicateTestPart' },
);
