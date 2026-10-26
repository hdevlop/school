import { describe, expect, it } from 'bun:test';
import { feeHarness, recurringInput } from '../support/financeHarness';

describe('school-wide fee type availability', () => {
  for (const status of ['inactive', 'archived']) {
    it(`refuses new ${status} charges before creating fees or installments`, async () => {
      const h = feeHarness('recurring', status);
      await expect(h.service.create(recurringInput, 'accountant', 'accounting')).rejects.toMatchObject({
        status: 400,
        message: 'This fee type is disabled and cannot be assigned to students',
      });
      expect(h.fee).toBeUndefined();
      expect(h.installments).toEqual([]);
      expect(h.audit).toEqual([]);
    });
  }

  it('refuses disabled types in bulk creation too', async () => {
    const h = feeHarness('recurring', 'inactive');
    await expect(h.service.createBulk([recurringInput], 'accountant', 'accounting')).rejects.toMatchObject({ status: 400 });
    expect(h.fee).toBeUndefined();
  });

  it('allows assigning an enabled type again', async () => {
    const h = feeHarness('recurring', 'inactive');
    h.feeTypeStatus = 'active';
    await h.service.create(recurringInput, 'accountant', 'accounting');
    expect(h.fee.feeTypeId).toBe(recurringInput.feeTypeId);
    expect(h.installments).toHaveLength(10);
  });

  it('keeps existing charges readable and editable after their type is disabled', async () => {
    const h = feeHarness();
    await h.service.create(recurringInput, 'accountant', 'accounting');
    const existingInstallments = structuredClone(h.installments);
    h.feeTypeStatus = 'inactive';
    expect(await h.validator.validateFeeTypeExists(recurringInput.feeTypeId)).toMatchObject({ status: 'inactive' });
    await h.service.update(h.fee.id, { notes: 'Existing charge retained' }, 'accountant', 'accounting');
    expect(h.fee.notes).toBe('Existing charge retained');
    expect(h.installments).toEqual(existingInstallments);
    await h.service.update(h.fee.id, { baseAmount: 120 }, 'accountant', 'accounting');
    expect(Number(h.fee.baseAmount)).toBe(120);
    expect(h.feeTypeStatus).toBe('inactive');
  });
});
