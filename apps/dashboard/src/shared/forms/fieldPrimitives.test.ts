import { describe, expect, it } from 'bun:test';

import {
  academicYearField,
  dateField,
  emailField,
  num,
  optionalDateField,
  optionalId,
  requiredId,
  timeField,
} from './fieldPrimitives';

/**
 * Every feature schema is built from these, so a change here is a change to
 * every form at once. They are pinned individually rather than only through
 * the schemas that use them.
 */

describe('id fields', () => {
  it('reads a missing required id as "required", not as a type error', () => {
    for (const empty of [undefined, null, '']) {
      const result = requiredId.safeParse(empty);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe('ID is required');
    }
  });

  it('treats an unchosen optional select as absent rather than invalid', () => {
    expect(optionalId.parse('')).toBeUndefined();
    expect(optionalId.parse(undefined)).toBeUndefined();
    expect(optionalId.parse('abc')).toBe('abc');
  });
});

describe('emailField', () => {
  it('accepts an address or a cleared field, and nothing in between', () => {
    expect(emailField.safeParse('a@b.co').success).toBe(true);
    expect(emailField.safeParse('').success).toBe(true);
    expect(emailField.safeParse('a@b').success).toBe(false);
  });
});

describe('date fields', () => {
  it('accepts every format the dashboard date inputs emit', () => {
    for (const value of ['2026-03-01', '03/01/2026', '01-03-2026', '01-03-26']) {
      expect(dateField.safeParse(value).success).toBe(true);
    }
    expect(dateField.safeParse('1 March 2026').success).toBe(false);
  });

  it('holds stored dates to the normalized form the API returns', () => {
    expect(optionalDateField.safeParse('2026-03-01').success).toBe(true);
    expect(optionalDateField.safeParse('03/01/2026').success).toBe(false);
    expect(optionalDateField.safeParse(null).success).toBe(true);
    expect(optionalDateField.safeParse(undefined).success).toBe(true);
  });

  it('wants a full academic year, not just its first half', () => {
    expect(academicYearField.safeParse('2025-2026').success).toBe(true);
    expect(academicYearField.safeParse('2025').success).toBe(false);
  });
});

describe('timeField', () => {
  it('pads a single-digit hour', () => {
    expect(timeField.parse('9:05')).toBe('09:05');
  });

  it('drops the seconds a time input sometimes appends', () => {
    expect(timeField.parse('09:05:00')).toBe('09:05');
  });

  it('collapses a cleared field to undefined', () => {
    expect(timeField.parse('')).toBeUndefined();
  });

  it('refuses an hour that does not exist', () => {
    expect(timeField.safeParse('25:00').success).toBe(false);
    expect(timeField.safeParse('09:61').success).toBe(false);
  });
});

describe('num()', () => {
  it('turns the text a number input submits into a number', () => {
    expect(num().parse('42')).toBe(42);
    expect(num().parse(' 42.5 ')).toBe(42.5);
    expect(num().parse(7)).toBe(7);
  });

  it('refuses what is not a number, including a blank field', () => {
    for (const value of ['', '   ', 'abc', null, undefined, NaN]) {
      expect(num().safeParse(value).success, `${String(value)} was accepted`).toBe(false);
    }
  });

  /**
   * The chained constraints have to run *after* the transform — `z.number()`
   * would reject `'42'` before it was ever converted.
   */
  it('applies each constraint to the converted value', () => {
    expect(num().positive().safeParse('1').success).toBe(true);
    expect(num().positive().safeParse('0').success).toBe(false);
    expect(num().int().safeParse('2.5').success).toBe(false);
    expect(num().min(5).safeParse('4').success).toBe(false);
    expect(num().max(5).safeParse('6').success).toBe(false);
    expect(num().int().min(1).max(10).parse('7')).toBe(7);
  });

  it('reports the message the caller gave it', () => {
    const result = num().positive('Salary must be positive').safeParse('-1');

    expect(result.error?.issues[0]?.message).toBe('Salary must be positive');
  });
});
