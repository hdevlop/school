import { z } from 'zod';
import { COMPETENCY_LIMITS as limits, COMPETENCY_MONTH_PATTERN } from '@sms/contracts';
import { competencyLevelEnum } from '../../shared/enums';

// A plain string: `requiredId` preprocesses, which leaves the key optional in the inferred type.
const requiredId = z.string().min(1, 'ID is required');
const month = z.string().regex(COMPETENCY_MONTH_PATTERN, 'competencies.errors.invalidMonth');
const name = z.string().trim()
  .min(1, 'competencies.errors.nameRequired')
  .max(limits.name, 'competencies.errors.nameTooLong');
// Empty clears the second-language name.
const altName = z.string().trim().max(limits.name, 'competencies.errors.nameTooLong').nullish()
  .transform((value) => value || null);
const position = z.number().int().min(0).max(1000);

export const competencyIdParam = z.object({ id: z.string().min(1) });
export const competencyStudentParam = z.object({ studentId: z.string().min(1) });

export const catalogQuery = z.object({ teacherAssignmentId: requiredId });

export const createDomainDto = z.object({ teacherAssignmentId: requiredId, name, altName });
export const updateDomainDto = z.object({ name: name.optional(), altName: altName.optional(), position: position.optional() });

export const createCompetencyDto = z.object({ domainId: requiredId, name, altName });
export const updateCompetencyDto = z.object({
  name: name.optional(),
  altName: altName.optional(),
  position: position.optional(),
  // Moves the competency to another domain of the same list.
  domainId: z.string().min(1).optional(),
});

export const copyCatalogDto = z.object({ fromAssignmentId: requiredId, toAssignmentId: requiredId });

export const applyDefaultDto = z.object({ teacherAssignmentId: requiredId });

export const evaluationsQuery = z.object({ teacherAssignmentId: requiredId, month });
export const setEvaluationDto = z.object({
  competencyId: requiredId,
  studentId: requiredId,
  month,
  // null sets the pupil back to Non évalué.
  level: competencyLevelEnum.nullable(),
});

// Empty clears the remark.
export const setRemarkDto = z.object({
  teacherAssignmentId: requiredId,
  studentId: requiredId,
  month,
  body: z.string().trim().max(limits.remark, 'competencies.errors.remarkTooLong'),
});

export const studentSheetQuery = z.object({ month, subjectId: z.string().min(1).optional() });

export type CreateDomainDto = z.infer<typeof createDomainDto>;
export type UpdateDomainDto = z.infer<typeof updateDomainDto>;
export type CreateCompetencyDto = z.infer<typeof createCompetencyDto>;
export type UpdateCompetencyDto = z.infer<typeof updateCompetencyDto>;
export type CopyCatalogDto = z.infer<typeof copyCatalogDto>;
export type ApplyDefaultDto = z.infer<typeof applyDefaultDto>;
export type EvaluationsQuery = z.infer<typeof evaluationsQuery>;
export type SetEvaluationDto = z.infer<typeof setEvaluationDto>;
export type SetRemarkDto = z.infer<typeof setRemarkDto>;
export type StudentSheetQuery = z.infer<typeof studentSheetQuery>;
