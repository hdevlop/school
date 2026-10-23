import { z } from 'zod';
import {
  DISCIPLINE_ACTION_VALUES,
  DISCIPLINE_CATEGORY_VALUES,
  DISCIPLINE_SEVERITY_VALUES,
} from '@sms/contracts';

type T = (key: string) => string;

/**
 * Recording and closing an incident. They take `t` so a refused field reads in
 * the page's language.
 */
export const createDisciplineSchemas = (t: T) => {
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1, t('validationMessages.idCannotBeEmpty')).nullish().optional(),
  );
  const requiredId = z.preprocess(
    (value) => value ?? '',
    z.string().trim().min(1, t('validationMessages.studentIsRequired')),
  );

  /**
   * Recording an incident.
   *
   * The date and time are validated with their own patterns rather than the
   * broader date inputs: an incident is logged from a date and a time input that
   * both emit one fixed format, and a half-remembered date is worse here than a
   * rejected one.
   */
  const discipline = z.object({
    id: optionalId,
    studentId: requiredId,
    incidentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('validationMessages.incidentDateIsRequired')),
    incidentTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, t('validationMessages.incidentTimeIsRequired')),
    category: z.enum(DISCIPLINE_CATEGORY_VALUES),
    severity: z.enum(DISCIPLINE_SEVERITY_VALUES).default('medium'),
    location: z.string().max(150, t('validationMessages.locationIsTooLong')).optional().nullable(),
    description: z.string().trim().min(1, t('validationMessages.descriptionIsRequired')).max(2000, t('validationMessages.descriptionIsTooLong')),
  });

  /**
   * Closing an incident. A resolution note is mandatory — this is the record a
   * parent may later be shown, so "resolved" on its own is not an account.
   */
  const resolve = z.object({
    actionType: z.enum(DISCIPLINE_ACTION_VALUES),
    actionNote: z.string().max(1000, t('validationMessages.actionNoteIsTooLong')).optional().nullable(),
    resolutionNote: z.string().trim().min(1, t('validationMessages.resolutionNoteIsRequired')).max(2000, t('validationMessages.resolutionNoteIsTooLong')),
  });

  return { discipline, resolve };
};

type DisciplineSchemas = ReturnType<typeof createDisciplineSchemas>;
export type DisciplineFormValues = z.input<DisciplineSchemas['discipline']>;
export type ResolveDisciplineFormValues = z.input<DisciplineSchemas['resolve']>;
