import { describe, expect, it } from 'bun:test';
import {
  createFeeDto,
  updateFeeDto,
  deleteFeesBulkDto,
  deleteFeesBulkInputDto,
} from '@server/modules/financial/fees/FeeDto';

describe('createFeeDto', () => {
  it('strips client-supplied status on create', () => {
    const result = createFeeDto.safeParse({
      studentId: 'stu_01',
      feeTypeId: 'ft_01',
      schedule: 'monthly',
      status: 'paid',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeUndefined();
    }
  });

  it('strips client-supplied rollup amounts on create', () => {
    const result = createFeeDto.safeParse({
      studentId: 'stu_01',
      feeTypeId: 'ft_01',
      schedule: 'monthly',
      paidAmount: 500,
      grossAmount: 1000,
      netAmount: 500,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paidAmount).toBeUndefined();
      expect(result.data.grossAmount).toBeUndefined();
      expect(result.data.netAmount).toBeUndefined();
    }
  });

  it('still accepts normal fee assignment fields', () => {
    const result = createFeeDto.safeParse({
      studentId: 'stu_01',
      feeTypeId: 'ft_01',
      schedule: 'monthly',
      baseAmount: 500,
      discountAmount: 50,
      discountReason: 'Sibling',
      assignedBy: 'usr_01',
      notes: 'Test',
      effectiveDate: '2026-09-01',
      academicYear: '2026-2027',
    });

    expect(result.success).toBe(true);
  });
});

describe('updateFeeDto', () => {
  it('allows status changes on update (admin correction path)', () => {
    const result = updateFeeDto.safeParse({ status: 'paid' });
    expect(result.success).toBe(true);
  });
});

describe('deleteFeesBulkDto', () => {
  it('exposes a plain object schema for MCP callers', () => {
    const result = deleteFeesBulkInputDto.safeParse({
      ids: ['fee_01', 'fee_02'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ ids: ['fee_01', 'fee_02'] });
    }
  });

  it('parses the MCP-friendly object shape', () => {
    const result = deleteFeesBulkDto.safeParse({
      ids: ['fee_01', 'fee_02'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ ids: ['fee_01', 'fee_02'] });
    }
  });

  it('normalizes the legacy array body shape', () => {
    const result = deleteFeesBulkDto.safeParse(['fee_01', 'fee_02']);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ ids: ['fee_01', 'fee_02'] });
    }
  });

  it('rejects an empty ids list', () => {
    const result = deleteFeesBulkDto.safeParse({ ids: [] });
    expect(result.success).toBe(false);
  });
});
