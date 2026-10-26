import { z } from 'zod';
import { PAYMENT_TYPE_VALUES } from '@sms/contracts';

type T = (key: string) => string;

const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/**
 * A fee type — the template a student's actual fees are created from.
 *
 * `category` is a plain string rather than `z.enum(FEE_CATEGORY_VALUES)`, and
 * that is how it has always been: the column is text, the API accepts any
 * label, and a school that invents "swimming" should be able to use it. The
 * select offers the contract's categories as a convenience, not as a limit —
 * see `feeTypeOptions.ts`.
 */
export const createFeeTypeSchema = (t: T) => z.object({
  id: z.preprocess((value) => (value === '' ? undefined : value), z.string().min(1).nullish().optional()),
  name: z.string().min(2, t('feeTypes.validation.nameMinLength')).max(100, t('feeTypes.validation.tooLong')),
  image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
  description: z.string().max(500, t('feeTypes.validation.tooLong')).optional().nullable(),
  category: z.string(),
  amount: numberField(z.number({ error: t('feeTypes.validation.amountRequired') }).positive(t('feeTypes.validation.amountPositive')).max(1_000_00, t('feeTypes.validation.amountTooLarge'))),
  paymentType: z.enum(PAYMENT_TYPE_VALUES).default('recurring'),
});

export type FeeTypeFormValues = z.input<ReturnType<typeof createFeeTypeSchema>>;
