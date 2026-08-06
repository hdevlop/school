import { describe, expect, it, mock } from 'bun:test';

mock.module('najm-event', () => ({
  Events: () => () => undefined,
  EventService: class {},
  On: () => () => undefined,
}));

const { PayrollService } = await import('@server/modules/financial/payroll/PayrollService');

function createMockDeps() {
  return {
    payrollRepository: {
      getAll: mock(() => Promise.resolve([])),
      getById: mock(() => Promise.resolve(null)),
      getByPeriod: mock(() => Promise.resolve([])),
      getPeriodSummary: mock(() => Promise.resolve({})),
      getByStaff: mock(() => Promise.resolve([])),
      getStaffIdsWithPayslip: mock(() => Promise.resolve([])),
      getByStaffAndPeriod: mock(() => Promise.resolve(null)),
      create: mock((data) => Promise.resolve({ id: 'ps_01', ...data })),
      createMany: mock((rows) => Promise.resolve(rows.map((r, i) => ({ id: `ps_${i + 1}`, ...r })))),
      update: mock((_id, data) => Promise.resolve({ id: 'ps_01', ...data })),
      updateBulk: mock(() => Promise.resolve([])),
      delete: mock(() => Promise.resolve({ id: 'ps_01' })),
      deleteBulk: mock(() => Promise.resolve([])),
    },
    payrollValidator: {
      ensureExists: mock(() => Promise.resolve({ id: 'ps_01' })),
      ensurePayable: mock(() => Promise.resolve({ id: 'ps_01' })),
    },
    staffRepository: {
      getByStatus: mock(() => Promise.resolve([])),
      getById: mock(() => Promise.resolve({ id: 'staff_01', name: 'Karim Alaoui', role: 'teacher', status: 'active', salary: 5000 })),
    },
    auditService: {
      record: mock(() => Promise.resolve({ id: 'audit_01' })),
    },
  };
}

function createService(deps = createMockDeps()) {
  const service = new PayrollService(
    deps.payrollRepository as any,
    deps.payrollValidator as any,
    deps.staffRepository as any,
    deps.auditService as any,
  );
  Object.defineProperty(service, 'events', {
    value: { emit: mock(() => undefined) },
    configurable: true,
  });
  return { service, deps };
}

describe('PayrollService.unpayStaff', () => {
  it('clears payment method, date, transaction ref, and processedBy when the payslip is unpaid', async () => {
    const { service, deps } = createService();
    deps.payrollRepository.getByStaffAndPeriod.mockImplementation(() => Promise.resolve({
      id: 'ps_01',
      staffId: 'staff_01',
      period: '2026-04',
      status: 'paid',
      paymentMethod: 'bankTransfer',
      paymentDate: '2026-04-30',
      transactionRef: 'TXN-001',
      processedBy: 'usr_01',
    }));

    await service.unpayStaff({ staffId: 'staff_01', period: '2026-04' });

    expect(deps.payrollRepository.update).toHaveBeenCalledWith('ps_01', {
      status: 'pending',
      paymentMethod: null,
      paymentDate: null,
      transactionRef: null,
      processedBy: null,
    });
  });

  it('returns { unpaid: false } when there is no payslip for the staff and period', async () => {
    const { service, deps } = createService();
    deps.payrollRepository.getByStaffAndPeriod.mockImplementation(() => Promise.resolve(null));

    const result = await service.unpayStaff({ staffId: 'staff_01', period: '2026-04' });

    expect(result).toEqual({ unpaid: false });
    expect(deps.payrollRepository.update).not.toHaveBeenCalled();
  });
});

describe('PayrollService.pay', () => {
  it('sets processedBy when the caller passes it (semantic: paid-by)', async () => {
    const { service, deps } = createService();
    deps.payrollValidator.ensurePayable.mockImplementation(() => Promise.resolve({
      id: 'ps_01',
      status: 'pending',
    }));

    await service.pay('ps_01', {
      paymentMethod: 'bankTransfer',
      paymentDate: '2026-04-30',
    }, 'usr_01');

    const call = deps.payrollRepository.update.mock.calls[0];
    expect(call[1]).toMatchObject({
      status: 'paid',
      paymentMethod: 'bankTransfer',
      paymentDate: '2026-04-30',
      processedBy: 'usr_01',
    });
  });
});

describe('PayrollService.runPayroll', () => {
  it('records the runner as processedBy on each generated pending payslip', async () => {
    const { service, deps } = createService();
    deps.staffRepository.getByStatus.mockImplementation(() => Promise.resolve([
      { id: 'staff_01', name: 'Karim', role: 'teacher', status: 'active', salary: 5000 },
      { id: 'staff_02', name: 'Layla', role: 'teacher', status: 'active', salary: 4500 },
    ]));

    await service.runPayroll({ period: '2026-04' }, 'usr_admin');

    const rows = deps.payrollRepository.createMany.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.status).toBe('pending');
      expect(row.processedBy).toBe('usr_admin');
    }
  });
});
