import { z } from 'zod';
import {
  disciplineActionEnum,
  disciplineCategoryEnum,
  disciplineSeverityEnum,
} from '@server/shared/enums';

const requiredId = z.string().min(1, 'ID is required');
const incidentAt = z.string().datetime({ offset: true, message: 'Incident date must be a valid ISO timestamp' });

export const createDisciplineDto = z.object({
  studentId: requiredId,
  incidentAt,
  category: disciplineCategoryEnum,
  severity: disciplineSeverityEnum,
  location: z.string().trim().max(150, 'Location is too long').optional().nullable(),
  description: z.string().trim().min(1, 'Description is required').max(2000, 'Description is too long'),
});

export const updateDisciplineDto = z.object({
  studentId: requiredId.optional(),
  incidentAt: incidentAt.optional(),
  category: disciplineCategoryEnum.optional(),
  severity: disciplineSeverityEnum.optional(),
  location: z.string().trim().max(150, 'Location is too long').optional().nullable(),
  description: z.string().trim().min(1, 'Description is required').max(2000, 'Description is too long').optional(),
});

export const resolveDisciplineDto = z.object({
  actionType: disciplineActionEnum,
  actionNote: z.string().trim().max(1000, 'Action note is too long').optional().nullable(),
  resolutionNote: z.string().trim().min(1, 'Resolution note is required').max(2000, 'Resolution note is too long'),
});

export const disciplineIdParam = z.object({ id: requiredId });

export type CreateDisciplineDto = z.infer<typeof createDisciplineDto>;
export type UpdateDisciplineDto = z.infer<typeof updateDisciplineDto>;
export type ResolveDisciplineDto = z.infer<typeof resolveDisciplineDto>;
