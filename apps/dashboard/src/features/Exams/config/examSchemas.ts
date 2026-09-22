import { z } from 'zod';
import { EXAM_STATUS_VALUES, EXAM_TYPE_VALUES } from '@sms/contracts';

const optionalId = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1, 'ID cannot be empty').nullish().optional(),
);
const requiredId = z.preprocess(
  (value) => value ?? '',
  z.string().min(1, 'ID is required'),
);
const dateField = z.string().regex(
  /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
  'Date must be in YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-MM-YY, or DD-MM-YYYY format',
);
const timePattern = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?$/;
const timeField = z
  .union([
    z.literal('').transform(() => undefined),
    z.string().regex(timePattern, 'Time must be in HH:MM format').transform((value) => {
      const match = value.trim().match(timePattern);
      return match ? `${match[1].padStart(2, '0')}:${match[2]}` : value;
    }),
  ])
  .optional()
  .nullable();
const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/**
 * What the exam form accepts.
 *
 * Deliberately not the same as `assessmentSchema`: an exam has a start and end
 * time, a room, a minimum duration of half an hour, and no default marks. The
 * two share an enum family and nothing else, so they stay separate schemas.
 */
export const examSchema = z.object({
  classId: optionalId,
  sectionId: optionalId,
  sectionIds: z.array(requiredId).min(1, 'Select at least one section'),
  subjectId: requiredId,
  teacherId: requiredId,
  examId: optionalId,
  teacherAssignmentId: optionalId,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  type: z.enum(EXAM_TYPE_VALUES).default('midterm'),
  date: dateField,
  startTime: timeField,
  endTime: timeField,
  duration: numberField(z.number({ error: 'Must be a valid number' }).int('Must be an integer').min(30, 'Exam duration must be at least 30 minutes').max(480, 'Duration cannot exceed 8 hours')),
  totalMarks: numberField(z.number({ error: 'Must be a valid number' }).positive('Total marks must be greater than 0').max(1000, 'Total marks cannot exceed 1000')),
  passingMarks: numberField(z.number({ error: 'Must be a valid number' }).min(0, 'Passing marks must be non-negative').max(1000, 'Passing marks cannot exceed 1000')),
  roomNumber: numberField(z.number({ error: 'Must be a valid number' }).max(50, 'Room number too long')).optional().nullable(),
  instructions: z.string().max(2000, 'Instructions too long').optional().nullable(),
  status: z.enum(EXAM_STATUS_VALUES).default('scheduled'),
});

export type ExamFormValues = z.input<typeof examSchema>;
