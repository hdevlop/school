import { z } from 'zod';
import { GENDER_VALUES, MASSAR_ABSENCE_VALUES, MASSAR_MAX_EXAMS_PER_TERM } from '@sms/contracts';
import type { MassarMark } from '@sms/contracts';

export const massarIdParam = z.object({ id: z.string().min(1).max(100) });
export const massarUploadDto = z.object({}); // The validation plugin restores uploaded File fields.
export const massarMappingDto = z.object({
  classes: z.array(z.object({ name: z.string().min(1), classId: z.string().nullable(), sectionId: z.string().nullable() })).max(200),
  subjects: z.array(z.object({ level: z.string(), code: z.string(), subjectId: z.string().nullable() })).max(300),
});
// "Same student" pairs and students to add, decided in the import check and applied with the import.
const studentDecisionsDto = {
  matches: z.array(z.object({ studentCode: z.string().min(1).max(50), studentId: z.string().min(1).max(50) })).max(500).default([]),
  additions: z.array(z.object({ studentCode: z.string().min(1).max(50), gender: z.enum(GENDER_VALUES) })).max(500).default([]),
  fixes: z.array(z.string().min(1).max(50)).max(500).default([]),
};
// The same decisions for a class already imported that still waits for students.
export const massarResolveDto = z.object({ massarClassId: z.string().min(1).max(50), matches: studentDecisionsDto.matches, additions: studentDecisionsDto.additions });
export type MassarResolve = z.infer<typeof massarResolveDto>;
export const massarCommitDto = massarMappingDto.extend({ previewId: z.string().uuid(), digest: z.string().length(64), addMissingSheets: z.boolean().default(true), ...studentDecisionsDto });
export const massarDueDateDto = z.object({ dueDate: z.iso.date().nullable() });
const examsPerTerm = z.number().int().min(1).max(MASSAR_MAX_EXAMS_PER_TERM);
/** The school's Contrôles of the year: how many per semester, and when marks are due. */
export const massarPlanDto = z.object({ primary: examsPerTerm, college: examsPerTerm,
  dates: z.array(z.object({ term: z.number().int().min(1).max(2), exam: examsPerTerm, dueDate: z.iso.date().nullable() })).max(2 * MASSAR_MAX_EXAMS_PER_TERM) });
export type MassarPlanInput = z.infer<typeof massarPlanDto>;
export const massarRoundDto = z.object({ term: z.number().int().min(1).max(2), exam: z.number().int().min(1).max(4), dueDate: z.iso.date().nullable().optional() });
export const massarAcceptanceDto = z.object({ receipt: z.string().min(1).max(100000) });
export const massarMarkDto = z.object({ studentId: z.string().min(1), componentCode: z.string().min(1), mark: z.number().min(0).max(20).nullable(), absence: z.enum(MASSAR_ABSENCE_VALUES) }).superRefine((value, ctx) => {
  if (value.mark !== null && value.absence === 'justified') ctx.addIssue({ code: 'custom', path: ['mark'], message: 'massar.errors.invalidMark' });
});
export const massarMarksDto = z.object({ revision: z.number().int().nonnegative(), marks: z.array(massarMarkDto).max(2500) });
export const massarRevisionDto = z.object({ revision: z.number().int().nonnegative() });
export const massarExportDto = z.object({ sheetIds: z.array(z.string().min(1)).min(1).max(400), empty: z.boolean().default(false) });
// One class's subjects, exported to check them; a class has a dozen subjects at most.
export const massarClassExportDto = z.object({ sheetIds: z.array(z.string().min(1)).min(1).max(30) });
export type MassarMappings = z.infer<typeof massarMappingDto>;
export type MassarCommit = z.input<typeof massarCommitDto>;
export type MassarRoundInput = z.infer<typeof massarRoundDto>;
export type MassarMarksInput = { revision: number; marks: MassarMark[] };
