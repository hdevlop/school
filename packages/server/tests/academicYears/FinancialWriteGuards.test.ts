import { describe, expect, it } from 'bun:test';
import { AllocationService } from '../../src/modules/financial/allocations/AllocationService';
import { AllocationValidator } from '../../src/modules/financial/allocations/AllocationValidator';
import { CreditService } from '../../src/modules/financial/credits/CreditService';
import { CreditValidator } from '../../src/modules/financial/credits/CreditValidator';
import { PaymentService } from '../../src/modules/financial/payments/PaymentService';
import { PaymentValidator } from '../../src/modules/financial/payments/PaymentValidator';

const installment = { id: 'installment-1', feeId: 'fee-1', number: 1, amount: '100.00' };

function allocationHarness(input: { completed?: number; reserved?: number; alreadyAllocated?: number; locked?: object[] } = {}) {
  const calls: string[] = [];
  const repository = {
    getCompletedTotalByInstallmentIds: async () => new Map([[installment.id, input.completed ?? 0]]),
    getReservedTotalByInstallmentIds: async () => new Map([[installment.id, input.reserved ?? 0]]),
    getTotalAllocatedForPayment: async () => input.alreadyAllocated ?? 0,
    create: async (data: object) => { calls.push('create'); return { id: 'allocation-1', ...data }; },
  };
  const service = new AllocationService(
    repository as any,
    new AllocationValidator(repository as any, {} as any, {} as any, {} as any),
    { getByFeeAndNumbersForUpdate: async () => { calls.push('lock'); return input.locked ?? [installment]; } } as any,
    {} as any, {} as any,
    { record: async () => { calls.push('audit'); } } as any,
  );
  (service as any).events = { emit: () => { calls.push('event'); } };
  return { service, calls };
}

const allocationInput = (amounts: number[], paymentAmount = 100) => ({
  paymentId: 'payment-1', paymentAmount,
  allocations: amounts.map((amount) => ({
    feeId: installment.feeId, installmentId: installment.id, installmentNumber: installment.number,
    installmentData: installment, amount,
  })),
});

describe('financial guards under the existing write locks', () => {
  it('rejects missing locked allocation targets before inserting or auditing', async () => {
    const { service, calls } = allocationHarness({ locked: [] });
    await expect(service.processLockedAllocations(allocationInput([10])))
      .rejects.toMatchObject({ status: 400, message: 'No installments matched the requested allocation targets' });
    expect(calls).toEqual(['lock']);
  });

  it('counts previous payment allocations before accepting more', async () => {
    const { service, calls } = allocationHarness({ alreadyAllocated: 80 });
    await expect(service.processLockedAllocations(allocationInput([30])))
      .rejects.toMatchObject({ status: 400, message: 'Allocations cannot exceed the payment amount' });
    expect(calls).toEqual(['lock']);
  });

  it('combines repeated targets with completed amounts and active reservations before writing', async () => {
    const { service, calls } = allocationHarness({ completed: 40, reserved: 20 });
    await expect(service.processLockedAllocations(allocationInput([25, 20])))
      .rejects.toMatchObject({ status: 400, message: 'Allocation of 20 exceeds available 40.00 for installment #1' });
    expect(calls).toEqual(['lock']);
  });

  it('allows an allocation exactly at the locked remaining balance', async () => {
    const { service, calls } = allocationHarness({ completed: 40, reserved: 20 });
    expect(await service.processLockedAllocations(allocationInput([40]))).toHaveLength(1);
    expect(calls).toEqual(['lock', 'create', 'audit', 'event']);
  });

  it('does not spend a credit lot when reservations leave insufficient installment capacity', async () => {
    const calls: string[] = [];
    const service = new CreditService(
      {
        listAvailableLotsForUpdate: async () => { calls.push('lock-credit'); return [{ remainingAmount: '100.00' }]; },
        createApplication: async () => { calls.push('application'); },
        updateLot: async () => { calls.push('update-credit'); },
      } as any,
      {
        getCompletedTotalByInstallmentIds: async () => new Map([[installment.id, 50]]),
        getReservedTotalByInstallmentIds: async () => new Map([[installment.id, 30]]),
      } as any,
      { create: async () => { calls.push('allocation'); } } as any,
      { getByStudentForAutoAllocationForUpdate: async (_studentId: string, year: string) => {
        calls.push(`lock-installments:${year}`); return [installment];
      } } as any,
      {} as any, {} as any, new CreditValidator(),
    );
    (service as any).year = { label: '2025-2026' };
    await expect(service.applyStudentCredit({ studentId: 'student-1', amount: 30 }))
      .rejects.toMatchObject({ status: 400, message: 'Credit exceeds available installment balance by 10.00' });
    expect(calls).toEqual(['lock-credit', 'lock-installments:2025-2026']);
  });
});

function checkHarness(payment: object | null, locked: object[] = [installment], reserved = 0) {
  const calls: string[] = [];
  const service = new PaymentService(
    {
      getByIdForUpdate: async () => { calls.push('lock-payment'); return payment; },
      update: async () => { calls.push('update'); },
    } as any,
    new PaymentValidator({} as any, {} as any, {} as any, {} as any, {} as any, {} as any),
    {} as any,
    {
      getByPaymentId: async () => [{ installmentId: installment.id, feeId: installment.feeId, installment: { number: 1 }, amount: '70.00' }],
      getCompletedTotalByInstallmentIds: async () => new Map(),
      getReservedTotalByInstallmentIds: async () => new Map([[installment.id, reserved]]),
    } as any,
    {} as any,
    { getByFeeAndNumbersForUpdate: async () => { calls.push('lock-installments'); return locked; } } as any,
    { record: async () => { calls.push('audit'); } } as any,
    { activateCreditForSourcePayment: async () => { calls.push('activate-credit'); } } as any,
  );
  return { service, calls };
}

describe('payment state guards', () => {
  it.each([
    { payment: null, status: 404, message: 'Payment not found' },
    { payment: { paymentMethod: 'cash', status: 'deposited' }, status: 400, message: 'Check status changes are only allowed for check payments' },
    { payment: { paymentMethod: 'check', status: 'pending' }, status: 409, message: 'Cannot transition check from pending to completed' },
  ])('rejects invalid check changes before further reads or writes: %j', async ({ payment, status, message }) => {
    const { service, calls } = checkHarness(payment);
    await expect(service.updateCheckStatus('payment-1', { status: 'completed' }))
      .rejects.toMatchObject({ status, message });
    expect(calls).toEqual(['lock-payment']);
  });

  it('rejects a deleted allocation target before settling a check', async () => {
    const { service, calls } = checkHarness({ paymentMethod: 'check', status: 'deposited' }, []);
    await expect(service.updateCheckStatus('payment-1', { status: 'completed' }))
      .rejects.toMatchObject({ status: 409, message: 'A check allocation target no longer exists' });
    expect(calls).toEqual(['lock-payment', 'lock-installments']);
  });

  it('checks other reservations before settlement or credit activation', async () => {
    const { service, calls } = checkHarness({ paymentMethod: 'check', status: 'deposited' }, [installment], 40);
    await expect(service.updateCheckStatus('payment-1', { status: 'completed' }))
      .rejects.toMatchObject({ status: 409, message: 'Check allocations exceed installment #1' });
    expect(calls).toEqual(['lock-payment', 'lock-installments']);
  });
});
