import { z } from 'zod';
import { EVENT_STATUS_VALUES, EVENT_TYPE_VALUES, EVENT_VISIBILITY_VALUES } from '@sms/contracts';

type T = (key: string) => string;

const timePattern = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?$/;
const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/**
 * What the event form accepts. It takes `t` so a refused field reads in the
 * page's language.
 *
 * `classIds` is the real field; `classId` and `sectionId` are nullable
 * leftovers the API still reads for single-class events, so both are kept
 * rather than tidied away — the calendar and the event list both send them.
 */
export const createEventSchema = (t: T) => {
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1, t('validationMessages.idCannotBeEmpty')).nullish().optional(),
  );
  const dateField = z.string().regex(
    /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
    t('validationMessages.dateMustBeInYyyyMmDdMmDd'),
  );
  const optionalDateField = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, t('validationMessages.dateMustBeInYyyyMmDdFormat'))
    .nullable()
    .optional();
  const timeField = z
    .union([
      z.literal('').transform(() => undefined),
      z.string().regex(timePattern, t('validationMessages.timeMustBeInHhMmFormat')).transform((value) => {
        const match = value.trim().match(timePattern);
        return match ? `${match[1].padStart(2, '0')}:${match[2]}` : value;
      }),
    ])
    .optional()
    .nullable();

  return z.object({
    id: optionalId,
    title: z.string().min(3, t('validationMessages.titleMustBeAtLeast3Characters')).max(200, t('validationMessages.titleTooLong')),
    description: z.string().max(5000, t('validationMessages.descriptionTooLong')).optional().nullable(),
    type: z.enum(EVENT_TYPE_VALUES),
    startDate: dateField,
    endDate: dateField,
    startTime: timeField,
    endTime: timeField,
    location: z.string().max(200, t('validationMessages.locationTooLong')).optional().nullable(),
    venue: z.string().max(200, t('validationMessages.venueTooLong')).optional().nullable(),
    organizerId: optionalId,
    classId: optionalId.nullable(),
    classIds: z.array(z.string().min(1)).min(1, t('validationMessages.selectAtLeastOneClass')),
    sectionId: optionalId.nullable(),
    visibility: z.enum(EVENT_VISIBILITY_VALUES).default('public'),
    status: z.enum(EVENT_STATUS_VALUES).default('scheduled'),
    capacity: numberField(z.number({ error: t('validationMessages.mustBeAValidNumber') })
      .int(t('validationMessages.mustBeAnInteger'))
      .positive(t('validationMessages.capacityMustBePositive'))).optional().nullable(),
    registrationRequired: z.boolean().default(false),
    registrationDeadline: optionalDateField.nullable(),
    attachments: z.any().optional().nullable(),
    notes: z.string().max(2000, t('validationMessages.notesTooLong')).optional().nullable(),
  });
};

export type EventFormValues = z.input<ReturnType<typeof createEventSchema>>;
