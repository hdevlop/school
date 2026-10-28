import { describe, expect, it } from 'bun:test';
import { FEE_CATEGORY_VALUES, PAYMENT_TYPE_VALUES } from '@sms/contracts';

import { buildFeeCategoryOptionsFor, buildPaymentTypeOptions, getAvailableFeeTypes, getDefaultStudentFeeTypes } from '@/features/Financial/FeeTypes/config/feeTypeOptions';
import { createFeeTypeSchema } from '@/features/Financial/FeeTypes/config/feeTypeSchemas';
import { hasFiles, toFormData } from '@/services/formDataHelper';

const feeTypeSchema = createFeeTypeSchema((key: string) => key);

const echo = (key: string) => key;

const feeType = { name: 'Tuition', category: 'tuition', amount: 1200 };

describe('feeTypeSchema', () => {
  it('keeps uploaded images for multipart submission, stored paths for edits, and null for clearing', () => {
    const image = new File(['image'], 'fee.png', { type: 'image/png' });
    const parsed = feeTypeSchema.parse({ ...feeType, image, amount: '400' });
    expect(parsed.image).toBe(image);
    expect(hasFiles(parsed)).toBe(true);
    const multipart = toFormData(parsed);
    expect(multipart.get('image')).toBeInstanceOf(File);
    expect((multipart.get('image') as File).name).toBe('fee.png');
    expect(multipart.get('amount')).toBe('400');

    const stored = feeTypeSchema.parse({ ...feeType, image: '/api/fee-types/files/serve/type_icon.png?v=1' });
    expect(stored.image).toContain('type_icon.png');
    expect(hasFiles(stored)).toBe(false);
    const cleared = feeTypeSchema.parse({ ...feeType, image: null });
    expect(cleared.image).toBeNull();
    expect(hasFiles(cleared)).toBe(false);
  });

  it('saves translated names while leaving enabled state out of form edits', () => {
    const parsed = feeTypeSchema.parse({ ...feeType, name: 'Atelier robotique', labels: { fr: 'Scolarité' }, status: 'inactive' });
    expect(parsed.name).toBe('Atelier robotique');
    expect(parsed.labels).toEqual({ fr: 'Scolarité' });
    expect(parsed).not.toHaveProperty('status');
  });

  it('trims translations, removes blank labels, and supports clearing every translation', () => {
    expect(feeTypeSchema.parse({ ...feeType, labels: { en: ' Daily Meal ', fr: 'Repas à la journée', ar: '', es: '  ' } }).labels)
      .toEqual({ en: 'Daily Meal', fr: 'Repas à la journée' });
    expect(feeTypeSchema.parse({ ...feeType, labels: { en: '', fr: ' ' } }).labels).toEqual({});
    expect(feeTypeSchema.parse(feeType)).not.toHaveProperty('labels');
    expect(feeTypeSchema.safeParse({ ...feeType, labels: { en: 'a'.repeat(101) } }).success).toBe(false);
  });

  it('keeps translations alongside an uploaded image in multipart submissions', () => {
    const labels = { en: 'Daily Meal', fr: 'Repas à la journée', ar: 'وجبة اليوم', es: 'Comida del día' };
    const parsed = feeTypeSchema.parse({ ...feeType, labels, image: new File(['image'], 'meal.png') });
    expect(JSON.parse(toFormData(parsed).get('labels') as string)).toEqual(labels);
    expect(toFormData(feeTypeSchema.parse({ ...feeType, labels: { en: '' } })).get('labels')).toBe('{}');
  });

  it('defaults to recurring and lets the API supply the initial active status', () => {
    const parsed = feeTypeSchema.parse(feeType);

    expect(parsed.paymentType).toBe('recurring');
    expect(parsed).not.toHaveProperty('status');
  });

  it('accepts every payment type the API accepts', () => {
    for (const paymentType of PAYMENT_TYPE_VALUES) {
      expect(feeTypeSchema.safeParse({ ...feeType, paymentType }).success).toBe(true);
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
  it('hides disabled and archived types from assignment choices and restores enabled ones', () => {
    const types = [
      { id: 'tuition', status: 'inactive', category: 'tuition', paymentType: 'recurring' },
      { id: 'transport', status: 'active', category: 'transport', paymentType: 'recurring' },
      { id: 'old', status: 'archived', category: 'tuition', paymentType: 'recurring' },
    ];
    expect(getAvailableFeeTypes(types).map(type => type.id)).toEqual(['transport']);
    // Disabling tuition must not auto-charge the remaining recurring services.
    expect(getDefaultStudentFeeTypes(types)).toEqual([]);
    const enabled = types.map(type => type.id === 'tuition' ? { ...type, status: 'active' } : type);
    expect(getAvailableFeeTypes(enabled).map(type => type.id)).toEqual(['tuition', 'transport']);
    expect(getDefaultStudentFeeTypes(enabled).map(type => type.id)).toEqual(['tuition']);
  });

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
