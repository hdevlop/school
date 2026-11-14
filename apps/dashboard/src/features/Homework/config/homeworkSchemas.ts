import { z } from 'zod';
import { HOMEWORK_LIMITS } from '@sms/contracts';

type T = (key: string, params?: Record<string, unknown>) => string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What the homework form accepts. It takes `t` so a refused field reads in
 * the page's language.
 *
 * This is form validation, not authorization: it shows a problem before a
 * request leaves the browser. `HomeworkDto` on the server validates the same
 * payload again and alone decides what is written, including whether the
 * teacher teaches the subject in every chosen section.
 *
 * A teacher posts as themselves, so their form has no teacher field and the
 * server ignores one. Anyone else must name the teacher.
 */
export const createHomeworkSchema = (t: T, { teacherRequired }: { teacherRequired: boolean }) => {
  const requiredId = z.preprocess(
    (value) => value ?? '',
    z.string().min(1, t('validationMessages.idIsRequired')),
  );
  const date = z.string().regex(ISO_DATE, t('validationMessages.dateMustBeInYyyyMmDdMmDd'));

  return z.object({
    classId: requiredId,
    sectionIds: z.array(requiredId).min(1, t('validationMessages.selectAtLeastOneSection')),
    subjectId: requiredId,
    // Offered only when the subject has parts in the class, and never required.
    subSubject: z.string().optional().nullable(),
    teacherId: z.preprocess(
      (value) => value ?? '',
      teacherRequired ? z.string().trim().min(1, t('homework.errors.teacherRequired')) : z.string(),
    ),
    title: z.string().trim()
      .min(3, t('validationMessages.titleMustBeAtLeast3Characters'))
      .max(HOMEWORK_LIMITS.title, t('validationMessages.titleTooLong')),
    content: z.string().trim().max(HOMEWORK_LIMITS.content, t('homework.errors.contentTooLong')).optional().nullable(),
    date,
    // The date input clears to '', which means "no due date".
    dueOn: z.preprocess((value) => (value === '' ? null : value), date.nullable().optional()),
  }).refine((data) => !data.dueOn || data.dueOn >= data.date, {
    path: ['dueOn'],
    message: t('homework.errors.dueBeforeGiven'),
  });
};

type HomeworkSchema = ReturnType<typeof createHomeworkSchema>;
export type HomeworkFormValues = z.input<HomeworkSchema>;
export type HomeworkSubmitValues = z.output<HomeworkSchema>;
