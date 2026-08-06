import { describe, expect, it } from 'bun:test';
import {
  createPaymentDto,
  updatePaymentDto,
} from '@server/modules/financial/payments/PaymentDto';

const validCreatePayment = {
  studentId: 'std_01',
  amount: 250,
  paymentMethod: 'cash',
  paymentDate: '2026-04-13',
  allocations: [
    {
      feeId: 'fee_01',
      number: 1,
      amount: 250,
    },
  ],
};

describe('createPaymentDto', () => {
  it('parses a valid payment payload with required student and allocation data', () => {
    const result = createPaymentDto.safeParse(validCreatePayment);
    expect(result.success).toBe(true);
  });

  it('rejects a missing studentId', () => {
    const result = createPaymentDto.safeParse({
      ...validCreatePayment,
      studentId: '',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty allocations list', () => {
    const result = createPaymentDto.safeParse({
      ...validCreatePayment,
      allocations: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects an allocation without a feeId', () => {
    const result = createPaymentDto.safeParse({
      ...validCreatePayment,
      allocations: [
        {
          feeId: '',
          number: 1,
          amount: 250,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('strips client-supplied status on create (payments are always recorded as completed)', () => {
    const result = createPaymentDto.safeParse({
      ...validCreatePayment,
      status: 'refunded',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeUndefined();
    }
  });

  it('accepts a realistic annual or upfront payment amount', () => {
    const result = createPaymentDto.safeParse({
      ...validCreatePayment,
      amount: 250_000,
      allocations: [
        { feeId: 'fee_01', number: 1, amount: 250_000 },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects an amount over the realistic maximum (1,000,000)', () => {
    const result = createPaymentDto.safeParse({
      ...validCreatePayment,
      amount: 1_000_001,
    });

    expect(result.success).toBe(false);
  });
});

describe('updatePaymentDto', () => {
  it('parses supported editable payment fields', () => {
    const result = updatePaymentDto.safeParse({
      paymentMethod: 'bankTransfer',
      transactionRef: 'TXN-2026-001',
    });

    expect(result.success).toBe(true);
  });

  it('rejects amount because payment amount is not directly editable', () => {
    const result = updatePaymentDto.safeParse({
      amount: 300,
    });

    expect(result.success).toBe(false);
  });

  it('rejects direct status updates (refunds go through the /refund route)', () => {
    const result = updatePaymentDto.safeParse({
      status: 'refunded',
    });

    expect(result.success).toBe(false);
  });
});
