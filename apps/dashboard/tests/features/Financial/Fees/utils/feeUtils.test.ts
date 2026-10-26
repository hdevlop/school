import { describe, expect, it } from 'bun:test';
import { calculateFeeAmounts, calculateTotalFees, getFeeDiscountAmount, getFeeDiscountPerPeriod, getFeeEditNetAmount, prepareFeeEdit, getFeeTypeDisplayName, getStudentFeesDisplayData, withFeeYear } from '@/features/Financial/Fees/utils/feeUtils';
import { translations } from '@sms/contracts/locales';

const seededFeeTypes = [
  { id: 'FT00', name: 'Tuition Fee', category: 'tuition' },
  { id: 'FT01', name: 'Registration Fee', category: 'registration' },
  { id: 'FT02', name: 'Transport Fee', category: 'transport' },
  { id: 'FT03', name: 'Cafeteria Fee', category: 'cafeteria' },
  { id: 'FT04', name: 'Books & Materials', category: 'books' },
  { id: 'FT05', name: 'Sports Fee', category: 'sports' },
  { id: 'FT06', name: 'Uniform Fee', category: 'uniform' },
  { id: 'FT07', name: 'Technology Fee', category: 'technology' },
  { id: 'FT8', name: 'Field Trip Fee', category: 'fieldtrip' },
];

describe('fee display translations', () => {
  for (const language of ['en', 'fr', 'ar', 'es'] as const) {
    const categories = translations[language].feeTypes.category;
    const t = (key: string) => categories[key.replace('feeTypes.category.', '') as keyof typeof categories] ?? key;

    it(`translates every seeded fee type in ${language}`, () => {
      for (const feeType of seededFeeTypes) {
        expect(getFeeTypeDisplayName(feeType, t, language)).toBe(categories[feeType.category as keyof typeof categories]);
      }
    });

    it(`translates student fee data in ${language} without changing cached names or amounts`, () => {
      const data = {
        summary: { totalDue: 500 },
        fees: seededFeeTypes.map(({ id, name, category }) => ({
          id: `fee-${id}`, feeTypeId: id, name, type: category,
          netAmount: 1100, installments: [{ id: 'installment-1', amount: 1100 }],
        })),
      };
      const original = structuredClone(data);
      const displayed = getStudentFeesDisplayData(data, t, language)!;
      expect(displayed.fees.map(fee => fee.name)).toEqual(seededFeeTypes.map(fee => categories[fee.category as keyof typeof categories]));
      expect(data).toEqual(original);
      expect(displayed.summary).toBe(data.summary);
      expect(displayed.fees[0].installments).toBe(data.fees[0].installments);
      expect(displayed.fees[0].netAmount).toBe(1100);
    });
  }

  it('preserves custom fee names, including ones in a standard category', () => {
    expect(getFeeTypeDisplayName({ id: 'custom-1', name: 'Advanced tuition', category: 'tuition' }, () => 'Scolarité', 'fr')).toBe('Advanced tuition');
    const data = { fees: [{ feeTypeId: 'custom-1', name: 'Advanced tuition', type: 'tuition' }] };
    expect(getStudentFeesDisplayData(data, () => 'Scolarité', 'fr')?.fees[0].name).toBe('Advanced tuition');
  });

  it('switches custom student fee names across all four languages without changing the cache', () => {
    const labels = { en: 'Transport Fee — One Trip', fr: 'Frais de transport 1 voyage', ar: 'رسوم النقل — رحلة واحدة', es: 'Cuota de transporte — un trayecto' };
    const data = { fees: [{ feeTypeId: 'custom-transport', name: labels.fr, type: 'transport', labels, netAmount: 300 }] };
    const original = structuredClone(data);
    for (const language of ['en', 'fr', 'ar', 'es'] as const) {
      expect(getStudentFeesDisplayData(data, key => key, language)?.fees[0].name).toBe(labels[language]);
    }
    expect(data).toEqual(original);
    expect(getStudentFeesDisplayData(data, key => key, 'de')?.fees[0].name).toBe(labels.fr);
    expect(getFeeTypeDisplayName({ id: 'custom', name: 'Saved name', labels: { fr: '  ' } }, key => key, 'fr')).toBe('Saved name');
  });

  it('prefers an explicit localized label and falls back to the saved name for missing translations', () => {
    expect(getFeeTypeDisplayName({ ...seededFeeTypes[0], labels: { fr: 'Frais de scolarité' } }, () => 'Scolarité', 'fr')).toBe('Frais de scolarité');
    expect(getFeeTypeDisplayName(seededFeeTypes[0], key => key, 'fr')).toBe('Tuition Fee');
    expect(getFeeTypeDisplayName(undefined, key => key, 'fr')).toBe('');
    expect(getStudentFeesDisplayData(undefined, key => key, 'fr')).toBeUndefined();
  });
});

describe('withFeeYear', () => {
  it('charges new fees to the viewed year without changing the submitted payload', () => {
    const data = { fees: [{ studentId: 'student-1', feeTypeId: 'tuition' }, { studentId: 'student-1', feeTypeId: 'bus' }] };
    expect<unknown>(withFeeYear(data, '2025-2026')).toEqual({
      fees: [
        { studentId: 'student-1', feeTypeId: 'tuition', academicYear: '2025-2026' },
        { studentId: 'student-1', feeTypeId: 'bus', academicYear: '2025-2026' },
      ],
    });
    expect(data.fees[0]).toEqual({ studentId: 'student-1', feeTypeId: 'tuition' });
  });

  it('keeps a year the fee already names', () => {
    const data = { fees: [{ feeTypeId: 'tuition', academicYear: '2026-2027' }, { feeTypeId: 'bus', academicYear: null }] };
    expect<unknown>(withFeeYear(data, '2025-2026').fees).toEqual([
      { feeTypeId: 'tuition', academicYear: '2026-2027' },
      { feeTypeId: 'bus', academicYear: '2025-2026' },
    ]);
  });

  it('leaves the year to the server when no year is viewed', () => {
    const data = { fees: [{ feeTypeId: 'tuition' }] };
    expect(withFeeYear(data, undefined)).toBe(data);
  });
});

describe('fee edit discount units', () => {
  it('preserves an October admission and its monthly discount on open and unchanged save', () => {
    const fee = { id: 'october', paymentType: 'recurring', schedule: 'monthly', baseAmount: 1100,
      grossAmount: 9900, netAmount: 9000, discountAmount: 900, effectiveDate: '2026-10-22' };
    const values = { baseAmount: '1100', schedule: 'monthly', discountAmount: '100', notes: '' };
    expect(getFeeDiscountAmount(fee)).toBe(900);
    expect(getFeeDiscountPerPeriod(fee)).toBe(100);
    expect(getFeeEditNetAmount(fee, values)).toBe(9000);
    expect(prepareFeeEdit(fee, values)).toEqual({ id: 'october' });
    expect(prepareFeeEdit(fee, { ...values, notes: 'Only notes changed' })).toEqual({ id: 'october', notes: 'Only notes changed' });
    expect(getFeeEditNetAmount(fee, { ...values, discountAmount: 200 })).toBe(8100);
    expect(getFeeEditNetAmount(fee, { ...values, schedule: 'quarterly' })).toBe(9000);
    expect(getFeeDiscountAmount({ ...fee, discountAmount: undefined, discount: 900 })).toBe(900);
  });

  it('does not round a saved aggregate discount when the displayed monthly rate is unchanged', () => {
    const fee = { id: 'cents', schedule: 'monthly', baseAmount: 100, grossAmount: 900, netAmount: 889.99, discountAmount: 10.01 };
    const values = { baseAmount: 100, schedule: 'monthly', discountAmount: getFeeDiscountPerPeriod(fee) };
    expect(getFeeEditNetAmount(fee, values)).toBe(889.99);
    expect(prepareFeeEdit(fee, values)).toEqual({ id: 'cents' });
  });

  it('shows the monthly rate instead of the stored yearly total', () => {
    expect(getFeeDiscountPerPeriod({ schedule: 'monthly', baseAmount: 100, grossAmount: 1000, discountAmount: 100 })).toBe(10);
    expect(getFeeDiscountPerPeriod({ schedule: 'quarterly', baseAmount: 100, grossAmount: 500, discountAmount: 50 })).toBe(10);
    expect(getFeeDiscountPerPeriod({ schedule: 'oneTime', baseAmount: 100, grossAmount: 100, discountAmount: 10 })).toBe(10);
    expect(calculateFeeAmounts('recurring', 100, 'monthly', 10, { academicYear: '2026-2027', effectiveDate: '2026-09-01' }).netAmount).toBe(900);
    expect(calculateFeeAmounts('recurring', 100, 'oneTime', 10, { academicYear: '2026-2027', effectiveDate: '2026-09-01' }).netAmount).toBe(90);
  });
});

// The "selected fees" badge summed `amount`, which the form's lines do not have,
// and printed it after a literal "$".
describe('calculateTotalFees', () => {
  it('totals each line\'s computed net amount', () => {
    expect(calculateTotalFees([{ netAmount: 1200 }, { netAmount: '300.5' }, {}])).toBe(1500.5);
    expect(calculateTotalFees([])).toBe(0);
  });
});

describe('new student billing preview', () => {
  it('bills an October admission for nine months, including discounts', () => {
    const context = { academicYear: '2026-2027', effectiveDate: '2026-10-21' };
    expect(calculateFeeAmounts('recurring', 2000, 'monthly', 0, context).netAmount).toBe(18000);
    expect(calculateFeeAmounts('recurring', 2000, 'monthly', 100, context).netAmount).toBe(17100);
    expect(calculateFeeAmounts('recurring', 2000, 'monthly', 0, { ...context, effectiveDate: '2026-11-21' }).netAmount).toBe(16000);
  });
});
