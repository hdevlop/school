import { z } from 'zod';
import { academicYearField, optionalId } from '../../shared/fields';

const classSchema = z.object({
  id: optionalId,
  name: z.string().min(1, 'Class name is required').max(50, 'Class name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  level: z.string().min(1, 'Class level is required'),
  cycleId: z.string().min(1).optional().nullable(),
});

// A class takes the selected year when it is created and keeps it: the
// request's year, never a field, decides it.
export const createClassDto = classSchema.omit({ id: true });
// Trusted seed data spans years, so each class names its own.
export const createClassesBulkDto = z.array(createClassDto.extend({ academicYear: academicYearField }));
export const updateClassDto = createClassDto.partial();
export const classIdParam = z.object({ id: z.string().min(1) });

export type CreateClassDto = z.infer<typeof createClassDto>;
export type UpdateClassDto = z.infer<typeof updateClassDto>;
export type CreateClassesBulkDto = z.infer<typeof createClassesBulkDto>;
