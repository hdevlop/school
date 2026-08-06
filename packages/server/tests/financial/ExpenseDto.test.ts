import { describe, expect, it } from 'bun:test';
import {
  createExpenseDto,
  expenseApprovalDto,
  expenseDateRangeParam,
  expenseIdParam,
  expensePaymentDto,
  updateExpenseDto,
} from '@server/modules/financial/expenses/ExpenseDto';

const validExpense = {
  category: 'utilities',
  title: 'Electricity bill for April',
  amount: 1500,
  expenseDate: '2026-04-01',
};

describe('createExpenseDto', () => {
  it('parses a valid minimal expense', () => {
    const result = createExpenseDto.safeParse(validExpense);
    expect(result.success).toBe(true);
  });

  it('parses an expense with all optional fields', () => {
    const data = {
      ...validExpense,
      paymentMethod: 'bankTransfer',
      paymentDate: '2026-04-03',
      vendor: 'Lydec',
      invoiceNumber: 'INV-2026-001',
      receiptNumber: 'RCT-2026-001',
      checkNumber: 'CHK-2026-001',
      transactionRef: 'TXN-2026-001',
      notes: 'Quarterly utilities payment',
    };

    const result = createExpenseDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('strips a client-supplied status on create (workflow field is server-controlled)', () => {
    const result = createExpenseDto.safeParse({
      ...validExpense,
      status: 'paid',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeUndefined();
    }
  });

  it('omits status from the parsed payload when not provided', () => {
    const result = createExpenseDto.safeParse(validExpense);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.status).toBeUndefined();
    }
  });

  it('coerces numeric string amounts into numbers', () => {
    const result = createExpenseDto.safeParse({
      ...validExpense,
      amount: '1500.75',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(1500.75);
      expect(typeof result.data.amount).toBe('number');
    }
  });

  it('rejects an invalid category', () => {
    const result = createExpenseDto.safeParse({
      ...validExpense,
      category: 'unknown',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a title shorter than 3 characters', () => {
    const result = createExpenseDto.safeParse({
      ...validExpense,
      title: 'AB',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a title longer than 200 characters', () => {
    const result = createExpenseDto.safeParse({
      ...validExpense,
      title: 'A'.repeat(201),
    });

    expect(result.success).toBe(false);
  });

  it('rejects zero amount', () => {
    const result = createExpenseDto.safeParse({
      ...validExpense,
      amount: 0,
    });

    expect(result.success).toBe(false);
  });

  it('rejects amounts larger than the allowed maximum', () => {
    const result = createExpenseDto.safeParse({
      ...validExpense,
      amount: 10000001,
    });

    expect(result.success).toBe(false);
  });

  it('accepts supported expenseDate formats', () => {
    const dates = ['2026-04-01', '04/01/2026', '01-04-26', '01-04-2026'];

    for (const expenseDate of dates) {
      const result = createExpenseDto.safeParse({
        ...validExpense,
        expenseDate,
      });

      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid expenseDate format', () => {
    const result = createExpenseDto.safeParse({
      ...validExpense,
      expenseDate: '2026/04/01',
    });

    expect(result.success).toBe(false);
  });

  it('accepts null payment fields', () => {
    const result = createExpenseDto.safeParse({
      ...validExpense,
      paymentMethod: null,
      paymentDate: null,
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid payment method', () => {
    const result = createExpenseDto.safeParse({
      ...validExpense,
      paymentMethod: 'wire',
    });

    expect(result.success).toBe(false);
  });

  it('rejects paymentDate values that are not YYYY-MM-DD', () => {
    const result = createExpenseDto.safeParse({
      ...validExpense,
      paymentDate: '04/03/2026',
    });

    expect(result.success).toBe(false);
  });

  it('strips all valid expense statuses from create payloads', () => {
    const statuses = ['pending', 'approved', 'paid', 'rejected', 'cancelled'];

    for (const status of statuses) {
      const result = createExpenseDto.safeParse({
        ...validExpense,
        status,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBeUndefined();
      }
    }
  });

  it('rejects notes longer than 1000 characters', () => {
    const result = createExpenseDto.safeParse({
      ...validExpense,
      notes: 'A'.repeat(1001),
    });

    expect(result.success).toBe(false);
  });

  it('rejects invoice numbers longer than 100 characters', () => {
    const result = createExpenseDto.safeParse({
      ...validExpense,
      invoiceNumber: 'I'.repeat(101),
    });

    expect(result.success).toBe(false);
  });
});

describe('updateExpenseDto', () => {
  it('parses an empty object because all fields are optional', () => {
    const result = updateExpenseDto.safeParse({});
    expect(result.success).toBe(true);
  });

  it('parses partial data with only a title', () => {
    const result = updateExpenseDto.safeParse({
      title: 'Updated utilities payment',
    });

    expect(result.success).toBe(true);
  });

  it('parses partial data with only a status', () => {
    const result = updateExpenseDto.safeParse({
      status: 'paid',
    });

    expect(result.success).toBe(true);
  });

  it('accepts all valid expense statuses for workflow updates', () => {
    const statuses = ['pending', 'approved', 'paid', 'rejected', 'cancelled'];

    for (const status of statuses) {
      const result = updateExpenseDto.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('still validates amount constraints on partial update', () => {
    const result = updateExpenseDto.safeParse({
      amount: 0,
    });

    expect(result.success).toBe(false);
  });

  it('still validates paymentDate format on partial update', () => {
    const result = updateExpenseDto.safeParse({
      paymentDate: '04/03/2026',
    });

    expect(result.success).toBe(false);
  });
});

describe('expenseApprovalDto', () => {
  it('parses an approve action', () => {
    const result = expenseApprovalDto.safeParse({
      action: 'approve',
    });

    expect(result.success).toBe(true);
  });

  it('parses a reject action with a valid rejection reason', () => {
    const result = expenseApprovalDto.safeParse({
      action: 'reject',
      rejectionReason: 'Missing supporting invoice documents.',
    });

    expect(result.success).toBe(true);
  });

  it('leaves reject-without-reason enforcement to the validator layer', () => {
    const result = expenseApprovalDto.safeParse({
      action: 'reject',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid approval action', () => {
    const result = expenseApprovalDto.safeParse({
      action: 'hold',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a rejection reason shorter than 10 characters when provided', () => {
    const result = expenseApprovalDto.safeParse({
      action: 'reject',
      rejectionReason: 'Too short',
    });

    expect(result.success).toBe(false);
  });
});

describe('expensePaymentDto', () => {
  it('parses a valid payment payload', () => {
    const result = expensePaymentDto.safeParse({
      paymentMethod: 'check',
      paymentDate: '2026-04-05',
      checkNumber: 'CHK-9001',
      transactionRef: 'TXN-9001',
      notes: 'Paid after approval',
    });

    expect(result.success).toBe(true);
  });

  it('accepts null optional fields', () => {
    const result = expensePaymentDto.safeParse({
      paymentMethod: 'cash',
      paymentDate: '2026-04-05',
      checkNumber: null,
      transactionRef: null,
      notes: null,
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing paymentMethod', () => {
    const result = expensePaymentDto.safeParse({
      paymentDate: '2026-04-05',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid paymentDate format', () => {
    const result = expensePaymentDto.safeParse({
      paymentMethod: 'cash',
      paymentDate: '2026/04/05',
    });

    expect(result.success).toBe(false);
  });

  it('rejects check numbers longer than 50 characters', () => {
    const result = expensePaymentDto.safeParse({
      paymentMethod: 'check',
      paymentDate: '2026-04-05',
      checkNumber: 'C'.repeat(51),
    });

    expect(result.success).toBe(false);
  });
});

describe('expenseIdParam', () => {
  it('accepts a non-empty id string', () => {
    const result = expenseIdParam.safeParse({ id: 'exp_01' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty id string', () => {
    const result = expenseIdParam.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing id', () => {
    const result = expenseIdParam.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('expenseDateRangeParam', () => {
  it('accepts non-empty startDate and endDate', () => {
    const result = expenseDateRangeParam.safeParse({
      startDate: '2026-04-01',
      endDate: '2026-04-30',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an empty startDate', () => {
    const result = expenseDateRangeParam.safeParse({
      startDate: '',
      endDate: '2026-04-30',
    });

    expect(result.success).toBe(false);
  });

  it('rejects missing endDate', () => {
    const result = expenseDateRangeParam.safeParse({
      startDate: '2026-04-01',
    });

    expect(result.success).toBe(false);
  });
});
