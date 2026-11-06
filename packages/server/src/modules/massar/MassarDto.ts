import { z } from 'zod';
import { MASSAR_ABSENCE_VALUES } from '@sms/contracts';
import type { MassarMark } from '@sms/contracts';

export const massarIdParam = z.object({ id: z.string().min(1).max(100) });
export const massarUploadDto = z.object({}); // The validation plugin restores uploaded File fields.
export const massarMappingDto = z.object({
  classes: z.array(z.object({ name: z.string().min(1), classId: z.string().nullable(), sectionId: z.string().nullable() })).max(200),
  subjects: z.array(z.object({ level: z.string(), code: z.string(), subjectId: z.string().nullable() })).max(300),
});
export const massarCommitDto = massarMappingDto.extend({ previewId: z.string().uuid(), digest: z.string().length(64), addMissingSheets: z.boolean().default(true) });
export const massarRoundDto = z.object({ term: z.number().int().min(1).max(2), exam: z.number().int().min(1).max(9), termLabel: z.string().min(1).max(150), examLabel: z.string().min(1).max(150) });
export const massarMarkDto = z.object({ studentId: z.string().min(1), componentCode: z.string().min(1), mark: z.number().min(0).max(20).nullable(), absence: z.enum(MASSAR_ABSENCE_VALUES) }).superRefine((value, ctx) => {
  if (value.mark !== null && value.absence === 'justified') ctx.addIssue({ code: 'custom', path: ['mark'], message: 'massar.errors.invalidMark' });
});
export const massarMarksDto = z.object({ revision: z.number().int().nonnegative(), marks: z.array(massarMarkDto).max(2500) });
export const massarRevisionDto = z.object({ revision: z.number().int().nonnegative() });
export const massarExportDto = z.object({ sheetIds: z.array(z.string().min(1)).min(1).max(400), empty: z.boolean().default(false) });
export const massarEnrollmentDto = z.object({ studentId: z.string().min(1), massarClassId: z.string().min(1) });
export const massarLeavingDto = z.object({ leftOn: z.iso.date() });
export type MassarMappings = z.infer<typeof massarMappingDto>;
export type MassarCommit = z.infer<typeof massarCommitDto>;
export type MassarRoundInput = z.infer<typeof massarRoundDto>;
export type MassarMarksInput = { revision: number; marks: MassarMark[] };
