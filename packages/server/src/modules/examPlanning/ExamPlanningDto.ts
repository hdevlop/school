import { z } from 'zod';
import { type ExamControlInput, isExamPlanningEntry, isExamPlanningJson, isExamPlanningMonth, MAX_EXAM_PLANNING_JSON_BYTES, normalizeExamPlanningEntry, normalizeExamPlanningJson, type ExamPlanningEntry, type ExamPlanningJson } from '@sms/contracts';

export const planningClassParam = z.object({ classId: z.string().min(1).max(100) });
export const saveExamPlanningDto = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  entries: z.array(z.custom<ExamPlanningEntry>(isExamPlanningEntry).transform(normalizeExamPlanningEntry)).max(200),
}).refine(value => isExamPlanningMonth(value.month, value.entries), 'Invalid month, dates or duplicate entry IDs');
export const importExamPlanningDto = z.object({ document: z.custom<ExamPlanningJson>(isExamPlanningJson).transform(normalizeExamPlanningJson) }).strict()
  .refine(value => new TextEncoder().encode(JSON.stringify(value.document)).byteLength <= MAX_EXAM_PLANNING_JSON_BYTES, 'JSON file exceeds 5 MB');
export const planningVisibilityDto = z.object({ classIds: z.array(z.string().min(1).max(100)).max(300) });
export type SaveExamPlanningDto = z.infer<typeof saveExamPlanningDto>;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** A Contrôle: its days, its classes and its subjects (none: every subject). The validator checks the rest. */
export const examControlDto = z.object({
  dateFrom: day,
  dateTo: day,
  classIds: z.array(z.string().min(1).max(100)).min(1).max(300).transform(ids => [...new Set(ids)]),
  subjectIds: z.array(z.string().min(1).max(100)).max(100).transform(ids => [...new Set(ids)]),
}).strict();
export const examControlParam = z.object({ id: z.string().min(1).max(100) });
/** Several Contrôles opened together: a week's fards of several subjects, or a class's fards copied to others. */
export const examControlsDto = z.object({ controls: z.array(examControlDto).min(1).max(300) }).strict();
// The schema above guarantees the contract's shape; z.infer loosens nullable fields here.
export type ExamControlDto = ExamControlInput;
/** Which School subject each Planning subject belongs to; null removes the link. */
export const addSubSubjectsDto = z.object({ add: z.array(z.object({ name: z.string().trim().min(1).max(120), subjectId: z.string().min(1).max(100) })).min(1).max(500) });
