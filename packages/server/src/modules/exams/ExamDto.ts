import { z } from 'zod';
import { dateField, num, optionalId, requiredId, timeField } from '@server/shared/fields';
import { examStatusEnum, examTypeEnum } from '@server/shared/enums';

const examSchema = z.object({
  classId: optionalId,
  sectionId: optionalId,
  sectionIds: z.array(requiredId).min(1, 'Select at least one section').optional(),
  subjectId: requiredId,
  teacherId: requiredId,
  examId: requiredId,
  teacherAssignmentId: requiredId,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  type: examTypeEnum.default('midterm'),
  date: dateField,
  startTime: timeField,
  endTime: timeField,
  duration: num().int().min(30, 'Exam duration must be at least 30 minutes').max(480, 'Duration cannot exceed 8 hours'),
  totalMarks: num().positive('Total marks must be greater than 0').max(1000, 'Total marks cannot exceed 1000').default(20),
  passingMarks: num().min(0, 'Passing marks must be non-negative').max(1000, 'Passing marks cannot exceed 1000').default(10),
  roomNumber: num().max(50, 'Room number too long').optional().nullable(),
  instructions: z.string().max(2000, 'Instructions too long').optional().nullable(),
  status: examStatusEnum.default('scheduled'),
});

export const createExamDto = examSchema
  .omit({ examId: true, teacherAssignmentId: true })
  .refine((data) => Boolean(data.sectionId) || Boolean(data.sectionIds?.length), {
    message: 'Select at least one section',
    path: ['sectionIds'],
  });
export const updateExamDto = examSchema.omit({ examId: true, teacherAssignmentId: true }).partial();
export const seedExamDto = examSchema
  .omit({ classId: true, sectionId: true, sectionIds: true, subjectId: true, teacherId: true, examId: true })
  .extend({
    id: optionalId,
    teacherAssignmentId: requiredId,
  })
  .passthrough();
export const seedExamsBulkDto = z.array(seedExamDto);
export const deleteBulkExamDto = z.array(z.string().min(1));

export const examIdParam = z.object({ id: z.string().min(1) });
export const sectionIdParam = z.object({ sectionId: z.string().min(1) });
export const subjectIdParam = z.object({ subjectId: z.string().min(1) });
export const teacherIdParam = z.object({ teacherId: z.string().min(1) });

export type CreateExamDto = z.infer<typeof createExamDto>;
export type UpdateExamDto = z.infer<typeof updateExamDto>;
export type SeedExamDto = z.input<typeof seedExamDto>;
export type DeleteBulkExamDto = z.infer<typeof deleteBulkExamDto>;
