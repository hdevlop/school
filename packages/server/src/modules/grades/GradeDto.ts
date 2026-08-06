import { z } from 'zod';
import { num, optionalId, requiredId } from '@server/shared/fields';
import { gradeStatusEnum } from '@server/shared/enums';

const gradeSchema = z.object({
  assessmentId: optionalId,
  examId: optionalId,
  teacherId: requiredId,
  subjectId: requiredId,
  sectionId: requiredId,
  studentId: requiredId,
  gradeId: requiredId,
  assessmentTitle: z.string().min(3, 'Assessment title must be at least 3 characters').max(200, 'Assessment title too long').optional(),
  marksObtained: num().min(0, 'Marks obtained must be non-negative').max(1000, 'Marks obtained cannot exceed 1000'),
  feedback: z.string().max(1000, 'Feedback too long').optional().nullable(),
  status: gradeStatusEnum.default('graded'),
});

const requireSingleGradeSource = (data: { assessmentId?: string | null; examId?: string | null }) =>
  Boolean(data.assessmentId) !== Boolean(data.examId);

export const createGradeDto = gradeSchema.omit({ gradeId: true }).refine(requireSingleGradeSource, {
  message: 'Select either an assessment or an exam',
  path: ['assessmentId'],
});
export const updateGradeDto = gradeSchema.omit({ gradeId: true }).partial();
export const seedGradeDto = z.object({
  id: requiredId.optional(),
  studentId: requiredId,
  assessmentId: optionalId,
  examId: optionalId,
  marksObtained: num().min(0, 'Marks obtained must be non-negative').max(1000, 'Marks obtained cannot exceed 1000'),
  feedback: z.string().max(1000, 'Feedback too long').optional().nullable(),
  status: gradeStatusEnum.default('graded'),
  gradedBy: z.string().min(1).optional().nullable(),
}).refine(requireSingleGradeSource, {
  message: 'Select either an assessment or an exam',
  path: ['assessmentId'],
}).passthrough();
export const seedGradesBulkDto = z.array(seedGradeDto);
export const deleteBulkGradeDto = z.array(z.string().min(1));

export const gradeIdParam = z.object({ id: z.string().min(1) });
export const assessmentIdParam = z.object({ assessmentId: z.string().min(1) });
export const examIdParam = z.object({ examId: z.string().min(1) });
export const studentIdParam = z.object({ studentId: z.string().min(1) });
export const sectionIdParam = z.object({ sectionId: z.string().min(1) });
export const subjectIdParam = z.object({ subjectId: z.string().min(1) });
export const teacherIdParam = z.object({ teacherId: z.string().min(1) });

export type CreateGradeDto = z.infer<typeof createGradeDto>;
export type UpdateGradeDto = z.infer<typeof updateGradeDto>;
export type SeedGradeDto = z.input<typeof seedGradeDto>;
export type DeleteBulkGradeDto = z.infer<typeof deleteBulkGradeDto>;
