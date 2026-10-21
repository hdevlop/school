import { z } from 'zod';
import { SECTION_STATUS_VALUES } from '@sms/contracts';

type T = (key: string) => string;

const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/** Both a new input and a cleared input represent an omitted optional number. */
const optionalNumberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => (value === null || (typeof value === 'string' && value.trim() === '') ? undefined : value), numberField(schema).optional());

/**
 * What the section form accepts. It takes `t` so a refused field reads in the
 * page's language.
 *
 * `roomNumber` is a number here although the column is text — the form has
 * always coerced it, and changing that would change what the API receives.
 */
export const createSectionSchema = (t: T) => {
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1, t('validationMessages.idCannotBeEmpty')).nullish().optional(),
  );
  const requiredId = z.preprocess(
    (value) => value ?? '',
    z.string().min(1, t('validationMessages.idIsRequired')),
  );
  const validNumber = { error: t('validationMessages.mustBeAValidNumber') };

  return z.object({
    id: optionalId,
    classId: requiredId,
    name: z.string().min(1, t('validationMessages.sectionNameIsRequired')).max(10, t('validationMessages.sectionNameTooLong')),
    maxStudents: numberField(z.number(validNumber).int(t('validationMessages.mustBeAnInteger'))
      .min(1, t('validationMessages.maxStudentsMustBeAtLeast1'))
      .max(100, t('validationMessages.maxStudentsCannotExceed100'))).default(30),
    roomNumber: optionalNumberField(z.number(validNumber).max(10000, t('validationMessages.roomNumberTooLong'))),
    status: z.enum(SECTION_STATUS_VALUES).default('active'),
  });
};

export type SectionFormValues = z.input<ReturnType<typeof createSectionSchema>>;
