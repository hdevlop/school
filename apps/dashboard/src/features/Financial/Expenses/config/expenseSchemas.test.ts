import { describe, expect, it } from 'bun:test';
import { EXPENSE_CATEGORY_VALUES, EXPENSE_STATUS_VALUES } from '@sms/contracts';

import { buildExpenseCategoryOptions, buildExpenseStatusOptions } from './expenseOptions';
import { expenseSchema } from './expenseSchemas';

const echo = (key: string) => key;

const expense = {
  category: 'utilities',
  title: 'Water bill, March',
  amount: 800,
  expenseDate: '2026-03-01',
};

describe('expenseSchema', () => {
  it('defaults a new expense to pending approval', () => {
    expect(expenseSchema.parse(expense).status).toBe('pending');
  });

  it('accepts every category and status the API accepts', () => {
    for (const category of EXPENSE_CATEGORY_VALUES) {
      expect(expenseSchema.safeParse({ ...expense, category }).success).toBe(true);
    }
    for (const status of EXPENSE_STATUS_VALUES) {
      expect(expenseSchema.safeParse({ ...expense, status }).success).toBe(true);
    }
  });

  it('records an expense that has not been paid yet', () => {
    const parsed = expenseSchema.parse({ ...expense, paymentMethod: null, paymentDate: null });

    expect(parsed.paymentMethod).toBeNull();
    expect(parsed.paymentDate).toBeNull();
  });

  it('coerces the amount and refuses a zero one', () => {
    expect(expenseSchema.parse({ ...expense, amount: '1250.75' }).amount).toBe(1250.75);
    expect(expenseSchema.safeParse({ ...expense, amount: 0 }).success).toBe(false);
  });
});

describe('expense option builders', () => {
  it('offers exactly the categories and statuses the API accepts', () => {
    expect(buildExpenseCategoryOptions(echo).map((option) => option.value)).toEqual([
      ...EXPENSE_CATEGORY_VALUES,
    ]);
    expect(buildExpenseStatusOptions(echo).map((option) => option.value)).toEqual([
      ...EXPENSE_STATUS_VALUES,
    ]);
  });

  /**
   * The form used to filter `salary` out of its category list. The column has
   * no such member, so the guard was protecting against a value only the
   * frontend's own copy of the enum ever had.
   */
  it('has no salary category to filter out, because the API has never had one', () => {
    expect(EXPENSE_CATEGORY_VALUES).not.toContain('salary' as never);
    expect(buildExpenseCategoryOptions(echo).map((option) => option.value)).not.toContain(
      'salary' as never,
    );
  });

  it('offers only values the bound schema will accept', () => {
    for (const option of buildExpenseCategoryOptions(echo)) {
      expect(expenseSchema.safeParse({ ...expense, category: option.value }).success).toBe(true);
    }
  });
});
