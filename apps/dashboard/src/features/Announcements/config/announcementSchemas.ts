import { z } from 'zod';

type T = (key: string) => string;

/**
 * Who an announcement is for.
 *
 * Frontend-only: this is not a database enum and the API does not persist the
 * word `class` — picking it is what makes `classIds` meaningful, and the
 * server reads the audience from which ids arrive. It stays here rather than
 * in `@sms/contracts`, which only holds values that actually travel.
 */
export const ANNOUNCEMENT_AUDIENCE_VALUES = [
  'all',
  'students',
  'teachers',
  'parents',
  'class',
] as const;

export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCE_VALUES)[number];

/** The announcement form's schema; it takes `t` so a refused field reads in the page's language. */
export const createAnnouncementSchema = (t: T) => {
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1, t('validationMessages.idCannotBeEmpty')).nullish().optional(),
  );
  const requiredId = z.preprocess(
    (value) => value ?? '',
    z.string().min(1, t('validationMessages.idIsRequired')),
  );
  const dateField = z.string().regex(
    /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
    t('validationMessages.dateMustBeInYyyyMmDdMmDd'),
  );

  return z.object({
    id: optionalId,
    title: z.string().min(3, t('validationMessages.titleMustBeAtLeast3Characters')).max(200, t('validationMessages.titleTooLong')),
    content: z.string().min(10, t('validationMessages.contentMustBeAtLeast10Characters')).max(5000, t('validationMessages.contentTooLong')),
    authorId: optionalId,
    targetAudience: z.enum(ANNOUNCEMENT_AUDIENCE_VALUES),
    classId: optionalId,
    classIds: z.array(requiredId).optional(),
    publishDate: dateField.optional(),
    expiryDate: dateField.optional(),
  }).superRefine((data, ctx) => {
    // Only the class audience shows the class picker. Requiring classes for any
    // other audience failed on a field the form does not render, so Create did
    // nothing and said nothing.
    if (data.targetAudience === 'class' && !(data.classIds?.length)) {
      ctx.addIssue({ code: 'custom', path: ['classIds'], message: t('validationMessages.selectAtLeastOneClass') });
    }
  });
};

export type AnnouncementFormValues = z.input<ReturnType<typeof createAnnouncementSchema>>;
