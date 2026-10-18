import { describe, expect, it } from 'bun:test';
import { FeeValidator } from '../../src/modules/financial/fees/FeeValidator';
import { calculateFeeAmounts } from '../../src/modules/financial/utils/calculations';
import { withEnglishMessages } from '../support/englishMessages';

const validator = withEnglishMessages(new FeeValidator({} as any, {} as any, {} as any));

describe('a fee discount', () => {
  // A recurring fee's discount is per month: 5,000 on a 400 monthly fee was
  // stored as a 50,000 discount on a 4,000 fee, and the net silently read 0.
  it('is refused above the amount, in the request language', () => {
    expect(() => validator.ensureDiscountWithinAmount(400, 5000)).toThrow(
      'The discount cannot exceed the fee amount (per period for a recurring fee)',
    );
    expect(() => validator.ensureDiscountWithinAmount('300.00', '300.01')).toThrow();
  });

  it('never totals more than a recurring fee, even when the amount is lowered later', () => {
    const amounts = calculateFeeAmounts('recurring', 100, 'monthly', 400, { academicYear: '2026-2027', effectiveDate: '2026-09-01' });
    expect(amounts.totalDiscount).toBe(amounts.grossAmount);
    expect(amounts.netAmount).toBe(0);
  });

  it('may cover the whole amount or nothing', () => {
    expect(() => validator.ensureDiscountWithinAmount(400, 400)).not.toThrow();
    expect(() => validator.ensureDiscountWithinAmount('400.00', undefined)).not.toThrow();
    expect(() => validator.ensureDiscountWithinAmount(400, 0)).not.toThrow();
  });
});
