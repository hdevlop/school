import { z } from 'zod';
import { num, optionalId, requiredId } from '@server/shared/fields';
import { sectionStatusEnum } from '@server/shared/enums';

const sectionSchema = z.object({
  id: optionalId,
  classId: requiredId,
  name: z.string().min(1, 'Section name is required').max(10, 'Section name too long'),
  maxStudents: num().int().min(1, 'Max students must be at least 1').max(100, 'Max students cannot exceed 100').default(30),
  roomNumber: num().max(10000, 'Room number too long').optional(),
  status: sectionStatusEnum.default('active'),
});

export const createSectionDto = sectionSchema.omit({ id: true });
export const createSectionsBulkDto = z.array(createSectionDto);
export const updateSectionDto = createSectionDto.partial();
export const sectionIdParam = z.object({ id: z.string().min(1) });

export type CreateSectionDto = z.infer<typeof createSectionDto>;
export type UpdateSectionDto = z.infer<typeof updateSectionDto>;
export type CreateSectionsBulkDto = z.infer<typeof createSectionsBulkDto>;
