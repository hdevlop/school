import { describe, expect, it } from 'bun:test';
import { fromCents, safeAddCents, safeCompareCents, safeSubtractCents, toCents, MoneyError } from '@server/modules/financial/utils/money';

describe('money utilities', () => {
  it('converts simple dollar values to integer centimes', () => {
    expect(toCents('100')).toBe(10000);
    expect(toCents('100.50')).toBe(10050);
    expect(toCents('100.5')).toBe(10050);
    expect(toCents(100.5)).toBe(10050);
  });

  it('handles negatives and zero correctly', () => {
    expect(toCents('-12.34')).toBe(-1234);
    expect(toCents('0')).toBe(0);
    expect(toCents('0.00')).toBe(0);
  });

  it('rejects invalid money strings', () => {
    expect(() => toCents('abc')).toThrow(MoneyError);
    expect(() => toCents('100.123')).toThrow(MoneyError);
    expect(() => toCents('')).toThrow(MoneyError);
    expect(() => toCents(null)).toThrow(MoneyError);
  });

  it('formats centimes back into a YYYY-MM-DD style string', () => {
    expect(fromCents(0)).toBe('0.00');
    expect(fromCents(7)).toBe('0.07');
    expect(fromCents(12345)).toBe('123.45');
    expect(fromCents(-1234)).toBe('-12.34');
  });

  it('rounds fractional centimes safely', () => {
    expect(fromCents(99.4)).toBe('0.99');
    expect(fromCents(99.6)).toBe('1.00');
  });

  it('adds and subtracts with no floating-point drift', () => {
    const sum = safeAddCents('0.10', '0.20');
    expect(sum).toBe(30);
    expect(fromCents(sum)).toBe('0.30');

    const diff = safeSubtractCents('1.00', '0.33');
    expect(diff).toBe(67);
    expect(fromCents(diff)).toBe('0.67');
  });

  it('compares with integer centimes', () => {
    expect(safeCompareCents('0.1', '0.10')).toBe(0);
    expect(safeCompareCents('0.1', '0.11')).toBe(-1);
    expect(safeCompareCents('0.11', '0.10')).toBe(1);
  });
});
