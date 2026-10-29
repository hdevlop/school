import { z } from 'zod';
import { isExamPlanningEntry, isExamPlanningJson, isExamPlanningMonth, MAX_EXAM_PLANNING_JSON_BYTES, normalizeExamPlanningEntry, normalizeExamPlanningJson, type ExamPlanningEntry, type ExamPlanningJson } from '@sms/contracts';

export const planningClassParam = z.object({ classId: z.string().min(1).max(100) });
export const saveExamPlanningDto = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  entries: z.array(z.custom<ExamPlanningEntry>(isExamPlanningEntry).transform(normalizeExamPlanningEntry)).max(200),
}).refine(value => isExamPlanningMonth(value.month, value.entries), 'Invalid month, dates or duplicate entry IDs');
export const importExamPlanningDto = z.object({ document: z.custom<ExamPlanningJson>(isExamPlanningJson).transform(normalizeExamPlanningJson) }).strict()
  .refine(value => new TextEncoder().encode(JSON.stringify(value.document)).byteLength <= MAX_EXAM_PLANNING_JSON_BYTES, 'JSON file exceeds 5 MB');
export const planningVisibilityDto = z.object({ classIds: z.array(z.string().min(1).max(100)).max(300) });
export type SaveExamPlanningDto = z.infer<typeof saveExamPlanningDto>;
