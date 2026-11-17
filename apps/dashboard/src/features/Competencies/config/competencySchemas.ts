import { z } from 'zod';
import { COMPETENCY_LIMITS } from '@sms/contracts';

type T = (key: string, params?: Record<string, unknown>) => string;

/**
 * The name of a domain or a competency, and its optional second-language name.
 * It takes `t` so a refused field reads in the page's language.
 *
 * Form validation, not authorization: `CompetencyDto` on the server checks the
 * same payload again, with whether the teacher teaches this class.
 */
export const createCompetencyNameSchema = (t: T) => z.object({
  name: z.string().trim()
    .min(1, t('competencies.errors.nameRequired'))
    .max(COMPETENCY_LIMITS.name, t('competencies.errors.nameTooLong')),
  altName: z.string().trim()
    .max(COMPETENCY_LIMITS.name, t('competencies.errors.nameTooLong'))
    .optional()
    .transform((value) => value || null),
});

export type CompetencyNameValues = z.input<ReturnType<typeof createCompetencyNameSchema>>;
