import { z } from 'zod';
import { TEST_PART_LIMITS as limits } from '@sms/contracts';

type T = (key: string, params?: Record<string, unknown>) => string;

/**
 * The questions of an exam or an assessment, owned here and bound by both
 * forms. Form validation only: `testPartsDto` on the server decides what is written.
 */
export const createTestPartsSchema = (t: T) => z.array(z.object({
  id: z.string().min(1).max(limits.id),
  label: z.string().trim().min(1, t('validationMessages.partLabelRequired')).max(limits.label),
})).max(limits.parts);

/** A question's id: kept across edits, so a count entered in the class report stays on its question. */
export const newTestPartId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export type TestPartValues = z.input<ReturnType<typeof createTestPartsSchema>>[number];
