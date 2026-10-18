import { z } from 'zod';
import { SCHEDULE_VALUES } from '@sms/contracts';
import { defaultSchoolYearCalendar, isDateOnly, parseSchoolYearLabel } from '@sms/contracts/academic-years';

type T = (key: string) => string;

const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/** A cleared number input holds `null`; an optional field reads it as not given. */
const optionalNumberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => (value === null ? undefined : value), numberField(schema).optional());

/**
 * Fees owed by a student.
 *
 * They take `t` so a refused field reads in the page's language; Zod's own
 * defaults are English.
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
export const createFeeSchemas = (t: T) => {
  const required = t('fees.validation.required');
  const tooLong = t('fees.validation.tooLong');
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1).nullish().optional(),
  );
  const requiredId = z.preprocess(
    (value) => value ?? '',
    z.string({ error: required }).min(1, required),
  );
  const optionalDateField = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, t('fees.validation.dateInvalid'))
    .nullable()
    .optional();
  const academicYearField = z
    .string()
    .min(9, required)
    .regex(/^\d{4}-\d{4}$/, t('fees.validation.academicYearInvalid'));
  const baseAmountField = () => optionalNumberField(
    z.number({ error: t('fees.validation.amountInvalid') }).positive(t('fees.validation.baseAmountPositive')),
  );
  /**
   * A discount left empty is no discount. A cleared number field reports
   * `undefined`, which an optional field would drop from the payload, and on an
   * edit a dropped discount keeps the old one while the form shows none.
   */
  const discountField = () =>
    z.preprocess(
      (value) => (value === undefined || value === null || (typeof value === 'string' && value.trim() === '') ? 0 : value),
      numberField(z.number({ error: t('fees.validation.amountInvalid') }).min(0, t('fees.validation.discountNegative'))),
    );
  const schedule = z.enum(SCHEDULE_VALUES, { error: required });
  /**
   * The discount is per period of a recurring fee and covers a one-time fee
   * whole, so it can never exceed the amount; the server refuses it too.
   */
  const discountWithinAmount = (
    data: { baseAmount?: number; discountAmount?: number },
    context: z.RefinementCtx,
  ) => {
    if (data.baseAmount !== undefined && (data.discountAmount ?? 0) > data.baseAmount) {
      context.addIssue({ code: 'custom', path: ['discountAmount'], message: t('fees.validation.discountTooLarge') });
    }
  };

  const feeFields = z.object({
    id: optionalId,
    studentId: requiredId,
    feeTypeId: requiredId,
    academicYear: academicYearField.optional(),
    effectiveDate: optionalDateField,
    schedule,
    baseAmount: baseAmountField(),
    discountAmount: discountField(),
    discountReason: z.string().max(500, tooLong).optional().nullable(),
    assignedBy: optionalId.nullable(),
    notes: z.string().max(1000, tooLong).optional().nullable(),
  });
  const fee = feeFields.superRefine(discountWithinAmount);

  /** One line of a bulk list: the student is named once, above the list. */
  const bulkFeeItem = feeFields.omit({ studentId: true }).superRefine(discountWithinAmount);
  const feeList = z.array(bulkFeeItem).min(1, t('fees.validation.feesRequired'));

  const bulkFeeForm = z.object({ studentId: requiredId, fees: feeList });

  /** The fee list alone — the full student wizard's fees step binds this. */
  const fees = z.object({ fees: feeList });

  /**
   * The same fee applied across a class. `sectionId` is optional: leaving it
   * empty means the whole class rather than one section.
   */
  const classBulkFeeForm = z.object({
    classId: requiredId,
    sectionId: optionalId,
    feeTypeId: requiredId,
    schedule,
    academicYear: academicYearField.optional(),
    effectiveDate: optionalDateField,
    baseAmount: baseAmountField(),
    discountAmount: discountField(),
    discountReason: z.string().max(500, tooLong).optional().nullable(),
    notes: z.string().max(1000, tooLong).optional().nullable(),
  }).superRefine((data, context) => {
    discountWithinAmount(data, context);
    if (data.academicYear && (!data.effectiveDate || !isDateOnly(data.effectiveDate))) {
      context.addIssue({ code: 'custom', path: ['effectiveDate'], message: t('fees.validation.chargeDateRequired') });
    }
    if (data.academicYear && data.effectiveDate && isDateOnly(data.effectiveDate) && parseSchoolYearLabel(data.academicYear)) {
      const calendar = defaultSchoolYearCalendar(data.academicYear);
      if (data.effectiveDate < calendar.instructionStartsOn || data.effectiveDate > calendar.instructionEndsOn) {
        context.addIssue({ code: 'custom', path: ['effectiveDate'], message: t('fees.validation.chargeDateInTerm') });
      }
    }
  });

  return { fee, bulkFeeItem, bulkFeeForm, fees, classBulkFeeForm };
};

type FeeSchemas = ReturnType<typeof createFeeSchemas>;
export type FeeFormValues = z.input<FeeSchemas['fee']>;
export type BulkFeeFormValues = z.input<FeeSchemas['bulkFeeForm']>;
export type FeesFormValues = z.input<FeeSchemas['fees']>;
export type ClassBulkFeeFormValues = z.input<FeeSchemas['classBulkFeeForm']>;
