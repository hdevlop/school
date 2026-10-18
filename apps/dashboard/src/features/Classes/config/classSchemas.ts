import { z } from 'zod';

type T = (key: string) => string;

/**
 * What the class form accepts. `level` is a free string rather than an enum:
 * the levels a school runs are its own, and the API stores whatever it is told.
 * There is no year field: a new class takes the year being viewed, which the
 * request carries, and keeps it. It takes `t` so a refused field reads in the
 * page's language.
 */
export const createClassSchema = (t: T) => {
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1, t('validationMessages.idCannotBeEmpty')).nullish().optional(),
  );

  return z.object({
    id: optionalId,
    name: z.string().min(1, t('validationMessages.classNameIsRequired')).max(50, t('validationMessages.classNameTooLong')),
    description: z.string().max(500, t('validationMessages.descriptionTooLong')).optional(),
    level: z.string().min(1, t('validationMessages.classLevelIsRequired')),
    cycleId: z.preprocess(
      (value) => value === '__none__' || value === '' ? null : value,
      z.string().min(1).nullish(),
    ),
  });
};

export type ClassFormValues = z.input<ReturnType<typeof createClassSchema>>;
