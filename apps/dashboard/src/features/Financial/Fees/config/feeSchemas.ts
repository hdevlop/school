import { z } from 'zod';
import { SCHEDULE_VALUES } from '@sms/contracts';

const optionalId = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1, 'ID cannot be empty').nullish().optional(),
);
const requiredId = z.preprocess(
  (value) => value ?? '',
  z.string().min(1, 'ID is required'),
);
const optionalDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .nullable()
  .optional();
const academicYearField = z
  .string()
  .min(9, 'Academic year is required')
  .regex(/^\d{4}-\d{4}$/, 'Academic year must be in YYYY-YYYY format');
const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/**
 * Fees owed by a student.
 *
 * Four shapes, deliberately kept apart even though they overlap, because the
 * four screens answer different questions:
 *
 * - `feeSchema` — one fee for one student (the edit dialog);
 * - `bulkFeeFormSchema` — several fees for one student (enrolment, the fees tab);
 * - `feesSchema` — the fee list on its own, as a wizard step;
 * - `classBulkFeeFormSchema` — one fee for every student in a class or section.
 *
 * Note what is *not* here: `status` and `netAmount`. The server recalculates
 * both from the installments and the payments allocated against them, so the
 * form neither sends nor owns them. The edit dialog does show a status select,
 * and this schema quietly drops what it submits — see `feeOptions.ts`.
 */
export const feeSchema = z.object({
  id: optionalId,
  studentId: requiredId,
  feeTypeId: requiredId,
  academicYear: academicYearField.optional(),
  effectiveDate: optionalDateField,
  schedule: z.enum(SCHEDULE_VALUES),
  baseAmount: numberField(z.number({ error: 'Must be a valid number' }).positive('Base amount must be positive')).optional(),
  discountAmount: numberField(z.number({ error: 'Must be a valid number' }).min(0, 'Discount cannot be negative')).optional(),
  discountReason: z.string().max(500, 'Discount reason too long').optional().nullable(),
  assignedBy: optionalId.nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

/** One line of a bulk list: the student is named once, above the list. */
export const bulkFeeItemSchema = feeSchema.omit({ studentId: true });

export const bulkFeeFormSchema = z.object({
  studentId: requiredId,
  fees: z.array(bulkFeeItemSchema).min(1, 'At least one fee is required'),
});

/** The fee list alone — the full student wizard's fees step binds this. */
export const feesSchema = z.object({
  fees: z.array(bulkFeeItemSchema).min(1, 'At least one fee is required'),
});

/**
 * The same fee applied across a class. `sectionId` is optional: leaving it
 * empty means the whole class rather than one section.
 */
export const classBulkFeeFormSchema = z.object({
  classId: requiredId,
  sectionId: optionalId,
  feeTypeId: requiredId,
  schedule: z.enum(SCHEDULE_VALUES),
  academicYear: academicYearField.optional(),
  baseAmount: numberField(z.number({ error: 'Must be a valid number' }).positive('Base amount must be positive')).optional(),
  discountAmount: numberField(z.number({ error: 'Must be a valid number' }).min(0, 'Discount cannot be negative')).optional(),
  discountReason: z.string().max(500, 'Discount reason too long').optional().nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export type FeeFormValues = z.input<typeof feeSchema>;
export type BulkFeeFormValues = z.input<typeof bulkFeeFormSchema>;
export type FeesFormValues = z.input<typeof feesSchema>;
export type ClassBulkFeeFormValues = z.input<typeof classBulkFeeFormSchema>;
