import { z } from 'zod';
import { dateField, num, optionalId, requiredId } from '@server/shared/fields';
import { assessmentStatusEnum, assessmentTypeEnum } from '@server/shared/enums';

const assessmentSchema = z.object({
  classId: requiredId,
  sectionId: optionalId,
  sectionIds: z.array(requiredId).min(1, 'Select at least one section').optional(),
  subjectId: requiredId,
  teacherId: requiredId,
  teacherAssignmentId: optionalId,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  type: assessmentTypeEnum.default('quiz'),
  date: dateField,
  duration: num().int().min(1, 'Duration must be at least 1 minute').max(480, 'Duration cannot exceed 8 hours'),
  totalMarks: num().positive('Total marks must be greater than 0').max(1000, 'Total marks cannot exceed 1000'),
  passingMarks: num().min(0, 'Passing marks must be non-negative').max(1000, 'Passing marks cannot exceed 1000'),
  instructions: z.string().max(2000, 'Instructions too long').optional().nullable(),
  status: assessmentStatusEnum.default('scheduled'),
  assessmentId: optionalId,
});

export const createAssessmentDto = assessmentSchema
  .omit({ assessmentId: true })
  .refine((data) => Boolean(data.sectionId) || Boolean(data.sectionIds?.length), {
    message: 'Select at least one section',
    path: ['sectionIds'],
  });
export const updateAssessmentDto = assessmentSchema.omit({ assessmentId: true }).partial();
export const seedAssessmentDto = assessmentSchema
  .omit({ classId: true, sectionId: true, sectionIds: true, subjectId: true, teacherId: true, assessmentId: true })
  .extend({
    id: optionalId,
    teacherAssignmentId: requiredId,
  })
  .passthrough();
export const seedAssessmentsBulkDto = z.array(seedAssessmentDto);
export const deleteBulkAssessmentDto = z.array(z.string().min(1));

export const assessmentIdParam = z.object({ id: z.string().min(1) });
export const classIdParam = z.object({ classId: z.string().min(1) });
export const sectionIdParam = z.object({ sectionId: z.string().min(1) });
export const subjectIdParam = z.object({ subjectId: z.string().min(1) });
export const teacherIdParam = z.object({ teacherId: z.string().min(1) });

export type CreateAssessmentDto = z.infer<typeof createAssessmentDto>;
export type UpdateAssessmentDto = z.infer<typeof updateAssessmentDto>;
export type SeedAssessmentDto = z.input<typeof seedAssessmentDto>;
export type DeleteBulkAssessmentDto = z.infer<typeof deleteBulkAssessmentDto>;
