import { describe, expect, it } from 'bun:test';
import { SCHEDULE_VALUES } from '@sms/contracts';

import {
  bulkFeeFormSchema,
  classBulkFeeFormSchema,
  feeSchema,
  feesSchema,
} from './feeSchemas';

const item = { feeTypeId: 'ft1', schedule: 'monthly' };
const fee = { studentId: 'st1', ...item };

describe('feeSchema', () => {
  it('accepts every schedule the API accepts', () => {
    for (const schedule of SCHEDULE_VALUES) {
      expect(feeSchema.safeParse({ ...fee, schedule }).success).toBe(true);
    }
    expect(feeSchema.safeParse({ ...fee, schedule: 'weekly' }).success).toBe(false);
  });

  it('has no schedule default, because a fee that is not scheduled is not a fee', () => {
    expect(feeSchema.safeParse({ studentId: 'st1', feeTypeId: 'ft1' }).success).toBe(false);
  });

  it('coerces the money the inputs submit as text', () => {
    const parsed = feeSchema.parse({ ...fee, baseAmount: '1200.50', discountAmount: '100' });

    expect(parsed.baseAmount).toBe(1200.5);
    expect(parsed.discountAmount).toBe(100);
  });

  it('allows a zero discount but not a negative one', () => {
    expect(feeSchema.safeParse({ ...fee, discountAmount: 0 }).success).toBe(true);
    expect(feeSchema.safeParse({ ...fee, discountAmount: -1 }).success).toBe(false);
  });

  /**
   * Both are derived by the server from the installments and the payments
   * allocated against them. The edit dialog renders a status select anyway;
   * this is what makes that select decorative rather than dangerous.
   */
  it('neither sends nor accepts a status or a net amount', () => {
    const shape = Object.keys(feeSchema.shape);

    expect(shape).not.toContain('status');
    expect(shape).not.toContain('netAmount');

    const parsed: Record<string, unknown> = feeSchema.parse({
      ...fee,
      status: 'paid',
      netAmount: 0,
    });

    expect(parsed.status).toBeUndefined();
    expect(parsed.netAmount).toBeUndefined();
  });

  it('requires a full YYYY-YYYY academic year when one is given', () => {
    expect(feeSchema.safeParse({ ...fee, academicYear: '2025-2026' }).success).toBe(true);
    expect(feeSchema.safeParse({ ...fee, academicYear: '2025' }).success).toBe(false);
    expect(feeSchema.safeParse(fee).success).toBe(true);
  });
});

describe('the bulk variants', () => {
  it('name the student once, above the list', () => {
    expect(bulkFeeFormSchema.safeParse({ studentId: 'st1', fees: [item] }).success).toBe(true);
    expect(bulkFeeFormSchema.safeParse({ studentId: '', fees: [item] }).success).toBe(false);
  });

  it('need at least one fee', () => {
    expect(bulkFeeFormSchema.safeParse({ studentId: 'st1', fees: [] }).success).toBe(false);
    expect(feesSchema.safeParse({ fees: [] }).success).toBe(false);
    expect(feesSchema.safeParse({ fees: [item] }).success).toBe(true);
  });

  it('validate every line, not just the first', () => {
    const result = bulkFeeFormSchema.safeParse({
      studentId: 'st1',
      fees: [item, { feeTypeId: '', schedule: 'monthly' }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['fees', 1, 'feeTypeId']);
  });

  it('let a class-wide fee cover a whole class or a single section', () => {
    const classFee = { classId: 'cls1', feeTypeId: 'ft1', schedule: 'annually' };

    expect(classBulkFeeFormSchema.safeParse(classFee).success).toBe(true);
    expect(classBulkFeeFormSchema.safeParse({ ...classFee, sectionId: 'sec1' }).success).toBe(true);
    expect(classBulkFeeFormSchema.parse({ ...classFee, sectionId: '' }).sectionId).toBeUndefined();
    expect(classBulkFeeFormSchema.safeParse({ ...classFee, classId: '' }).success).toBe(false);
  });
});
