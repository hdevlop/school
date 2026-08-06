import { z } from 'zod';
import { academicYearField, optionalId } from '@server/shared/fields';

const classSchema = z.object({
  id: optionalId,
  name: z.string().min(1, 'Class name is required').max(50, 'Class name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  academicYear: academicYearField,
  level: z.string().min(1, 'Class level is required'),
  cycleId: z.string().min(1).optional().nullable(),
});

export const createClassDto = classSchema.omit({ id: true });
export const createClassesBulkDto = z.array(createClassDto);
export const updateClassDto = createClassDto.partial();
export const classIdParam = z.object({ id: z.string().min(1) });

export type CreateClassDto = z.infer<typeof createClassDto>;
export type UpdateClassDto = z.infer<typeof updateClassDto>;
export type CreateClassesBulkDto = z.infer<typeof createClassesBulkDto>;
