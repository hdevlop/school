import { z } from 'zod';

type T = (key: string, params?: Record<string, unknown>) => string;

const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/** A cleared number input holds `null`; an optional field reads it as not given. */
const optionalNumberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => (value === null ? undefined : value), numberField(schema).optional());

/**
 * What the subject form accepts. The server's `SubjectDto` validates the same
 * payload again; this only spares the user a round trip. It takes `t` so a
 * refused field reads in the page's language.
 */
export const createSubjectSchema = (t: T) => {
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1, t('validationMessages.idCannotBeEmpty')).nullish().optional(),
  );

  return z.object({
    id: optionalId,
    code: z.string().trim().toUpperCase().min(2, t('validationMessages.subjectCodeMustBeAtLeast2Characters')).max(10, t('validationMessages.subjectCodeTooLong')),
    name: z.string().min(2, t('validationMessages.subjectNameMustBeAtLeast2Characters')).max(100, t('validationMessages.subjectNameTooLong')),
    description: z.string().max(500, t('validationMessages.descriptionTooLong')).optional(),
    gradeLevel: optionalNumberField(z.number({ error: t('validationMessages.mustBeAValidNumber') })
      .int(t('validationMessages.mustBeAnInteger'))
      .min(1, t('validationMessages.mustBeAtLeast', { value: 1 }))
      .max(12, t('validationMessages.cannotExceed', { value: 12 }))),
  });
};

export type SubjectFormValues = z.input<ReturnType<typeof createSubjectSchema>>;
