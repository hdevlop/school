import { describe, expect, it } from 'bun:test';
import {
  FeeEffectiveDateError,
  resolveFeeEffectiveDate,
} from '@server/modules/financial/utils/effectiveDate';

describe('resolveFeeEffectiveDate', () => {
  const base = {
    startMonth: 'september',
    endMonth: 'june',
    academicYear: '2026-2027',
  };

  it('uses academic year start when enrollment is before the year', () => {
    const date = resolveFeeEffectiveDate({
      ...base,
      enrollmentDate: '2026-04-15',
    });
    expect(date).toBe('2026-09-01');
  });

  it('uses enrollment date when inside the academic year (mid-year transfer)', () => {
    const date = resolveFeeEffectiveDate({
      ...base,
      enrollmentDate: '2027-02-15',
    });
    expect(date).toBe('2027-02-15');
  });

  it('rejects when enrollment is after the academic year end', () => {
    expect(() => resolveFeeEffectiveDate({
      ...base,
      enrollmentDate: '2027-09-01',
    })).toThrow(FeeEffectiveDateError);
  });

  it('rejects an explicit date before the billable start', () => {
    expect(() => resolveFeeEffectiveDate({
      ...base,
      enrollmentDate: '2026-09-01',
      requestedDate: '2026-08-15',
    })).toThrow(FeeEffectiveDateError);
  });

  it('rejects an explicit date after the academic year end', () => {
    expect(() => resolveFeeEffectiveDate({
      ...base,
      enrollmentDate: '2026-09-01',
      requestedDate: '2027-08-15',
    })).toThrow(FeeEffectiveDateError);
  });

  it('accepts an explicit date inside the billable window', () => {
    const date = resolveFeeEffectiveDate({
      ...base,
      enrollmentDate: '2026-09-01',
      requestedDate: '2026-11-15',
    });
    expect(date).toBe('2026-11-15');
  });

  it('rejects a July effective date outside the September-to-June school year', () => {
    expect(() => resolveFeeEffectiveDate({
      ...base,
      enrollmentDate: '2026-09-01',
      requestedDate: '2027-07-13',
    })).toThrow(FeeEffectiveDateError);
  });

  it('rejects an invalid requested date', () => {
    expect(() => resolveFeeEffectiveDate({
      ...base,
      enrollmentDate: '2026-09-01',
      requestedDate: 'not-a-date',
    })).toThrow(FeeEffectiveDateError);
  });

  it('rejects an invalid enrollment date', () => {
    expect(() => resolveFeeEffectiveDate({
      ...base,
      enrollmentDate: '2026-13-01',
    })).toThrow(FeeEffectiveDateError);
  });
});
