import { describe, expect, it } from 'bun:test';
import { FEE_CATEGORY_VALUES, FEE_TYPE_STATUS_VALUES, PAYMENT_TYPE_VALUES } from '@sms/contracts';

import { buildFeeCategoryOptionsFor, buildPaymentTypeOptions } from './feeTypeOptions';
import { feeTypeSchema } from './feeTypeSchemas';

const echo = (key: string) => key;

const feeType = { name: 'Tuition', category: 'tuition', amount: 1200 };

describe('feeTypeSchema', () => {
  it('defaults to a recurring, active fee type', () => {
    const parsed = feeTypeSchema.parse(feeType);

    expect(parsed.paymentType).toBe('recurring');
    expect(parsed.status).toBe('active');
  });

  it('accepts every payment type and status the API accepts', () => {
    for (const paymentType of PAYMENT_TYPE_VALUES) {
      expect(feeTypeSchema.safeParse({ ...feeType, paymentType }).success).toBe(true);
    }
    for (const status of FEE_TYPE_STATUS_VALUES) {
      expect(feeTypeSchema.safeParse({ ...feeType, status }).success).toBe(true);
    }
  });

  /**
   * Category is free text on purpose — the column is text and the API takes
   * what it is given, so a school that runs a swimming programme can file
   * against it.
   */
  it('accepts a category the shortlist does not suggest', () => {
    expect(feeTypeSchema.safeParse({ ...feeType, category: 'swimming' }).success).toBe(true);
  });

  it('coerces the amount and holds it inside the allowed range', () => {
    expect(feeTypeSchema.parse({ ...feeType, amount: '1200' }).amount).toBe(1200);
    expect(feeTypeSchema.safeParse({ ...feeType, amount: 0 }).success).toBe(false);
    expect(feeTypeSchema.safeParse({ ...feeType, amount: 200_000 }).success).toBe(false);
  });
});

describe('fee type option builders', () => {
  it('suggests the contract categories, in contract order', () => {
    expect(buildFeeCategoryOptionsFor(echo).map((option) => option.value)).toEqual([
      ...FEE_CATEGORY_VALUES,
    ]);
  });

  it('keeps an unsuggested stored category selectable when editing', () => {
    const options = buildFeeCategoryOptionsFor(echo, 'swimming');

    expect(options).toHaveLength(FEE_CATEGORY_VALUES.length + 1);
    expect(options.at(-1)).toEqual({
      value: 'swimming' as never,
      label: 'feeTypes.category.swimming',
    });
  });

  it('offers both payment types, labelled from payments.type', () => {
    expect(buildPaymentTypeOptions(echo)).toEqual([
      { value: 'recurring', label: 'payments.type.recurring' },
      { value: 'oneTime', label: 'payments.type.oneTime' },
    ]);
  });
});
