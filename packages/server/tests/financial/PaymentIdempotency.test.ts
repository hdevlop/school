import { describe, expect, it } from 'bun:test';
import { computeIdempotencyHash } from '@server/modules/financial/payments/PaymentValidator';

describe('computeIdempotencyHash', () => {
  it('is stable for the same payload regardless of allocation key order', () => {
    const a = computeIdempotencyHash({
      studentId: 's1',
      amount: 1000,
      paymentMethod: 'cash',
      paymentDate: '2026-09-01',
      allocations: [
        { feeId: 'f1', number: 1, amount: 500 },
        { feeId: 'f2', number: 1, amount: 500 },
      ],
    } as any);
    const b = computeIdempotencyHash({
      studentId: 's1',
      amount: 1000,
      paymentMethod: 'cash',
      paymentDate: '2026-09-01',
      allocations: [
        { feeId: 'f2', number: 1, amount: 500 },
        { feeId: 'f1', number: 1, amount: 500 },
      ],
    } as any);
    expect(a).toBe(b);
  });

  it('changes when allocation amounts change', () => {
    const a = computeIdempotencyHash({
      studentId: 's1',
      amount: 1000,
      paymentMethod: 'cash',
      paymentDate: '2026-09-01',
      allocations: [
        { feeId: 'f1', number: 1, amount: 500 },
      ],
    } as any);
    const b = computeIdempotencyHash({
      studentId: 's1',
      amount: 1000,
      paymentMethod: 'cash',
      paymentDate: '2026-09-01',
      allocations: [
        { feeId: 'f1', number: 1, amount: 600 },
      ],
    } as any);
    expect(a).not.toBe(b);
  });

  it('ignores transport-only fields like idempotencyKey itself', () => {
    const a = computeIdempotencyHash({
      studentId: 's1',
      amount: 1000,
      paymentMethod: 'cash',
      paymentDate: '2026-09-01',
      allocations: [{ feeId: 'f1', number: 1, amount: 1000 }],
    } as any);
    const b = computeIdempotencyHash({
      studentId: 's1',
      amount: 1000,
      paymentMethod: 'cash',
      paymentDate: '2026-09-01',
      allocations: [{ feeId: 'f1', number: 1, amount: 1000 }],
      idempotencyKey: '00000000-0000-0000-0000-000000000000',
    } as any);
    expect(a).toBe(b);
  });
});
