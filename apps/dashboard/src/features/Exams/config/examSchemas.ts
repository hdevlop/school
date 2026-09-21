import { z } from 'zod';
import { EXAM_STATUS_VALUES, EXAM_TYPE_VALUES } from '@sms/contracts';

import {
  dateField,
  num,
  optionalId,
  requiredId,
  timeField,
} from '@/shared/forms/fieldPrimitives';

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
  duration: num().int().min(30, 'Exam duration must be at least 30 minutes').max(480, 'Duration cannot exceed 8 hours'),
  totalMarks: num().positive('Total marks must be greater than 0').max(1000, 'Total marks cannot exceed 1000'),
  passingMarks: num().min(0, 'Passing marks must be non-negative').max(1000, 'Passing marks cannot exceed 1000'),
  roomNumber: num().max(50, 'Room number too long').optional().nullable(),
  instructions: z.string().max(2000, 'Instructions too long').optional().nullable(),
  status: z.enum(EXAM_STATUS_VALUES).default('scheduled'),
});

export type ExamFormValues = z.input<typeof examSchema>;
