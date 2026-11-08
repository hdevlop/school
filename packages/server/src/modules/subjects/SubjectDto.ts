import { z } from 'zod';
import { num, optionalId } from '../../shared/fields';

const subjectSchema = z.object({
  id: optionalId,
  code: z.string().trim().toUpperCase().min(2, 'Subject code must be at least 2 characters').max(10, 'Subject code too long'),
  name: z.string().min(2, 'Subject name must be at least 2 characters').max(100, 'Subject name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  gradeLevel: num().int().min(1).max(12).optional(),
  // The whole list, in order: a missing one is removed, one without id is added.
  subSubjects: z.array(z.object({ id: z.string().min(1).optional(), name: z.string().trim().min(1).max(120) })).max(80).optional(),
});

export const createSubjectDto = subjectSchema.omit({ id: true });
// The catalogue lists each subject's default sub-subjects by name.
export const createSubjectsBulkDto = z.array(createSubjectDto.omit({ subSubjects: true }).extend({ subSubjects: z.array(z.string().trim().min(1).max(120)).max(80).optional() }));
export const updateSubjectDto = createSubjectDto.partial();
export const subjectIdParam = z.object({ id: z.string().min(1) });

export type CreateSubjectDto = z.infer<typeof createSubjectDto>;
export type UpdateSubjectDto = z.infer<typeof updateSubjectDto>;
export type CreateSubjectsBulkDto = z.infer<typeof createSubjectsBulkDto>;
