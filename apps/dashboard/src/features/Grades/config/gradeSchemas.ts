import { z } from 'zod';
import { GRADE_STATUS_VALUES } from '@sms/contracts';

import { num, optionalId, requiredId } from '@/shared/forms/fieldPrimitives';

/**
 * What the grade form accepts.
 *
 * A grade hangs off exactly one thing — an assessment or an exam — and the
 * form lets the user pick either, so the refinement below is the only thing
 * stopping a record that belongs to both or to neither. It reports against
 * `assessmentId` because that is the field the user sees first.
 */
export const gradeSchema = z
  .object({
    assessmentId: optionalId,
    examId: optionalId,
    teacherId: requiredId,
    subjectId: requiredId,
    sectionId: requiredId,
    studentId: requiredId,
    classId: optionalId,
    gradeId: optionalId,
    assessmentTitle: z.string().min(3, 'Assessment title must be at least 3 characters').max(200, 'Assessment title too long').optional(),
    marksObtained: num().min(0, 'Marks obtained must be non-negative').max(1000, 'Marks obtained cannot exceed 1000'),
    feedback: z.string().max(1000, 'Feedback too long').optional().nullable(),
    status: z.enum(GRADE_STATUS_VALUES).default('graded'),
  })
  .refine((data) => Boolean(data.assessmentId) !== Boolean(data.examId), {
    message: 'Select either an assessment or an exam',
    path: ['assessmentId'],
  });

export type GradeFormValues = z.input<typeof gradeSchema>;
