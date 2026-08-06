import { describe, expect, it, mock } from 'bun:test';

mock.module('najm-event', () => ({
  Events: () => () => undefined,
  EventService: class {},
  On: () => () => undefined,
}));

const { AllocationService } = await import('@server/modules/financial/allocations/AllocationService');

function createMockDeps() {
  const existingAllocation = {
    id: 'alloc_01',
    paymentId: 'pay_01',
    feeId: 'fee_01',
    installmentId: 'inst_01',
    amount: '100.00',
  };

  return {
    allocationRepository: {
      getAll: mock(() => Promise.resolve([])),
      getById: mock(() => Promise.resolve(existingAllocation)),
      getByPaymentId: mock(() => Promise.resolve([])),
      getByFeeId: mock(() => Promise.resolve([])),
      getByInstallmentId: mock(() => Promise.resolve([])),
      getByStudentId: mock(() => Promise.resolve([])),
      create: mock((data) => Promise.resolve({ id: 'alloc_new', ...data })),
      createBulk: mock(() => Promise.resolve([])),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({ id: 'alloc_01' })),
      deleteAll: mock(() => Promise.resolve([])),
      getCompletedTotalByInstallmentIds: mock(() => Promise.resolve(new Map())),
      getReservedTotalByInstallmentIds: mock(() => Promise.resolve(new Map())),
      getTotalAllocatedForPayment: mock(() => Promise.resolve(0)),
    },
    allocationValidator: {
      checkExists: mock(() => Promise.resolve(existingAllocation)),
      checkPaymentExists: mock(() => Promise.resolve({ id: 'pay_01' })),
      validate: mock((data) => Promise.resolve(data)),
    },
    installmentRepository: {
      getByFeeId: mock(() => Promise.resolve([])),
      getByFeeAndNumbersForUpdate: mock(() => Promise.resolve([])),
    },
    installmentService: {
      recalculate: mock(() => Promise.resolve({})),
    },
    feeService: {
      recalculate: mock(() => Promise.resolve({})),
    },
    auditService: {
      record: mock(() => Promise.resolve({ id: 'audit_01' })),
    },
  };
}

function createService(deps = createMockDeps()) {
  const service = new AllocationService(
    deps.allocationRepository as any,
    deps.allocationValidator as any,
    deps.installmentRepository as any,
    deps.installmentService as any,
    deps.feeService as any,
    deps.auditService as any,
  );
  Object.defineProperty(service, 'events', {
    value: { emit: mock(() => undefined) },
    configurable: true,
  });
  return { service, deps };
}

describe('AllocationService.delete', () => {
  it('recalculates the touched installment and fee after deleting an allocation', async () => {
    const { service, deps } = createService();

    const result = await service.delete('alloc_01');

    expect(deps.allocationValidator.checkExists).toHaveBeenCalledWith('alloc_01');
    expect(deps.allocationRepository.delete).toHaveBeenCalledWith('alloc_01');
    expect(deps.installmentService.recalculate).toHaveBeenCalledWith('inst_01');
    expect(deps.feeService.recalculate).toHaveBeenCalledWith('fee_01');
    expect(result).toEqual({ id: 'alloc_01' });
  });

  it('still recalculates the fee when the allocation has no installmentId', async () => {
    const { service, deps } = createService();
    deps.allocationValidator.checkExists.mockImplementation(() => Promise.resolve({
      id: 'alloc_01',
      feeId: 'fee_01',
      installmentId: null,
    }));

    await service.delete('alloc_01');

    expect(deps.installmentService.recalculate).not.toHaveBeenCalled();
    expect(deps.feeService.recalculate).toHaveBeenCalledWith('fee_01');
  });

  it('does not call repository.delete when the allocation does not exist', async () => {
    const { service, deps } = createService();
    deps.allocationValidator.checkExists.mockImplementation(() => {
      const err = new Error('Allocation not found') as any;
      err.status = 404;
      throw err;
    });

    try {
      await service.delete('alloc_missing');
      expect.unreachable('Should have thrown');
    } catch (error: any) {
      expect(error.status).toBe(404);
    }

    expect(deps.allocationRepository.delete).not.toHaveBeenCalled();
    expect(deps.installmentService.recalculate).not.toHaveBeenCalled();
    expect(deps.feeService.recalculate).not.toHaveBeenCalled();
  });
});

describe('AllocationService.processLockedAllocations', () => {
  it('locks targets and rejects amounts that exceed completed plus reserved capacity', async () => {
    const { service, deps } = createService();
    deps.installmentRepository.getByFeeAndNumbersForUpdate.mockImplementation(() => Promise.resolve([{
      id: 'inst_01', feeId: 'fee_01', number: 1, amount: '100.00',
    }]));
    deps.allocationRepository.getCompletedTotalByInstallmentIds.mockImplementation(
      () => Promise.resolve(new Map([['inst_01', 20]])),
    );
    deps.allocationRepository.getReservedTotalByInstallmentIds.mockImplementation(
      () => Promise.resolve(new Map([['inst_01', 60]])),
    );

    await expect(service.processLockedAllocations({
      paymentId: 'pay_02',
      paymentAmount: 30,
      allocations: [{
        feeId: 'fee_01', installmentId: 'inst_01', installmentNumber: 1, amount: 30, installmentData: {},
      }],
    })).rejects.toThrow();

    expect(deps.installmentRepository.getByFeeAndNumbersForUpdate).toHaveBeenCalledWith([
      { feeId: 'fee_01', number: 1 },
    ]);
    expect(deps.allocationRepository.create).not.toHaveBeenCalled();
  });
});
