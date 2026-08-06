import { describe, expect, it, mock } from 'bun:test';
import { ExpenseService } from '@server/modules/financial/expenses/ExpenseService';
import { getAcademicYearDateRange } from '@server/modules/financial/utils';

function createMockDeps() {
  return {
    expenseRepository: {
      getAll: mock(() => Promise.resolve([])),
      getCount: mock(() => Promise.resolve({ count: 0 })),
      getById: mock(() => Promise.resolve({
        id: 'exp_01',
        category: 'utilities',
        title: 'Electricity bill',
        amount: 1500,
        expenseDate: '2026-04-01',
        status: 'pending',
      })),
      getByDateRange: mock(() => Promise.resolve([])),
      getByInvoiceNumber: mock(() => Promise.resolve(null)),
      getByReceiptNumber: mock(() => Promise.resolve(null)),
      getByCheckNumber: mock(() => Promise.resolve(null)),
      getPendingApprovals: mock(() => Promise.resolve([])),
      getTotalExpensesByDateRange: mock(() => Promise.resolve({ total: 0, count: 0 })),
      create: mock((data) => Promise.resolve({ id: 'exp_01', ...data })),
      update: mock((_id, data) => Promise.resolve({ id: 'exp_01', ...data })),
      delete: mock(() => Promise.resolve({ id: 'exp_01' })),
      deleteAll: mock(() => Promise.resolve({ deletedCount: 0, deletedExpenses: [] })),
      approve: mock(() => Promise.resolve({ id: 'exp_01', status: 'approved' })),
      reject: mock(() => Promise.resolve({ id: 'exp_01', status: 'rejected' })),
      markAsPaid: mock(() => Promise.resolve({ id: 'exp_01', status: 'paid' })),
    },
    expenseValidator: {
      checkExists: mock(() => Promise.resolve(true)),
      checkInvoiceNumberExists: mock(() => Promise.resolve({ id: 'exp_01' })),
      checkReceiptNumberExists: mock(() => Promise.resolve({ id: 'exp_01' })),
      checkCheckNumberExists: mock(() => Promise.resolve({ id: 'exp_01' })),
      validate: mock((data) => Promise.resolve(data)),
      checkCanApprove: mock(() => Promise.resolve(true)),
      validateRejection: mock(() => Promise.resolve(true)),
      validateApproval: mock((data) => Promise.resolve(data)),
      checkCanPay: mock(() => Promise.resolve(true)),
      validatePayment: mock((data) => Promise.resolve(data)),
      validatePaymentDate: mock(() => Promise.resolve(true)),
      validateCheckPayment: mock(() => Promise.resolve(true)),
    },
    auditService: {
      record: mock(() => Promise.resolve({ id: 'audit_01' })),
    },
  };
}

function createService(deps = createMockDeps()) {
  const service = new ExpenseService(
    deps.expenseRepository as any,
    deps.expenseValidator as any,
    deps.auditService as any,
  );

  return { service, deps };
}

const validCreateData = {
  category: 'utilities',
  title: 'Electricity bill for April',
  amount: 1500,
  expenseDate: '2026-04-01',
};

describe('ExpenseService', () => {
  describe('getAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.expenseRepository.getAll.mockImplementation(() => Promise.resolve([{ id: 'exp_01' }]));

      const result = await service.getAll();

      expect(result).toEqual([{ id: 'exp_01' }]);
    });
  });

  describe('getCount', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.expenseRepository.getCount.mockImplementation(() => Promise.resolve({ count: 7 }));

      const result = await service.getCount();

      expect(result).toEqual({ count: 7 });
    });
  });

  describe('getById', () => {
    it('checks existence before returning the repository result', async () => {
      const { service, deps } = createService();
      const expense = { id: 'exp_01', title: 'Electricity bill' };
      deps.expenseRepository.getById.mockImplementation(() => Promise.resolve(expense));

      const result = await service.getById('exp_01');

      expect(deps.expenseValidator.checkExists).toHaveBeenCalledWith('exp_01');
      expect(deps.expenseRepository.getById).toHaveBeenCalledWith('exp_01');
      expect(result).toEqual(expense);
    });
  });

  describe('getByDateRange', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      const expenses = [{ id: 'exp_01' }, { id: 'exp_02' }];
      deps.expenseRepository.getByDateRange.mockImplementation(() => Promise.resolve(expenses));

      const result = await service.getByDateRange('2026-04-01', '2026-04-30');

      expect(deps.expenseRepository.getByDateRange).toHaveBeenCalledWith('2026-04-01', '2026-04-30');
      expect(result).toEqual(expenses);
    });
  });

  describe('getByInvoiceNumber', () => {
    it('checks existence then returns the matching expense', async () => {
      const { service, deps } = createService();
      const expense = { id: 'exp_01', invoiceNumber: 'INV-001' };
      deps.expenseRepository.getByInvoiceNumber.mockImplementation(() => Promise.resolve(expense));

      const result = await service.getByInvoiceNumber('INV-001');

      expect(deps.expenseValidator.checkInvoiceNumberExists).toHaveBeenCalledWith('INV-001');
      expect(result).toEqual(expense);
    });
  });

  describe('getByReceiptNumber', () => {
    it('checks existence then returns the matching expense', async () => {
      const { service, deps } = createService();
      const expense = { id: 'exp_01', receiptNumber: 'RCT-001' };
      deps.expenseRepository.getByReceiptNumber.mockImplementation(() => Promise.resolve(expense));

      const result = await service.getByReceiptNumber('RCT-001');

      expect(deps.expenseValidator.checkReceiptNumberExists).toHaveBeenCalledWith('RCT-001');
      expect(result).toEqual(expense);
    });
  });

  describe('getByCheckNumber', () => {
    it('checks existence then returns the matching expense', async () => {
      const { service, deps } = createService();
      const expense = { id: 'exp_01', checkNumber: 'CHK-001' };
      deps.expenseRepository.getByCheckNumber.mockImplementation(() => Promise.resolve(expense));

      const result = await service.getByCheckNumber('CHK-001');

      expect(deps.expenseValidator.checkCheckNumberExists).toHaveBeenCalledWith('CHK-001');
      expect(result).toEqual(expense);
    });
  });

  describe('getPendingApprovals', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      const expenses = [{ id: 'exp_01', status: 'pending' }];
      deps.expenseRepository.getPendingApprovals.mockImplementation(() => Promise.resolve(expenses));

      const result = await service.getPendingApprovals();

      expect(result).toEqual(expenses);
    });
  });

  describe('getTotalExpenses', () => {
    it('uses the current academic year date range and returns the total only', async () => {
      const { service, deps } = createService();
      deps.expenseRepository.getTotalExpensesByDateRange.mockImplementation(() => Promise.resolve({
        total: 8750,
        count: 4,
      }));

      const { startDate, endDate } = getAcademicYearDateRange();
      const result = await service.getTotalExpenses();

      expect(deps.expenseRepository.getTotalExpensesByDateRange).toHaveBeenCalledWith(startDate, endDate);
      expect(result).toBe(8750);
    });
  });

  describe('create', () => {
    it('validates and normalizes the expense payload before create', async () => {
      const { service, deps } = createService();
      deps.expenseRepository.create.mockImplementation((data) => Promise.resolve({ id: 'exp_01', ...data }));

      await service.create(validCreateData);

      expect(deps.expenseValidator.validate).toHaveBeenCalledWith(validCreateData);
      expect(deps.expenseRepository.create).toHaveBeenCalledWith({
        category: 'utilities',
        title: 'Electricity bill for April',
        amount: 1500,
        expenseDate: '2026-04-01',
        paymentMethod: null,
        paymentDate: null,
        vendor: null,
        invoiceNumber: null,
        receiptNumber: null,
        checkNumber: null,
        transactionRef: null,
        status: 'pending',
        notes: null,
      });
    });

    it('preserves provided optional values and formats dates', async () => {
      const { service, deps } = createService();
      const data = {
        ...validCreateData,
        paymentMethod: 'bankTransfer',
        paymentDate: '04/03/2026',
        vendor: 'Lydec',
        invoiceNumber: 'INV-001',
        receiptNumber: 'RCT-001',
        checkNumber: 'CHK-001',
        transactionRef: 'TXN-001',
        notes: 'Quarterly payment',
      };

      deps.expenseRepository.create.mockImplementation((payload) => Promise.resolve({ id: 'exp_01', ...payload }));

      await service.create(data);

      expect(deps.expenseRepository.create).toHaveBeenCalledWith({
        category: 'utilities',
        title: 'Electricity bill for April',
        amount: 1500,
        expenseDate: '2026-04-01',
        paymentMethod: 'bankTransfer',
        paymentDate: '2026-04-03',
        vendor: 'Lydec',
        invoiceNumber: 'INV-001',
        receiptNumber: 'RCT-001',
        checkNumber: 'CHK-001',
        transactionRef: 'TXN-001',
        status: 'pending',
        notes: 'Quarterly payment',
      });
    });

    it('forces status to pending even if a client-supplied status slips past the DTO', async () => {
      const { service, deps } = createService();
      const data = {
        ...validCreateData,
        status: 'paid',
      };

      deps.expenseRepository.create.mockImplementation((payload) => Promise.resolve({ id: 'exp_01', ...payload }));

      await service.create(data as any);

      const call = deps.expenseRepository.create.mock.calls[0][0];
      expect(call.status).toBe('pending');
    });
  });

  describe('update', () => {
    it('validates and sends only supported update keys to the repository', async () => {
      const { service, deps } = createService();
      const data = {
        title: 'Updated title',
        notes: 'Updated notes',
        ignored: 'not persisted',
      };

      await service.update('exp_01', data as any);

      expect(deps.expenseValidator.validate).toHaveBeenCalledWith(data, 'exp_01');
      expect(deps.expenseRepository.update).toHaveBeenCalledWith('exp_01', {
        title: 'Updated title',
        notes: 'Updated notes',
      });
    });
  });

  describe('delete', () => {
    it('checks existence before deleting', async () => {
      const { service, deps } = createService();

      await service.delete('exp_01');

      expect(deps.expenseValidator.checkExists).toHaveBeenCalledWith('exp_01');
      expect(deps.expenseRepository.delete).toHaveBeenCalledWith('exp_01');
    });
  });

  describe('clearForSeedReset', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.expenseRepository.deleteAll.mockImplementation(() => Promise.resolve({
        deletedCount: 3,
        deletedExpenses: [{ id: 'exp_01' }],
      }));

      const result = await service.clearForSeedReset();

      expect(result.deletedCount).toBe(3);
    });
  });

  describe('approve', () => {
    it('approves an expense then reloads it', async () => {
      const { service, deps } = createService();
      const approvedExpense = { id: 'exp_01', status: 'approved' };
      deps.expenseRepository.getById.mockImplementation(() => Promise.resolve(approvedExpense));

      const result = await service.approve('exp_01', 'usr_01');

      expect(deps.expenseValidator.checkCanApprove).toHaveBeenCalledWith('exp_01');
      expect(deps.expenseRepository.approve).toHaveBeenCalledWith('exp_01', 'usr_01');
      expect(result).toEqual(approvedExpense);
    });
  });

  describe('reject', () => {
    it('rejects an expense then reloads it', async () => {
      const { service, deps } = createService();
      const rejectedExpense = { id: 'exp_01', status: 'rejected' };
      deps.expenseRepository.getById.mockImplementation(() => Promise.resolve(rejectedExpense));

      const result = await service.reject('exp_01', 'usr_01', 'Missing invoice details');

      expect(deps.expenseValidator.checkCanApprove).toHaveBeenCalledWith('exp_01');
      expect(deps.expenseValidator.validateRejection).toHaveBeenCalledWith('Missing invoice details');
      expect(deps.expenseRepository.reject).toHaveBeenCalledWith('exp_01', 'usr_01', 'Missing invoice details');
      expect(result).toEqual(rejectedExpense);
    });
  });

  describe('handleApproval', () => {
    it('routes approve actions to approve()', async () => {
      const { service, deps } = createService();
      const approveMock = mock(() => Promise.resolve({ id: 'exp_01', status: 'approved' }));
      (service as any).approve = approveMock;

      const data = { action: 'approve' as const };
      const result = await service.handleApproval('exp_01', data, 'usr_01');

      expect(deps.expenseValidator.validateApproval).toHaveBeenCalledWith(data);
      expect(approveMock).toHaveBeenCalledWith('exp_01', 'usr_01');
      expect(result).toEqual({ id: 'exp_01', status: 'approved' });
    });

    it('routes reject actions to reject()', async () => {
      const { service, deps } = createService();
      const rejectMock = mock(() => Promise.resolve({ id: 'exp_01', status: 'rejected' }));
      (service as any).reject = rejectMock;

      const data = {
        action: 'reject' as const,
        rejectionReason: 'Missing invoice details',
      };

      const result = await service.handleApproval('exp_01', data, 'usr_01');

      expect(deps.expenseValidator.validateApproval).toHaveBeenCalledWith(data);
      expect(rejectMock).toHaveBeenCalledWith('exp_01', 'usr_01', 'Missing invoice details');
      expect(result).toEqual({ id: 'exp_01', status: 'rejected' });
    });
  });

  describe('recordPayment', () => {
    it('records a check payment, marks the expense as paid, then reloads it', async () => {
      const { service, deps } = createService();
      deps.expenseRepository.getById
        .mockImplementationOnce(() => Promise.resolve({
          id: 'exp_01',
          expenseDate: '2026-04-01',
          status: 'approved',
        }))
        .mockImplementationOnce(() => Promise.resolve({
          id: 'exp_01',
          status: 'paid',
          paymentMethod: 'check',
        }));

      const data = {
        paymentMethod: 'check' as const,
        paymentDate: '2026-04-05',
        checkNumber: 'CHK-001',
        transactionRef: 'TXN-001',
        notes: 'Paid after approval',
      };

      const result = await service.recordPayment('exp_01', data, 'usr_02');

      expect(deps.expenseValidator.checkCanPay).toHaveBeenCalledWith('exp_01');
      expect(deps.expenseValidator.validatePayment).toHaveBeenCalledWith(data);
      expect(deps.expenseValidator.validatePaymentDate).toHaveBeenCalledWith('2026-04-05', '2026-04-01');
      expect(deps.expenseValidator.validateCheckPayment).toHaveBeenCalledWith('check', 'CHK-001');
      expect(deps.expenseRepository.update).toHaveBeenCalledWith('exp_01', {
        paymentMethod: 'check',
        checkNumber: 'CHK-001',
        transactionRef: 'TXN-001',
        notes: 'Paid after approval',
      });
      expect(deps.expenseRepository.markAsPaid).toHaveBeenCalledWith('exp_01', 'usr_02', '2026-04-05');
      expect(result).toEqual({
        id: 'exp_01',
        status: 'paid',
        paymentMethod: 'check',
      });
    });

    it('clears checkNumber and empty optional fields for non-check payments', async () => {
      const { service, deps } = createService();
      deps.expenseRepository.getById
        .mockImplementationOnce(() => Promise.resolve({
          id: 'exp_01',
          expenseDate: '2026-04-01',
          status: 'approved',
        }))
        .mockImplementationOnce(() => Promise.resolve({
          id: 'exp_01',
          status: 'paid',
          paymentMethod: 'cash',
        }));

      await service.recordPayment('exp_01', {
        paymentMethod: 'cash',
        paymentDate: '2026-04-05',
        checkNumber: 'IGNORED',
        transactionRef: '',
        notes: '',
      }, 'usr_02');

      expect(deps.expenseRepository.update).toHaveBeenCalledWith('exp_01', {
        paymentMethod: 'cash',
        checkNumber: null,
        transactionRef: null,
        notes: null,
      });
    });
  });

  describe('seedDemoExpenses', () => {
    it('creates every expense that succeeds and skips failures', async () => {
      const { service } = createService();
      const createMock = mock((expense) => {
        if (expense.title === 'Water bill') {
          return Promise.reject(new Error('duplicate'));
        }

        return Promise.resolve({ id: expense.title, ...expense });
      });

      (service as any).create = createMock;

      const result = await service.seedDemoExpenses([
        { ...validCreateData, title: 'Electricity bill' },
        { ...validCreateData, title: 'Water bill' },
        { ...validCreateData, title: 'Internet bill' },
      ]);

      expect(createMock).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(2);
      expect(result.map((expense) => expense.title)).toEqual([
        'Electricity bill',
        'Internet bill',
      ]);
    });
  });
});
