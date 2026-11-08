import { z } from 'zod';
import { MASSAR_ABSENCE_VALUES, isValidMassarMark } from '@sms/contracts';
export const massarEntrySchema = (maxMark: number, t: (key: string) => string = key => key) => z.object({
  mark: z.number().nullable(), absence: z.enum(MASSAR_ABSENCE_VALUES),
}).refine(value => isValidMassarMark(value.mark ?? null, value.absence, maxMark), { message: t('massar.errors.invalidMark') });

export const massarRoundSchema = z.object({
  term: z.coerce.number().int().min(1).max(2), exam: z.coerce.number().int().min(1).max(4),
  dueDate: z.iso.date().nullable().optional(),
});
