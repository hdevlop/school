import { describe, expect, it, mock } from 'bun:test';

const { CreditService } = await import('@server/modules/financial/credits/CreditService');

function createService() {
  const deps = {
    creditRepository: {
      listAvailableLotsForUpdate: mock(() => Promise.resolve([{
        id: 'lot_01', sourcePaymentId: 'pay_01', remainingAmount: '200.00', status: 'available',
      }])),
      createApplication: mock((data) => Promise.resolve({ id: 'app_01', ...data })),
      updateLot: mock((id, data) => Promise.resolve({ id, ...data })),
      activatePendingLotBySourcePayment: mock(() => Promise.resolve({ id: 'lot_01', status: 'available' })),
      cancelLotsBySourcePayment: mock(() => Promise.resolve([])),
      reverseApplicationsByPayment: mock(() => Promise.resolve([])),
      listLotsForStudent: mock(() => Promise.resolve([])),
    },
    allocationRepository: {
      getCompletedTotalByInstallmentIds: mock(() => Promise.resolve(new Map())),
      getReservedTotalByInstallmentIds: mock(() => Promise.resolve(new Map())),
    },
    allocationService: {
      create: mock((data) => Promise.resolve({ id: 'alloc_01', ...data })),
    },
    installmentRepository: {
      getByStudentForAutoAllocationForUpdate: mock(() => Promise.resolve([{
        id: 'inst_01', feeId: 'fee_01', number: 1, amount: '500.00', dueDate: '2026-09-01',
      }])),
    },
    feeService: { recalcFinancialsByStudent: mock(() => Promise.resolve([])) },
    auditService: { record: mock(() => Promise.resolve({ id: 'audit_01' })) },
  };
  const service = new CreditService(
    deps.creditRepository as any,
    deps.allocationRepository as any,
    deps.allocationService as any,
    deps.installmentRepository as any,
    deps.feeService as any,
    deps.auditService as any,
  );
  return { service, deps };
}

describe('CreditService', () => {
  it('locks credit lots and installments before applying credit', async () => {
    const { service, deps } = createService();
    const result = await service.applyStudentCredit({ studentId: 'stu_01', amount: 200 }, 'usr_01');

    expect(deps.creditRepository.listAvailableLotsForUpdate).toHaveBeenCalledWith('stu_01');
    expect(deps.installmentRepository.getByStudentForAutoAllocationForUpdate).toHaveBeenCalledWith('stu_01');
    expect(deps.allocationService.create).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: 'pay_01', amount: 200 }),
      'usr_01',
    );
    expect(result.lotUpdates).toEqual([{ id: 'lot_01', remaining: 0, status: 'consumed' }]);
  });

  it('activates pending credit when its source check completes', async () => {
    const { service, deps } = createService();
    await service.activateCreditForSourcePayment('pay_01', 'usr_01');
    expect(deps.creditRepository.activatePendingLotBySourcePayment).toHaveBeenCalledWith('pay_01');
    expect(deps.auditService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'creditLot.activated' }));
  });
});
