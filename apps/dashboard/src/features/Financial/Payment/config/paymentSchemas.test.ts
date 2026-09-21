import { describe, expect, it } from 'bun:test';
import { PAYMENT_METHOD_VALUES } from '@sms/contracts';

import { feePaymentSchema, paymentEditSchema } from './paymentSchemas';

const payment = {
  paymentMethod: 'cash',
  paymentDate: '2026-03-01',
  amount: 500,
};

describe('feePaymentSchema', () => {
  it('accepts every method the API accepts', () => {
    for (const paymentMethod of PAYMENT_METHOD_VALUES) {
      expect(feePaymentSchema.safeParse({ ...payment, paymentMethod }).success).toBe(true);
    }
    expect(feePaymentSchema.safeParse({ ...payment, paymentMethod: 'crypto' }).success).toBe(false);
  });

  it('coerces the amount the input submits as text', () => {
    expect(feePaymentSchema.parse({ ...payment, amount: '1250.50' }).amount).toBe(1250.5);
  });

  it('refuses a zero or negative payment', () => {
    expect(feePaymentSchema.safeParse({ ...payment, amount: 0 }).success).toBe(false);
    expect(feePaymentSchema.safeParse({ ...payment, amount: -1 }).success).toBe(false);
  });

  /**
   * The reason every optional text field is wrapped in a preprocess: a cleared
   * input submits `''`, and an empty check number stored as `''` is not the
   * same record as one with no check number at all.
   */
  it('turns every cleared optional text field into null, not an empty string', () => {
    const parsed = feePaymentSchema.parse({
      ...payment,
      checkNumber: '',
      checkDueDate: '',
      transactionRef: '',
      receiptNumber: '',
      notes: '',
    });

    expect(parsed.checkNumber).toBeNull();
    expect(parsed.checkDueDate).toBeNull();
    expect(parsed.transactionRef).toBeNull();
    expect(parsed.receiptNumber).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it('keeps allocations as whole installments with positive amounts', () => {
    expect(
      feePaymentSchema.safeParse({
        ...payment,
        allocations: [{ feeId: 'f1', number: 1, amount: '500' }],
      }).success,
    ).toBe(true);
    expect(
      feePaymentSchema.safeParse({
        ...payment,
        allocations: [{ feeId: 'f1', number: 0, amount: 500 }],
      }).success,
    ).toBe(false);
  });

  it('has no status field, because the server owns a payment’s lifecycle', () => {
    expect(Object.keys(feePaymentSchema.shape)).not.toContain('status');

    const parsed: Record<string, unknown> = feePaymentSchema.parse({
      ...payment,
      status: 'deposited',
    });

    expect(parsed.status).toBeUndefined();
  });
});

describe('paymentEditSchema', () => {
  const edit = { id: 'p1', paymentMethod: 'check', paymentDate: '2026-03-01' };

  it('corrects the paperwork without touching what was paid', () => {
    const shape = Object.keys(paymentEditSchema.shape);

    expect(shape).not.toContain('amount');
    expect(shape).not.toContain('allocations');
    expect(shape).not.toContain('status');
  });

  it('needs the payment it is editing and a date', () => {
    expect(paymentEditSchema.safeParse(edit).success).toBe(true);
    expect(paymentEditSchema.safeParse({ ...edit, paymentDate: '' }).success).toBe(false);
    expect(paymentEditSchema.safeParse({ ...edit, id: undefined }).success).toBe(false);
  });
});
