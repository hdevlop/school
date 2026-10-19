import { describe, expect, test } from 'bun:test';
import { createSchoolMoneyFormatter, toMinorUnits } from '@/hooks/schoolMoneyFormat';

describe('School money display', () => {
  const mad = createSchoolMoneyFormatter({ locale: 'en-US', currency: 'MAD' });

  test('shows whole dirhams with a suffix, including zero and negative balances', () => {
    expect(mad('18291.00')).toBe('18,291\u00a0dh');
    expect(mad(0)).toBe('0\u00a0dh');
    expect(mad(-400)).toBe('-400\u00a0dh');
    expect(mad('1250.49')).toBe('1,250\u00a0dh');
    expect(mad('1250.50')).toBe('1,251\u00a0dh');
    expect(toMinorUnits('1250.49', 2)).toBe(125049);
  });

  test('keeps locale grouping in each supported language without a decimal or MAD label', () => {
    for (const locale of ['en-US', 'fr-MA', 'ar-MA', 'es-ES']) {
      const money = createSchoolMoneyFormatter({ locale, currency: 'MAD' });
      const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(18291);
      expect(money('18291.00')).toBe(`${number}\u00a0dh`);
    }
  });

  test('keeps standard precision and minor unit scaling for other currencies', () => {
    for (const [currency, value] of [['USD', '1250.25'], ['JPY', '1250'], ['KWD', '1250.125']]) {
      const money = createSchoolMoneyFormatter({ locale: 'en-US', currency });
      expect(money(value)).toBe(new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value)));
    }
  });

  test('keeps missing, invalid, and unsafe values as placeholders', () => {
    for (const value of [null, undefined, '', 'invalid', NaN, Infinity, '9007199254740992']) {
      expect(mad(value)).toBe('—');
    }
    expect(createSchoolMoneyFormatter({ locale: 'fr-MA', currency: 'MAD', placeholder: '-' })(null)).toBe('-');
  });
});
