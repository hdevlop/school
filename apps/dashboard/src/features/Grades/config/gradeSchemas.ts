import { z } from 'zod';
import { GRADE_STATUS_VALUES } from '@sms/contracts';

type T = (key: string) => string;

const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/**
 * What the grade form accepts. It takes `t` so a refused field reads in the
 * page's language.
 *
 * A grade hangs off exactly one thing — an assessment or an exam — and the
 * form lets the user pick either, so the refinement below is the only thing
 * stopping a record that belongs to both or to neither. It reports against
 * `assessmentId` because that is the field the user sees first.
 */
export const createGradeSchema = (t: T) => {
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1, t('validationMessages.idCannotBeEmpty')).nullish().optional(),
  );
  const requiredId = z.preprocess(
    (value) => value ?? '',
    z.string().min(1, t('validationMessages.idIsRequired')),
  );

  return z
    .object({
      assessmentId: optionalId,
      examId: optionalId,
      teacherId: requiredId,
      subjectId: requiredId,
      sectionId: requiredId,
      studentId: requiredId,
      classId: optionalId,
      gradeId: optionalId,
      assessmentTitle: z.string()
        .min(3, t('validationMessages.assessmentTitleMustBeAtLeast3Characters'))
        .max(200, t('validationMessages.assessmentTitleTooLong')).optional(),
      marksObtained: numberField(z.number({ error: t('validationMessages.mustBeAValidNumber') })
        .min(0, t('validationMessages.marksObtainedMustBeNonNegative'))
        .max(1000, t('validationMessages.marksObtainedCannotExceed1000'))),
      feedback: z.string().max(1000, t('validationMessages.feedbackTooLong')).optional().nullable(),
      status: z.enum(GRADE_STATUS_VALUES).default('graded'),
    })
    .refine((data) => Boolean(data.assessmentId) !== Boolean(data.examId), {
      message: t('validationMessages.selectEitherAnAssessmentOrAnExam'),
      path: ['assessmentId'],
    });
};

export type GradeFormValues = z.input<ReturnType<typeof createGradeSchema>>;
