import { z } from 'zod';
import { COMPETENCY_LIMITS as limits, COMPETENCY_MONTH_PATTERN } from '@sms/contracts';
import { competencyLevelEnum, competencyRenameScopeEnum } from '../../shared/enums';

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

// A change to the list is made in the month the teacher is looking at, and applies from that month on.
export const createDomainDto = z.object({ teacherAssignmentId: requiredId, name, altName, month });
export const updateDomainDto = z.object({ name: name.optional(), altName: altName.optional(), position: position.optional() });

export const createCompetencyDto = z.object({ domainId: requiredId, name, altName, month });
export const updateCompetencyDto = z.object({
  name: name.optional(),
  altName: altName.optional(),
  position: position.optional(),
  // Moves the competency to another domain of the same list.
  domainId: z.string().min(1).optional(),
  // A rename of a competency rated in an earlier month says whether it corrects every month or starts from this one.
  month: month.optional(),
  scope: competencyRenameScopeEnum.optional(),
}).refine((value) => value.scope !== 'fromMonth' || !!value.month, { message: 'competencies.errors.invalidMonth', path: ['month'] });

// Removing a sub-domain or a competency ends it the month before, keeping the earlier months' levels.
export const monthQuery = z.object({ month });

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

// Levels and remarks set under the wrong month move to the right one, for one class and subject.
export const moveMonthDto = z.object({ teacherAssignmentId: requiredId, fromMonth: month, toMonth: month });

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
export type MonthQuery = z.infer<typeof monthQuery>;
export type MoveMonthDto = z.infer<typeof moveMonthDto>;
