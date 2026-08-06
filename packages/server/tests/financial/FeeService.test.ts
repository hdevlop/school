import { describe, expect, it, mock } from 'bun:test';

mock.module('najm-event', () => ({
  Events: () => () => undefined,
  EventService: class {},
  On: () => () => undefined,
}));

const { FeeService } = await import('@server/modules/financial/fees/FeeService');

function createMockDeps() {
  return {
    feeRepository: {
      getAll: mock(() => Promise.resolve([])),
      getOverdue: mock(() => Promise.resolve([])),
      getOverdueSummary: mock(() => Promise.resolve({})),
      getOverdueByStudent: mock(() => Promise.resolve([])),
      getById: mock(() => Promise.resolve(null)),
      getByStudent: mock(() => Promise.resolve([])),
      getByStudentAndFeeType: mock(() => Promise.resolve(null)),
      getAllocatedTotal: mock(() => Promise.resolve(0)),
      getFeeIdsByStudent: mock(() => Promise.resolve([])),
      create: mock((data) => Promise.resolve({ id: 'fee_01', ...data })),
      update: mock((_id, data) => Promise.resolve({ id: 'fee_01', ...data })),
      delete: mock(() => Promise.resolve({ id: 'fee_01' })),
      deleteAll: mock(() => Promise.resolve({ deletedCount: 0, deletedFees: [] })),
    },
    feeValidator: {
      checkExists: mock((id) => Promise.resolve({ id, status: 'pending', netAmount: 0, installments: [] })),
      validate: mock((data) => Promise.resolve(data)),
      validateFeeTypeExists: mock(() => Promise.resolve({ id: 'ft_01', amount: 100, paymentType: 'recurring' })),
    },
    installmentService: {
      generateInstallments: mock(() => Promise.resolve([])),
      recalculate: mock((id) => Promise.resolve({ id })),
      recalculateByFeeId: mock(() => Promise.resolve([])),
      cancelFutureUnpaidByFeeId: mock(() => Promise.resolve([])),
      resumeCancelledByFeeId: mock(() => Promise.resolve([])),
    },
    settingsRepository: {
      getAdminSettings: mock(() => Promise.resolve({
        startMonth: 'september',
        endMonth: 'june',
        currentAcademicYear: '2026-2027',
      })),
    },
    classRepository: {
      getClassStudents: mock(() => Promise.resolve([])),
    },
    studentRepository: {
      getById: mock(() => Promise.resolve({
        id: 'stu_01',
        name: 'Ahmed',
        enrollmentDate: '2026-09-01',
      })),
    },
    auditService: {
      record: mock(() => Promise.resolve({ id: 'audit_01' })),
    },
  };
}

function createService(deps = createMockDeps()) {
  const service = new FeeService(
    deps.feeRepository as any,
    deps.feeValidator as any,
    deps.installmentService as any,
    deps.settingsRepository as any,
    deps.classRepository as any,
    deps.studentRepository as any,
    deps.auditService as any,
  );
  Object.defineProperty(service, 'events', {
    value: { emit: mock(() => undefined) },
    configurable: true,
  });
  return { service, deps };
}

describe('FeeService.recalculate', () => {
  it('downgrades a previously paid fee to pending when allocated total is 0 and no installment is overdue', async () => {
    const { service, deps } = createService();
    deps.feeRepository.getAllocatedTotal.mockImplementation(() => Promise.resolve(0));
    deps.feeRepository.getById.mockImplementation(() => Promise.resolve({
      id: 'fee_01',
      status: 'paid',
      netAmount: '500.00',
      installments: [
        { id: 'i1', number: 1, dueDate: '2099-12-01', amount: '250.00', paidAmount: '0', status: 'pending' },
        { id: 'i2', number: 2, dueDate: '2099-12-01', amount: '250.00', paidAmount: '0', status: 'pending' },
      ],
    }));

    const result = await service.recalculate('fee_01');

    expect(deps.feeRepository.update).toHaveBeenCalledWith('fee_01', {
      paidAmount: '0.00',
      status: 'pending',
    });
    expect(result.status).toBe('pending');
  });

  it('keeps status as overdue when allocated total is 0 and at least one unpaid installment is past due', async () => {
    const { service, deps } = createService();
    deps.feeRepository.getAllocatedTotal.mockImplementation(() => Promise.resolve(0));
    deps.feeRepository.getById.mockImplementation(() => Promise.resolve({
      id: 'fee_01',
      status: 'pending',
      netAmount: '500.00',
      installments: [
        { id: 'i1', number: 1, dueDate: '2000-01-01', amount: '250.00', paidAmount: '0', status: 'pending' },
        { id: 'i2', number: 2, dueDate: '2099-12-01', amount: '250.00', paidAmount: '0', status: 'pending' },
      ],
    }));

    const result = await service.recalculate('fee_01');

    expect(deps.feeRepository.update).toHaveBeenCalledWith('fee_01', {
      paidAmount: '0.00',
      status: 'overdue',
    });
    expect(result.status).toBe('overdue');
  });

  it('keeps status as paid when allocated total covers netAmount', async () => {
    const { service, deps } = createService();
    deps.feeRepository.getAllocatedTotal.mockImplementation(() => Promise.resolve(500));
    deps.feeRepository.getById.mockImplementation(() => Promise.resolve({
      id: 'fee_01',
      status: 'partiallyPaid',
      netAmount: '500.00',
      installments: [],
    }));

    const result = await service.recalculate('fee_01');

    expect(deps.feeRepository.update).toHaveBeenCalledWith('fee_01', {
      paidAmount: '500.00',
      status: 'paid',
    });
    expect(result.status).toBe('paid');
  });

  it('sets status to partiallyPaid when allocated total is between 0 and netAmount', async () => {
    const { service, deps } = createService();
    deps.feeRepository.getAllocatedTotal.mockImplementation(() => Promise.resolve(125));
    deps.feeRepository.getById.mockImplementation(() => Promise.resolve({
      id: 'fee_01',
      status: 'pending',
      netAmount: '500.00',
      installments: [],
    }));

    const result = await service.recalculate('fee_01');

    expect(deps.feeRepository.update).toHaveBeenCalledWith('fee_01', {
      paidAmount: '125.00',
      status: 'partiallyPaid',
    });
    expect(result.status).toBe('partiallyPaid');
  });
});

describe('FeeService.createClassBulk', () => {
  it('counts duplicate-conflict errors as skipped and does not add them to results.errors', async () => {
    const { service, deps } = createService();
    deps.classRepository.getClassStudents.mockImplementation(() => Promise.resolve([
      { id: 'stu_01', name: 'Ahmed', sectionId: 'sec_01' },
      { id: 'stu_02', name: 'Fatima', sectionId: 'sec_01' },
    ]));

    const dup = Object.assign(new Error('duplicate fee'), { status: 409 });
    let call = 0;
    (service as any).create = mock(() => {
      call += 1;
      if (call === 1) return Promise.resolve({ id: 'fee_01' });
      return Promise.reject(dup);
    });

    const result = await service.createClassBulk({
      classId: 'cls_01',
      feeTypeId: 'ft_01',
      schedule: 'monthly',
    });

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it('collects non-409 errors into results.errors with student context', async () => {
    const { service, deps } = createService();
    deps.classRepository.getClassStudents.mockImplementation(() => Promise.resolve([
      { id: 'stu_01', name: 'Ahmed', sectionId: 'sec_01' },
    ]));

    (service as any).create = mock(() => Promise.reject(new Error('boom')));

    const result = await service.createClassBulk({
      classId: 'cls_01',
      feeTypeId: 'ft_01',
      schedule: 'monthly',
    });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([
      { studentId: 'stu_01', studentName: 'Ahmed', error: 'boom' },
    ]);
  });
});

describe('FeeService.processFees', () => {
  it('passes student.enrollmentDate as effectiveDate for nested fees when not explicitly set', async () => {
    const { service, deps } = createService();
    const createBulkMock = mock((fees) => Promise.resolve(fees.map((_, i) => ({ id: `fee_${i + 1}` }))));
    (service as any).createBulk = createBulkMock;

    const student = { id: 'stu_01', enrollmentDate: '2026-09-01' };
    const fees = [
      { feeTypeId: 'ft_01', schedule: 'monthly' },
      { feeTypeId: 'ft_02', schedule: 'monthly' },
    ];

    await service.processFees(student, fees as any, { id: 'usr_01' });

    expect(createBulkMock).toHaveBeenCalledTimes(1);
    const passedFees = createBulkMock.mock.calls[0][0];
    expect(passedFees).toEqual([
      expect.objectContaining({ studentId: 'stu_01', feeTypeId: 'ft_01', effectiveDate: '2026-09-01' }),
      expect.objectContaining({ studentId: 'stu_01', feeTypeId: 'ft_02', effectiveDate: '2026-09-01' }),
    ]);
  });

  it('does not overwrite an explicit effectiveDate on a nested fee', async () => {
    const { service, deps } = createService();
    const createBulkMock = mock((fees) => Promise.resolve(fees.map((_, i) => ({ id: `fee_${i + 1}` }))));
    (service as any).createBulk = createBulkMock;

    const student = { id: 'stu_01', enrollmentDate: '2026-09-01' };
    const fees = [
      { feeTypeId: 'ft_01', schedule: 'monthly', effectiveDate: '2026-11-15' },
    ];

    await service.processFees(student, fees as any, { id: 'usr_01' });

    const passedFees = createBulkMock.mock.calls[0][0];
    expect(passedFees[0].effectiveDate).toBe('2026-11-15');
  });

  it('returns undefined when no fees are provided', async () => {
    const { service } = createService();
    const result = await service.processFees({ id: 'stu_01', enrollmentDate: '2026-09-01' }, undefined, { id: 'usr_01' });
    expect(result).toBeUndefined();
  });
});

describe('FeeService.update', () => {
  it('recalculates amounts and regenerates installments when only effectiveDate changes', async () => {
    const { service, deps } = createService();
    deps.feeRepository.getById.mockImplementation(() => Promise.resolve({
      id: 'fee_01',
      feeTypeId: 'ft_01',
      schedule: 'monthly',
      academicYear: '2026-2027',
      effectiveDate: '2026-09-01',
      createdAt: '2026-09-01',
      baseAmount: 100,
      discountAmount: 0,
      paymentCount: 0,
      netAmount: '1000.00',
      installments: [],
    }));

    await service.update('fee_01', { effectiveDate: '2026-11-01' });

    expect(deps.feeValidator.validateFeeTypeExists).toHaveBeenCalledWith('ft_01');
    expect(deps.feeRepository.update).toHaveBeenNthCalledWith(
      1,
      'fee_01',
      expect.objectContaining({
        effectiveDate: '2026-11-01',
        grossAmount: 800,
        netAmount: 800,
      }),
    );
    expect(deps.installmentService.generateInstallments).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'fee_01',
        effectiveDate: '2026-11-01',
        netAmount: 800,
      }),
    );
  });
});

describe('FeeService transport lifecycle', () => {
  const transportFee = {
    id: 'fee_transport',
    studentId: 'stu_01',
    feeTypeId: 'ft_transport',
    paidAmount: '100.00',
    grossAmount: '1000.00',
    netAmount: '1000.00',
    discountAmount: '0.00',
    notes: null,
    installments: [],
  };

  it('cancels only eligible future installments and reduces the balance', async () => {
    const { service, deps } = createService();
    deps.feeRepository.getByStudentAndFeeType.mockImplementation(() => Promise.resolve(transportFee));
    deps.installmentService.cancelFutureUnpaidByFeeId.mockImplementation(() => Promise.resolve([
      { id: 'inst_02', amount: '100.00' },
      { id: 'inst_03', amount: '100.00' },
    ]));
    deps.feeRepository.getById.mockImplementation(() => Promise.resolve({
      ...transportFee,
      netAmount: '800.00',
      grossAmount: '800.00',
    }));

    const result = await service.endTransportFee('stu_01', 'ft_transport', '2026-11-15', 'admin_01');

    expect(deps.feeRepository.update).toHaveBeenCalledWith('fee_transport', expect.objectContaining({
      netAmount: 800,
      grossAmount: 800,
    }));
    expect(result.cancelledInstallments).toBe(2);
  });

  it('restores cancelled installments when transport resumes', async () => {
    const { service, deps } = createService();
    deps.feeRepository.getByStudentAndFeeType.mockImplementation(() => Promise.resolve({
      ...transportFee,
      grossAmount: '800.00',
      netAmount: '800.00',
    }));
    deps.installmentService.resumeCancelledByFeeId.mockImplementation(() => Promise.resolve([
      { id: 'inst_04', amount: '100.00' },
      { id: 'inst_05', amount: '100.00' },
    ]));
    deps.feeRepository.getById.mockImplementation(() => Promise.resolve({
      ...transportFee,
      grossAmount: '1000.00',
      netAmount: '1000.00',
    }));

    const result = await service.resumeTransportFee('stu_01', 'ft_transport', '2027-01-01', 'admin_01');

    expect(deps.installmentService.resumeCancelledByFeeId).toHaveBeenCalledWith('fee_transport', '2027-01-01');
    expect(deps.feeRepository.update).toHaveBeenCalledWith('fee_transport', expect.objectContaining({
      netAmount: 1000,
      grossAmount: 1000,
    }));
    expect(result.resumedInstallments).toBe(2);
  });
});
