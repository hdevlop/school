import { z } from 'zod';
import { EXAM_STATUS_VALUES, EXAM_TYPE_VALUES } from '@sms/contracts';

type T = (key: string) => string;

const timePattern = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?$/;
const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/**
 * What the exam form accepts. It takes `t` so a refused field reads in the
 * page's language.
 *
 * Deliberately not the same as the assessment schema: an exam has a start and
 * end time, a room, a minimum duration of half an hour, and no default marks.
 * The two share an enum family and nothing else, so they stay separate schemas.
 */
export const createExamSchema = (t: T) => {
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
  const validNumber = () => z.number({ error: t('validationMessages.mustBeAValidNumber') });

  return z.object({
    classId: optionalId,
    sectionId: optionalId,
    sectionIds: z.array(requiredId).min(1, t('validationMessages.selectAtLeastOneSection')),
    subjectId: requiredId,
    teacherId: requiredId,
    examId: optionalId,
    teacherAssignmentId: optionalId,
    title: z.string().min(3, t('validationMessages.titleMustBeAtLeast3Characters')).max(200, t('validationMessages.titleTooLong')),
    description: z.string().max(1000, t('validationMessages.descriptionTooLong')).optional().nullable(),
    type: z.enum(EXAM_TYPE_VALUES).default('midterm'),
    date: dateField,
    startTime: timeField,
    endTime: timeField,
    duration: numberField(validNumber().int(t('validationMessages.mustBeAnInteger'))
      .min(30, t('validationMessages.examDurationMustBeAtLeast30Minutes'))
      .max(480, t('validationMessages.durationCannotExceed8Hours'))),
    totalMarks: numberField(validNumber().positive(t('validationMessages.totalMarksMustBeGreaterThan0'))
      .max(1000, t('validationMessages.totalMarksCannotExceed1000'))),
    passingMarks: numberField(validNumber().min(0, t('validationMessages.passingMarksMustBeNonNegative'))
      .max(1000, t('validationMessages.passingMarksCannotExceed1000'))),
    roomNumber: numberField(validNumber().max(50, t('validationMessages.roomNumberTooLong'))).optional().nullable(),
    instructions: z.string().max(2000, t('validationMessages.instructionsTooLong')).optional().nullable(),
    status: z.enum(EXAM_STATUS_VALUES).default('scheduled'),
  });
};

export type ExamFormValues = z.input<ReturnType<typeof createExamSchema>>;
