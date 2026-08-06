import { describe, expect, it } from 'bun:test';
import { buildFeeRecalculationResponse } from '@server/modules/financial/fees/buildFeeRecalculationResponse';

describe('buildFeeRecalculationResponse', () => {
  it('returns a numeric totalAllocated derived from the recalculated fee', () => {
    const result = buildFeeRecalculationResponse('fee_01', {
      paidAmount: '250.50',
      status: 'partiallyPaid',
    });

    expect(result).toEqual({
      feeId: 'fee_01',
      totalAllocated: 250.5,
      status: 'partiallyPaid',
    });
    expect(typeof result.totalAllocated).toBe('number');
  });

  it('falls back to zero when paidAmount is missing', () => {
    const result = buildFeeRecalculationResponse('fee_01', {
      status: 'pending',
    });

    expect(result).toEqual({
      feeId: 'fee_01',
      totalAllocated: 0,
      status: 'pending',
    });
  });
});
