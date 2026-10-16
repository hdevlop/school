import { describe, expect, it } from 'bun:test';
import { createPaymentDto } from '../../src/modules/financial/payments/PaymentDto';
import { applyCreditDto } from '../../src/modules/financial/credits/CreditDto';
import { createExpenseDto } from '../../src/modules/financial/expenses/ExpenseDto';
import { updatePayslipDto } from '../../src/modules/financial/payroll/PayrollDto';
import { money } from '../../src/shared/fields';

// Money columns hold two decimals. A payment of 0.001 MAD passed validation
// and reached the database, which answered 500 (production browser run
// 2026-10-16, finance regression target 5). Validation now refuses it as 400.

const payment = {
  studentId: 'stu1',
  amount: 120,
  paymentMethod: 'cash',
  paymentDate: '2026-10-16',
  allocations: [{ feeId: 'fee1', number: 1, amount: 120 }],
};

describe('money precision', () => {
  it('accepts whole centimes, including float sums and numeric strings', () => {
    const schema = money().positive();
    for (const value of [0.07, 19.99, 0.1 + 0.2, '12.50', 120]) expect(schema.safeParse(value).success).toBe(true);
  });

  it('refuses sub-centime payment and allocation amounts', () => {
    expect(createPaymentDto.safeParse(payment).success).toBe(true);
    for (const amount of [0.001, 0.000000001, Number.MIN_VALUE]) {
      expect(createPaymentDto.safeParse({ ...payment, amount }).success).toBe(false);
      expect(createPaymentDto.safeParse({ ...payment, allocations: [{ feeId: 'fee1', number: 1, amount }] }).success).toBe(false);
    }
  });

  it('refuses sub-centime credits, expenses and payroll deductions', () => {
    const expense = { title: 'Fournitures', category: 'supplies', amount: 10, expenseDate: '2026-10-16' };
    expect(applyCreditDto.safeParse({ studentId: 'stu1', amount: 5 }).success).toBe(true);
    expect(createExpenseDto.safeParse(expense).success).toBe(true);
    expect(updatePayslipDto.safeParse({ totalDeductions: 1 }).success).toBe(true);
    expect(applyCreditDto.safeParse({ studentId: 'stu1', amount: 0.001 }).success).toBe(false);
    expect(createExpenseDto.safeParse({ ...expense, amount: 10.005 }).success).toBe(false);
    expect(updatePayslipDto.safeParse({ totalDeductions: 1.001 }).success).toBe(false);
  });
});
