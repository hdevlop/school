import { describe, expect, it } from 'bun:test';
import {
  compareDateOnly,
  formatDateOnly,
  isValidDateOnly,
  parseDateOnly,
} from '@server/modules/financial/utils/dateOnly';

describe('dateOnly utilities', () => {
  it('parses a strict YYYY-MM-DD string into a local Date', () => {
    const date = parseDateOnly('2026-09-01');
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(8);
    expect(date?.getDate()).toBe(1);
  });

  it('rejects ISO timestamps with a time component', () => {
    expect(() => parseDateOnly('2026-09-01T00:00:00Z')).toThrow();
    expect(() => parseDateOnly('2026-09-01T00:00:00+00:00')).toThrow();
  });

  it('rejects slash or dot formats', () => {
    expect(() => parseDateOnly('09/01/2026')).toThrow();
    expect(() => parseDateOnly('2026/09/01')).toThrow();
    expect(() => parseDateOnly('2026.09.01')).toThrow();
  });

  it('rejects invalid calendar dates such as Feb 30', () => {
    expect(() => parseDateOnly('2026-02-30')).toThrow();
    expect(() => parseDateOnly('2026-13-01')).toThrow();
  });

  it('formats a Date back into a YYYY-MM-DD string', () => {
    expect(formatDateOnly(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatDateOnly(new Date(2026, 8, 30))).toBe('2026-09-30');
  });

  it('compareDateOnly behaves like a string compare', () => {
    expect(compareDateOnly('2026-09-01', '2026-09-02')).toBeLessThan(0);
    expect(compareDateOnly('2026-09-02', '2026-09-02')).toBe(0);
    expect(compareDateOnly('2026-12-31', '2026-01-01')).toBeGreaterThan(0);
  });

  it('isValidDateOnly accepts only strict YYYY-MM-DD', () => {
    expect(isValidDateOnly('2024-02-29')).toBe(true);
    expect(isValidDateOnly('2026-02-29')).toBe(false);
    expect(isValidDateOnly('2026-09-01T00:00:00Z')).toBe(false);
    expect(isValidDateOnly(null)).toBe(false);
  });
});
