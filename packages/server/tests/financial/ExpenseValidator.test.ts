import { describe, expect, it, mock } from 'bun:test';

mock.module('@server/najm', () => ({
  Err: (status: number, message: string) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    throw error;
  },
  I18n: () => () => undefined,
  Service: () => () => undefined,
}));

const { ExpenseValidator } = await import('@server/modules/financial/expenses/ExpenseValidator');

function createMockDeps() {
  return {
    expenseRepository: {
      getById: mock(() => Promise.resolve(null)),
      getByInvoiceNumber: mock(() => Promise.resolve(null)),
      getByReceiptNumber: mock(() => Promise.resolve(null)),
      getByCheckNumber: mock(() => Promise.resolve(null)),
    },
  };
}

function createValidator(deps = createMockDeps()) {
  const validator = new ExpenseValidator(
    deps.expenseRepository as any,
  );

  Object.defineProperty(validator, 't', {
    value: (key: string) => key,
    configurable: true,
  });

  return { validator, deps };
}

const mockExpense = {
  id: 'exp_01',
  category: 'utilities',
  title: 'Electricity bill',
  amount: 1500,
  expenseDate: '2026-04-01',
  invoiceNumber: 'INV-001',
  receiptNumber: 'RCT-001',
  checkNumber: 'CHK-001',
  status: 'pending',
};

describe('ExpenseValidator', () => {
  describe('checkIdIsUnique', () => {
    it('passes when the id is not taken', async () => {
      const { validator } = createValidator();

      await validator.checkIdIsUnique('exp_new');
    });

    it('throws when the id already exists', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getById.mockImplementation(() => Promise.resolve(mockExpense));

      try {
        await validator.checkIdIsUnique('exp_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('idExists');
      }
    });
  });

  describe('checkInvoiceNumberIsUnique', () => {
    it('skips the check when the invoice number is empty', async () => {
      const { validator, deps } = createValidator();

      await validator.checkInvoiceNumberIsUnique('');

      expect(deps.expenseRepository.getByInvoiceNumber).not.toHaveBeenCalled();
    });

    it('passes when the invoice number belongs to the excluded expense', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getByInvoiceNumber.mockImplementation(() => Promise.resolve(mockExpense));

      await validator.checkInvoiceNumberIsUnique('INV-001', 'exp_01');
    });

    it('throws when the invoice number belongs to a different expense', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getByInvoiceNumber.mockImplementation(() => Promise.resolve(mockExpense));

      try {
        await validator.checkInvoiceNumberIsUnique('INV-001', 'exp_other');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('invoiceNumberExists');
      }
    });
  });

  describe('checkReceiptNumberIsUnique', () => {
    it('skips the check when the receipt number is empty', async () => {
      const { validator, deps } = createValidator();

      await validator.checkReceiptNumberIsUnique('');

      expect(deps.expenseRepository.getByReceiptNumber).not.toHaveBeenCalled();
    });

    it('passes when the receipt number belongs to the excluded expense', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getByReceiptNumber.mockImplementation(() => Promise.resolve(mockExpense));

      await validator.checkReceiptNumberIsUnique('RCT-001', 'exp_01');
    });

    it('throws when the receipt number belongs to a different expense', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getByReceiptNumber.mockImplementation(() => Promise.resolve(mockExpense));

      try {
        await validator.checkReceiptNumberIsUnique('RCT-001', 'exp_other');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('receiptNumberExists');
      }
    });
  });

  describe('checkCheckNumberIsUnique', () => {
    it('skips the check when the check number is empty', async () => {
      const { validator, deps } = createValidator();

      await validator.checkCheckNumberIsUnique('');

      expect(deps.expenseRepository.getByCheckNumber).not.toHaveBeenCalled();
    });

    it('passes when the check number belongs to the excluded expense', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getByCheckNumber.mockImplementation(() => Promise.resolve(mockExpense));

      await validator.checkCheckNumberIsUnique('CHK-001', 'exp_01');
    });

    it('throws when the check number belongs to a different expense', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getByCheckNumber.mockImplementation(() => Promise.resolve(mockExpense));

      try {
        await validator.checkCheckNumberIsUnique('CHK-001', 'exp_other');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('checkNumberExists');
      }
    });
  });

  describe('isExists', () => {
    it('returns true when the expense exists', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getById.mockImplementation(() => Promise.resolve(mockExpense));

      expect(await validator.isExists('exp_01')).toBe(true);
    });

    it('returns false when the expense does not exist', async () => {
      const { validator } = createValidator();

      expect(await validator.isExists('missing')).toBe(false);
    });
  });

  describe('isInvoiceNumberExists', () => {
    it('returns false when the invoice number is empty', async () => {
      const { validator, deps } = createValidator();

      expect(await validator.isInvoiceNumberExists('')).toBe(false);
      expect(deps.expenseRepository.getByInvoiceNumber).not.toHaveBeenCalled();
    });
  });

  describe('isReceiptNumberExists', () => {
    it('returns false when the receipt number is empty', async () => {
      const { validator, deps } = createValidator();

      expect(await validator.isReceiptNumberExists('')).toBe(false);
      expect(deps.expenseRepository.getByReceiptNumber).not.toHaveBeenCalled();
    });
  });

  describe('isCheckNumberExists', () => {
    it('returns false when the check number is empty', async () => {
      const { validator, deps } = createValidator();

      expect(await validator.isCheckNumberExists('')).toBe(false);
      expect(deps.expenseRepository.getByCheckNumber).not.toHaveBeenCalled();
    });
  });

  describe('checkExists', () => {
    it('returns true when the expense exists', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getById.mockImplementation(() => Promise.resolve(mockExpense));

      const result = await validator.checkExists('exp_01');

      expect(result).toBe(true);
    });

    it('throws when the expense does not exist', async () => {
      const { validator } = createValidator();

      try {
        await validator.checkExists('missing');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toBe('notFound');
      }
    });
  });

  describe('checkInvoiceNumberExists', () => {
    it('returns the expense when found', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getByInvoiceNumber.mockImplementation(() => Promise.resolve(mockExpense));

      const result = await validator.checkInvoiceNumberExists('INV-001');

      expect(result).toEqual(mockExpense);
    });

    it('throws when not found', async () => {
      const { validator } = createValidator();

      try {
        await validator.checkInvoiceNumberExists('missing');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toBe('notFound');
      }
    });
  });

  describe('checkReceiptNumberExists', () => {
    it('returns the expense when found', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getByReceiptNumber.mockImplementation(() => Promise.resolve(mockExpense));

      const result = await validator.checkReceiptNumberExists('RCT-001');

      expect(result).toEqual(mockExpense);
    });

    it('throws when not found', async () => {
      const { validator } = createValidator();

      try {
        await validator.checkReceiptNumberExists('missing');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toBe('notFound');
      }
    });
  });

  describe('checkCheckNumberExists', () => {
    it('returns the expense when found', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getByCheckNumber.mockImplementation(() => Promise.resolve(mockExpense));

      const result = await validator.checkCheckNumberExists('CHK-001');

      expect(result).toEqual(mockExpense);
    });

    it('throws when not found', async () => {
      const { validator } = createValidator();

      try {
        await validator.checkCheckNumberExists('missing');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toBe('notFound');
      }
    });
  });

  describe('validatePaymentDateNotBeforeExpense', () => {
    it('passes when paymentDate is on or after expenseDate', async () => {
      const { validator } = createValidator();

      expect(await validator.validatePaymentDateNotBeforeExpense('2026-04-01', '2026-04-01')).toBe(true);
      expect(await validator.validatePaymentDateNotBeforeExpense('2026-04-02', '2026-04-01')).toBe(true);
    });

    it('throws when paymentDate is before expenseDate', async () => {
      const { validator } = createValidator();

      try {
        await validator.validatePaymentDateNotBeforeExpense('2026-03-31', '2026-04-01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('paymentDateBeforeExpense');
      }
    });
  });

  describe('checkCanApprove', () => {
    it('passes when the expense is pending', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getById.mockImplementation(() => Promise.resolve({
        ...mockExpense,
        status: 'pending',
      }));

      expect(await validator.checkCanApprove('exp_01')).toBe(true);
    });

    it('throws when the expense is missing', async () => {
      const { validator } = createValidator();

      try {
        await validator.checkCanApprove('missing');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toBe('notFound');
      }
    });

    it('throws when the expense is not pending', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getById.mockImplementation(() => Promise.resolve({
        ...mockExpense,
        status: 'approved',
      }));

      try {
        await validator.checkCanApprove('exp_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('cannotApprove');
      }
    });
  });

  describe('checkCanPay', () => {
    it('passes when the expense is approved', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getById.mockImplementation(() => Promise.resolve({
        ...mockExpense,
        status: 'approved',
      }));

      expect(await validator.checkCanPay('exp_01')).toBe(true);
    });

    it('throws when the expense is not approved', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getById.mockImplementation(() => Promise.resolve({
        ...mockExpense,
        status: 'pending',
      }));

      try {
        await validator.checkCanPay('exp_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('cannotPay');
      }
    });
  });

  describe('validate', () => {
    it('runs create-time uniqueness checks and date validation', async () => {
      const { validator, deps } = createValidator();
      const data = {
        id: 'exp_01',
        expenseDate: '2026-04-01',
        paymentDate: '2026-04-02',
        invoiceNumber: 'INV-001',
        receiptNumber: 'RCT-001',
        checkNumber: 'CHK-001',
      };

      const result = await validator.validate(data);

      expect(deps.expenseRepository.getById).toHaveBeenCalledWith('exp_01');
      expect(deps.expenseRepository.getByInvoiceNumber).toHaveBeenCalledWith('INV-001');
      expect(deps.expenseRepository.getByReceiptNumber).toHaveBeenCalledWith('RCT-001');
      expect(deps.expenseRepository.getByCheckNumber).toHaveBeenCalledWith('CHK-001');
      expect(result).toEqual(data);
    });

    it('runs update-time existence and exclusion-aware uniqueness checks', async () => {
      const { validator, deps } = createValidator();
      deps.expenseRepository.getById.mockImplementation(() => Promise.resolve(mockExpense));
      deps.expenseRepository.getByInvoiceNumber.mockImplementation(() => Promise.resolve(mockExpense));
      deps.expenseRepository.getByReceiptNumber.mockImplementation(() => Promise.resolve(mockExpense));
      deps.expenseRepository.getByCheckNumber.mockImplementation(() => Promise.resolve(mockExpense));

      const data = {
        invoiceNumber: 'INV-001',
        receiptNumber: 'RCT-001',
        checkNumber: 'CHK-001',
      };

      const result = await validator.validate(data, 'exp_01');

      expect(deps.expenseRepository.getById).toHaveBeenCalledWith('exp_01');
      expect(result).toEqual(data);
    });

    it('skips optional uniqueness checks when those values are missing', async () => {
      const { validator, deps } = createValidator();

      await validator.validate({});

      expect(deps.expenseRepository.getByInvoiceNumber).not.toHaveBeenCalled();
      expect(deps.expenseRepository.getByReceiptNumber).not.toHaveBeenCalled();
      expect(deps.expenseRepository.getByCheckNumber).not.toHaveBeenCalled();
    });
  });

  describe('checkRejectionReasonRequired', () => {
    it('passes for approve actions without a rejection reason', async () => {
      const { validator } = createValidator();

      expect(await validator.checkRejectionReasonRequired('approve')).toBe(true);
    });

    it('throws for reject actions without a rejection reason', async () => {
      const { validator } = createValidator();

      try {
        await validator.checkRejectionReasonRequired('reject');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('rejectionReasonRequired');
      }
    });
  });

  describe('validateApproval', () => {
    it('returns the data when approval rules pass', async () => {
      const { validator } = createValidator();
      const data = {
        action: 'reject',
        rejectionReason: 'Missing invoice details',
      };

      const result = await validator.validateApproval(data);

      expect(result).toEqual(data);
    });
  });

  describe('validateRejection', () => {
    it('passes when a non-empty rejection reason is provided', async () => {
      const { validator } = createValidator();

      expect(await validator.validateRejection('Missing invoice details')).toBe(true);
    });

    it('throws when the rejection reason is blank', async () => {
      const { validator } = createValidator();

      try {
        await validator.validateRejection('   ');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('rejectionReasonRequired');
      }
    });
  });

  describe('validatePayment', () => {
    it('currently returns the payload unchanged', async () => {
      const { validator } = createValidator();
      const data = {
        paymentMethod: 'cash',
        paymentDate: '2026-04-05',
      };

      const result = await validator.validatePayment(data);

      expect(result).toEqual(data);
    });
  });

  describe('validatePaymentDate', () => {
    it('delegates to the payment-date validation rule', async () => {
      const { validator } = createValidator();

      expect(await validator.validatePaymentDate('2026-04-05', '2026-04-01')).toBe(true);
    });
  });

  describe('validateCheckPayment', () => {
    it('passes for check payments with a check number', async () => {
      const { validator } = createValidator();

      expect(await validator.validateCheckPayment('check', 'CHK-001')).toBe(true);
    });

    it('passes for non-check payments without a check number', async () => {
      const { validator } = createValidator();

      expect(await validator.validateCheckPayment('cash')).toBe(true);
    });

    it('throws for check payments without a check number', async () => {
      const { validator } = createValidator();

      try {
        await validator.validateCheckPayment('check');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('checkNumberRequired');
      }
    });
  });
});
