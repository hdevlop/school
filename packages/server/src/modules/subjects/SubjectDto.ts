import { z } from 'zod';
import { num, optionalId } from '@server/shared/fields';

const subjectSchema = z.object({
  id: optionalId,
  code: z.string().min(2, 'Subject code must be at least 2 characters').max(10, 'Subject code too long'),
  name: z.string().min(2, 'Subject name must be at least 2 characters').max(100, 'Subject name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  gradeLevel: num().int().min(1).max(12).optional(),
});

export const createSubjectDto = subjectSchema.omit({ id: true });
export const createSubjectsBulkDto = z.array(createSubjectDto);
export const updateSubjectDto = createSubjectDto.partial();
export const subjectIdParam = z.object({ id: z.string().min(1) });

export type CreateSubjectDto = z.infer<typeof createSubjectDto>;
export type UpdateSubjectDto = z.infer<typeof updateSubjectDto>;
export type CreateSubjectsBulkDto = z.infer<typeof createSubjectsBulkDto>;
