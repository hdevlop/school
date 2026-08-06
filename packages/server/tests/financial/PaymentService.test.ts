import { describe, expect, it, mock } from 'bun:test';

mock.module('najm-event', () => ({
  Events: () => () => undefined,
  EventService: class {},
  On: () => () => undefined,
}));

const { PaymentService } = await import('@server/modules/financial/payments/PaymentService');

function createMockDeps() {
  return {
    paymentRepository: {
      getAll: mock(() => Promise.resolve([])),
      getTodayPayments: mock(() => Promise.resolve([])),
      getTodayPaymentsTotal: mock(() => Promise.resolve({ total: 0 })),
      getThisMonthPayments: mock(() => Promise.resolve([])),
      getThisMonthPaymentsTotal: mock(() => Promise.resolve({ total: 0 })),
      getThisWeekPayments: mock(() => Promise.resolve([])),
      getThisWeekPaymentsTotal: mock(() => Promise.resolve({ total: 0 })),
      getById: mock(() => Promise.resolve({ id: 'pay_01', studentId: 'stu_01' })),
      getByIdForUpdate: mock(() => Promise.resolve({ id: 'pay_01', studentId: 'stu_01', status: 'completed' })),
      getByStudent: mock(() => Promise.resolve([])),
      getByIdempotencyKey: mock(() => Promise.resolve(null)),
      getPendingChecks: mock(() => Promise.resolve([])),
      getOverdueChecks: mock(() => Promise.resolve([])),
      create: mock((data) => Promise.resolve({ id: 'pay_01', studentId: data.studentId, ...data })),
      update: mock((_id, data) => Promise.resolve({ id: 'pay_01', studentId: 'stu_01', ...data })),
      delete: mock(() => Promise.resolve({ id: 'pay_01' })),
      clearForSeedReset: mock(() => Promise.resolve({ deletedCount: 0 })),
    },
    paymentValidator: {
      checkExists: mock((id) => Promise.resolve({ id, studentId: 'stu_01', status: 'completed' })),
      checkStudentExists: mock(() => Promise.resolve(true)),
      checkReceiptNumberExists: mock(() => Promise.resolve({ id: 'pay_01' })),
      validate: mock((data) => Promise.resolve(data)),
      validateAllocationStudents: mock(() => Promise.resolve(undefined)),
      validateAllocationBalanceUnderLock: mock(() => Promise.resolve(undefined)),
      findByIdempotencyKey: mock(() => Promise.resolve(null)),
      validateRefund: mock((id) => Promise.resolve({ id, studentId: 'stu_01', status: 'completed' })),
    },
    allocationService: {
      processAllocation: mock(() => Promise.resolve([])),
      mapAllocations: mock(() => Promise.resolve([])),
      processLockedAllocations: mock(() => Promise.resolve([])),
    },
    allocationRepository: {
      getByPaymentId: mock(() => Promise.resolve([])),
      getCompletedTotalByInstallmentIds: mock(() => Promise.resolve(new Map())),
      getReservedTotalByInstallmentIds: mock(() => Promise.resolve(new Map())),
      getTotalRevenue: mock(() => Promise.resolve(0)),
      getRevenueByAcademicYear: mock(() => Promise.resolve([])),
      getRevenueByDateRange: mock(() => Promise.resolve([])),
      getRevenueByPaymentMethod: mock(() => Promise.resolve([])),
      getMonthlyRevenue: mock(() => Promise.resolve([])),
      getRevenueStats: mock(() => Promise.resolve({})),
      getTopPayingStudents: mock(() => Promise.resolve([])),
    },
    feeService: {
      recalcFinancialsByStudent: mock(() => Promise.resolve({})),
    },
    installmentRepository: {
      getByStudentForAutoAllocation: mock(() => Promise.resolve([])),
      getByStudentForAutoAllocationForUpdate: mock(() => Promise.resolve([])),
      getByFeeAndNumbersForUpdate: mock(() => Promise.resolve([])),
    },
    auditService: {
      record: mock(() => Promise.resolve({ id: 'audit_01' })),
    },
    creditService: {
      createLotForPaymentRemainder: mock(() => Promise.resolve(null)),
      cancelCreditForSourcePayment: mock(() => Promise.resolve({})),
      activateCreditForSourcePayment: mock(() => Promise.resolve(null)),
    },
  };
}

function createService(deps = createMockDeps()) {
  const service = new PaymentService(
    deps.paymentRepository as any,
    deps.paymentValidator as any,
    deps.allocationService as any,
    deps.allocationRepository as any,
    deps.feeService as any,
    deps.installmentRepository as any,
    deps.auditService as any,
    deps.creditService as any,
  );
  Object.defineProperty(service, 'events', {
    value: { emit: mock(() => undefined) },
    configurable: true,
  });
  return { service, deps };
}

const validPayment = {
  studentId: 'stu_01',
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

describe('PaymentService.record', () => {
  it('forces new cash payments to completed', async () => {
    const { service, deps } = createService();
    deps.allocationRepository.getByPaymentId = mock(() => Promise.resolve([
      { id: 'alloc_01', amount: '250.00', feeId: 'fee_01', installmentId: 'inst_01' },
    ]));

    await service.record({ ...validPayment, status: 'refunded' } as any, 'usr_01');

    expect(deps.paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        settledDate: '2026-04-13',
        processedBy: 'usr_01',
      }),
    );
  });

  it('initializes check payments as pending with a null settledDate', async () => {
    const { service, deps } = createService();
    deps.allocationRepository.getByPaymentId = mock(() => Promise.resolve([
      { id: 'alloc_01', amount: '250.00', feeId: 'fee_01', installmentId: 'inst_01' },
    ]));

    await service.record({
      ...validPayment,
      paymentMethod: 'check',
      checkNumber: 'CHK-001',
      checkDueDate: '2026-09-30',
    } as any, 'usr_01');

    expect(deps.paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        settledDate: null,
        checkNumber: 'CHK-001',
        checkDueDate: '2026-09-30',
      }),
    );
  });

  it('auto-allocates against locked completed and reserved balances', async () => {
    const { service, deps } = createService();
    deps.installmentRepository.getByStudentForAutoAllocationForUpdate.mockImplementation(() => Promise.resolve([
      { id: 'inst_01', feeId: 'fee_01', number: 1, amount: '100.00' },
      { id: 'inst_02', feeId: 'fee_02', number: 1, amount: '100.00' },
    ]));
    deps.allocationRepository.getCompletedTotalByInstallmentIds.mockImplementation(
      () => Promise.resolve(new Map([['inst_01', 20]])),
    );
    deps.allocationRepository.getReservedTotalByInstallmentIds.mockImplementation(
      () => Promise.resolve(new Map([['inst_01', 30]])),
    );
    deps.allocationService.mapAllocations.mockImplementation(({ allocations }) => Promise.resolve(
      allocations.map((item) => ({
        feeId: item.feeId,
        installmentId: item.feeId === 'fee_01' ? 'inst_01' : 'inst_02',
        installmentNumber: item.number,
        amount: item.amount,
        installmentData: {},
      })),
    ));
    deps.allocationRepository.getByPaymentId.mockImplementation(() => Promise.resolve([
      { id: 'alloc_01', amount: '50.00', feeId: 'fee_01', installmentId: 'inst_01' },
      { id: 'alloc_02', amount: '70.00', feeId: 'fee_02', installmentId: 'inst_02' },
    ]));

    await service.record({
      studentId: 'stu_01',
      amount: 120,
      paymentMethod: 'cash',
      paymentDate: '2026-04-13',
      autoAllocate: true,
      keepRemainderAsCredit: false,
    } as any, 'usr_01');

    expect(deps.installmentRepository.getByStudentForAutoAllocationForUpdate).toHaveBeenCalledWith('stu_01');
    expect(deps.allocationService.mapAllocations).toHaveBeenCalledWith({ allocations: [
      { feeId: 'fee_01', number: 1, amount: 50 },
      { feeId: 'fee_02', number: 1, amount: 70 },
    ] });
    expect(deps.allocationService.processLockedAllocations).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: 'pay_01', paymentAmount: 120 }),
    );
  });
});

describe('PaymentService.voidPayment', () => {
  it('records an audit row and sets voidedAt when voiding a completed payment', async () => {
    const { service, deps } = createService();
    deps.paymentRepository.getById = mock(() => Promise.resolve({
      id: 'pay_01',
      studentId: 'stu_01',
      status: 'completed',
    }));

    const result = await service.voidPayment('pay_01', { reason: 'duplicate' } as any, 'usr_01');

    expect(result.status).toBe('voided');
    expect(deps.paymentRepository.update).toHaveBeenCalledWith('pay_01',
      expect.objectContaining({ status: 'voided', voidReason: 'duplicate' }),
    );
    expect(deps.auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'payment.voided' }),
    );
  });
});

describe('PaymentService.update', () => {
  it('keeps a completed non-check settlement date aligned with the payment date', async () => {
    const { service, deps } = createService();
    deps.paymentRepository.getByIdForUpdate = mock(() => Promise.resolve({
      id: 'pay_01',
      studentId: 'stu_01',
      paymentMethod: 'cash',
      paymentDate: '2026-04-13',
      settledDate: '2026-04-13',
      status: 'completed',
    }));

    await service.update('pay_01', { paymentDate: '2026-04-14' } as any, 'usr_01');

    expect(deps.paymentRepository.update).toHaveBeenCalledWith('pay_01',
      expect.objectContaining({ paymentDate: '2026-04-14', settledDate: '2026-04-14' }),
    );
  });
});

describe('PaymentService.updateCheckStatus', () => {
  it('rejects invalid transitions', async () => {
    const { service, deps } = createService();
    deps.paymentRepository.getByIdForUpdate = mock(() => Promise.resolve({
      id: 'pay_01',
      paymentMethod: 'check',
      status: 'bounced',
    }));

    await expect(
      service.updateCheckStatus('pay_01', { status: 'completed' } as any, 'usr_01'),
    ).rejects.toThrow();
  });
});
