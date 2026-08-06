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

const { PaymentValidator } = await import('@server/modules/financial/payments/PaymentValidator');

function buildFee(overrides: Partial<any> = {}) {
  return {
    id: 'fee_01',
    studentId: 'std_01',
    netAmount: '500.00',
    paidAmount: '100.00',
    installments: [
      {
        id: 'inst_01',
        number: 1,
        amount: '200.00',
        paidAmount: '50.00',
        status: 'partiallyPaid',
      },
      {
        id: 'inst_02',
        number: 2,
        amount: '300.00',
        paidAmount: '50.00',
        status: 'pending',
      },
    ],
    ...overrides,
  };
}

function createMockDeps() {
  return {
    paymentRepository: {
      getById: mock(() => Promise.resolve(null)),
      getByReceiptNumber: mock(() => Promise.resolve(null)),
    },
    studentValidator: {
      checkExists: mock(() => Promise.resolve(true)),
    },
    installmentValidator: {
      isExists: mock(() => Promise.resolve(true)),
      checkExists: mock(() => Promise.resolve(true)),
    },
    feeRepository: {
      getById: mock(() => Promise.resolve(buildFee())),
    },
  };
}

function createValidator(deps = createMockDeps()) {
  const validator = new PaymentValidator(
    deps.paymentRepository as any,
    deps.studentValidator as any,
    deps.installmentValidator as any,
    deps.feeRepository as any,
  );

  Object.defineProperty(validator, 'ft', {
    value: (key: string) => key,
    configurable: true,
  });

  Object.defineProperty(validator, 'pt', {
    value: (key: string) => key,
    configurable: true,
  });

  return { validator, deps };
}

const validPayload = {
  studentId: 'std_01',
  amount: 300,
  paymentMethod: 'cash',
  paymentDate: '2026-04-13',
  allocations: [
    { feeId: 'fee_01', number: 1, amount: 150 },
    { feeId: 'fee_01', number: 2, amount: 150 },
  ],
};

describe('PaymentValidator', () => {
  it('accepts a valid payment allocation payload', async () => {
    const { validator, deps } = createValidator();

    const result = await validator.validate(validPayload);

    expect(deps.studentValidator.checkExists).toHaveBeenCalledWith('std_01');
    expect(result).toEqual(validPayload);
  });

  it('rejects when allocation totals do not match the payment amount', async () => {
    const { validator } = createValidator();

    try {
      await validator.validate({
        ...validPayload,
        amount: 301,
      });
      expect.unreachable('Should have thrown');
    } catch (error: any) {
      expect(error.status).toBe(400);
      expect(error.message).toBe('allocationTotalMismatch');
    }
  });

  it('rejects allocations that belong to another student', async () => {
    const { validator, deps } = createValidator();
    deps.feeRepository.getById.mockImplementation(() => Promise.resolve(
      buildFee({ studentId: 'std_other' }),
    ));

    try {
      await validator.validate(validPayload);
      expect.unreachable('Should have thrown');
    } catch (error: any) {
      expect(error.status).toBe(400);
      expect(error.message).toBe('Payment allocations must belong to the same student as the payment');
    }
  });

  it('rejects allocations for a missing installment number', async () => {
    const { validator } = createValidator();

    try {
      await validator.validate({
        ...validPayload,
        allocations: [{ feeId: 'fee_01', number: 9, amount: 50 }],
        amount: 50,
      });
      expect.unreachable('Should have thrown');
    } catch (error: any) {
      expect(error.status).toBe(400);
      expect(error.message).toBe('Installment #9 does not exist for fee fee_01');
    }
  });

  it('rejects allocations that exceed the remaining installment balance', async () => {
    const { validator } = createValidator();

    try {
      await validator.validate({
        ...validPayload,
        allocations: [{ feeId: 'fee_01', number: 1, amount: 151 }],
        amount: 151,
      });
      expect.unreachable('Should have thrown');
    } catch (error: any) {
      expect(error.status).toBe(400);
      expect(error.message).toContain('exceeds remaining balance');
    }
  });

  it('rejects allocations that exceed the remaining fee balance', async () => {
    const { validator, deps } = createValidator();
    deps.feeRepository.getById.mockImplementation(() => Promise.resolve(
      buildFee({
        netAmount: '500.00',
        paidAmount: '450.00',
        installments: [
          {
            id: 'inst_01',
            number: 1,
            amount: '300.00',
            paidAmount: '200.00',
            status: 'partiallyPaid',
          },
        ],
      }),
    ));

    try {
      await validator.validate({
        ...validPayload,
        allocations: [{ feeId: 'fee_01', number: 1, amount: 60 }],
        amount: 60,
      });
      expect.unreachable('Should have thrown');
    } catch (error: any) {
      expect(error.status).toBe(400);
      expect(error.message).toBe('Allocations for fee fee_01 exceed the remaining fee balance');
    }
  });
});
