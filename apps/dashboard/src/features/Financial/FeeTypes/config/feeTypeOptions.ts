import { FEE_CATEGORY_VALUES, PAYMENT_TYPE_VALUES } from '@sms/contracts';
import type { FeeCategory, PaymentType } from '@sms/contracts';

import {
  optionsFromValues,
  withStoredValue,
  type EnumOption,
  type Translate,
} from '@/shared/forms/enumOptions';

/** The selects on the fee-type form. */

export const FEE_CATEGORY_TRANSLATION_PREFIX = 'feeTypes.category';
export const PAYMENT_TYPE_TRANSLATION_PREFIX = 'payments.type';

/**
 * The categories the dashboard suggests.
 *
 * `feeTypeSchema.category` is a free string, so this list is a shortlist
 * rather than a contract — a fee type created elsewhere may legitimately carry
 * a category that is not here, which is why the edit variant below keeps the
 * stored one selectable.
 */
export const buildFeeCategoryOptions = (t: Translate): readonly EnumOption<FeeCategory>[] =>
  optionsFromValues(FEE_CATEGORY_VALUES, t, FEE_CATEGORY_TRANSLATION_PREFIX);

export const buildFeeCategoryOptionsFor = (
  t: Translate,
  storedValue?: string | null,
): readonly EnumOption<FeeCategory>[] =>
  withStoredValue(buildFeeCategoryOptions(t), storedValue, (value) =>
    t(`${FEE_CATEGORY_TRANSLATION_PREFIX}.${value}`),
  );

export const buildPaymentTypeOptions = (t: Translate): readonly EnumOption<PaymentType>[] =>
  optionsFromValues(PAYMENT_TYPE_VALUES, t, PAYMENT_TYPE_TRANSLATION_PREFIX);
