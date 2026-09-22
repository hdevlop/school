import { z } from 'zod';
import { ASSESSMENT_STATUS_VALUES, ASSESSMENT_TYPE_VALUES } from '@sms/contracts';

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
const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/**
 * What the assessment form accepts.
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
export const assessmentSchema = z.object({
  classId: requiredId,
  sectionId: optionalId,
  sectionIds: z.array(requiredId).min(1, 'Select at least one section'),
  subjectId: requiredId,
  teacherId: requiredId,
  teacherAssignmentId: optionalId,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  type: z.enum(ASSESSMENT_TYPE_VALUES).default('quiz'),
  date: dateField,
  duration: numberField(z.number({ error: 'Must be a valid number' }).int('Must be an integer').min(1, 'Duration must be at least 1 minute').max(480, 'Duration cannot exceed 8 hours')),
  totalMarks: numberField(z.number({ error: 'Must be a valid number' }).positive('Total marks must be greater than 0').max(1000, 'Total marks cannot exceed 1000')).default(20),
  passingMarks: numberField(z.number({ error: 'Must be a valid number' }).min(0, 'Passing marks must be non-negative').max(1000, 'Passing marks cannot exceed 1000')).default(10),
  instructions: z.string().max(2000, 'Instructions too long').optional().nullable(),
  status: z.enum(ASSESSMENT_STATUS_VALUES).default('scheduled'),
  assessmentId: optionalId,
});

export type AssessmentFormValues = z.input<typeof assessmentSchema>;
export type AssessmentSubmitValues = z.output<typeof assessmentSchema>;
