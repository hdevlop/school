import { z } from 'zod';
import { ASSESSMENT_STATUS_VALUES, ASSESSMENT_TYPE_VALUES } from '@sms/contracts';

type T = (key: string) => string;

const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/**
 * What the assessment form accepts. It takes `t` so a refused field reads in
 * the page's language.
 *
 * This is form validation, not authorization: it exists so the user sees a
 * problem before a request leaves the browser. `AssessmentDto` on the server
 * decides what is actually written, and it validates the same payload again
 * without trusting anything here.
 *
 * The enum members come from `@sms/contracts`, which is also where the DTO and
 * the `pgEnum` column get them — so a type the form offers is a type the API
 * accepts, by construction rather than by review.
 */
export const createAssessmentSchema = (t: T) => {
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
  const validNumber = () => z.number({ error: t('validationMessages.mustBeAValidNumber') });

  return z.object({
    classId: requiredId,
    sectionId: optionalId,
    sectionIds: z.array(requiredId).min(1, t('validationMessages.selectAtLeastOneSection')),
    subjectId: requiredId,
    teacherId: requiredId,
    teacherAssignmentId: optionalId,
    title: z.string().min(3, t('validationMessages.titleMustBeAtLeast3Characters')).max(200, t('validationMessages.titleTooLong')),
    description: z.string().max(1000, t('validationMessages.descriptionTooLong')).optional().nullable(),
    type: z.enum(ASSESSMENT_TYPE_VALUES).default('quiz'),
    date: dateField,
    duration: numberField(validNumber().int(t('validationMessages.mustBeAnInteger'))
      .min(1, t('validationMessages.durationMustBeAtLeast1Minute'))
      .max(480, t('validationMessages.durationCannotExceed8Hours'))),
    totalMarks: numberField(validNumber().positive(t('validationMessages.totalMarksMustBeGreaterThan0'))
      .max(1000, t('validationMessages.totalMarksCannotExceed1000'))).default(20),
    passingMarks: numberField(validNumber().min(0, t('validationMessages.passingMarksMustBeNonNegative'))
      .max(1000, t('validationMessages.passingMarksCannotExceed1000'))).default(10),
    instructions: z.string().max(2000, t('validationMessages.instructionsTooLong')).optional().nullable(),
    status: z.enum(ASSESSMENT_STATUS_VALUES).default('scheduled'),
    assessmentId: optionalId,
  });
};

type AssessmentSchema = ReturnType<typeof createAssessmentSchema>;
export type AssessmentFormValues = z.input<AssessmentSchema>;
export type AssessmentSubmitValues = z.output<AssessmentSchema>;
