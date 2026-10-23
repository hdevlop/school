import { describe, expect, it } from 'bun:test';
import { EXPENSE_CATEGORY_VALUES, EXPENSE_STATUS_VALUES } from '@sms/contracts';

import { buildEditableExpenseStatusOptions, buildExpenseCategoryOptions, buildExpenseStatusOptions } from '@/features/Financial/Expenses/config/expenseOptions';
import { createExpenseSchemas } from '@/features/Financial/Expenses/config/expenseSchemas';

const echo = (key: string) => key;
const { expense: expenseSchema, payment: expensePaymentSchema } = createExpenseSchemas(echo);

describe('expense rejection', () => {
  const schema = createExpenseSchemas(echo).rejection;

  it('refuses missing, blank, short and overly long reasons before saving', () => {
    for (const rejectionReason of ['', '   ', 'Too short', ' '.repeat(20) + 'short', 'a'.repeat(1001)]) {
      expect(schema.safeParse({ rejectionReason }).success).toBe(false);
    }
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ rejectionReason: 'short' }).error?.issues[0]?.message)
      .toBe('expenses.validation.rejectionReasonMinLength');
  });

  it('trims the reason and accepts the API length boundaries', () => {
    expect(schema.parse({ rejectionReason: '  Duplicate supplier invoice  ' }))
      .toEqual({ rejectionReason: 'Duplicate supplier invoice' });
    expect(schema.safeParse({ rejectionReason: 'a'.repeat(10) }).success).toBe(true);
    expect(schema.safeParse({ rejectionReason: 'a'.repeat(1000) }).success).toBe(true);
  });
});

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

describe('expense edit status select', () => {
  // Approve, reject and pay are their own actions; the server refuses them
  // through the generic edit, so the edit form offers only cancellation.
  const values = (current) => buildEditableExpenseStatusOptions(echo, current).map((option) => option.value);

  it('offers cancellation only while the expense is open', () => {
    expect(values('pending')).toEqual(['pending', 'cancelled']);
    expect(values('approved')).toEqual(['approved', 'cancelled']);
  });

  it('keeps a closed expense on its stored status', () => {
    expect(values('paid')).toEqual(['paid']);
    expect(values('rejected')).toEqual(['rejected']);
    expect(values('cancelled')).toEqual(['cancelled']);
  });
});

// A French page showed Zod's and the schema's English messages.
describe('expense messages', () => {
  const message = (result: { success: boolean; error?: { issues: { message: string }[] } }) => result.error?.issues[0]?.message;

  it('names every refusal by a catalog key', () => {
    expect(message(expenseSchema.safeParse({ ...expense, title: 'ab' }))).toBe('expenses.validation.titleMinLength');
    expect(message(expenseSchema.safeParse({ ...expense, amount: '' }))).toBe('expenses.validation.amountRequired');
    expect(message(expenseSchema.safeParse({ ...expense, amount: 0 }))).toBe('expenses.validation.amountPositive');
    expect(message(expensePaymentSchema.safeParse({ paymentMethod: 'check', paymentDate: '2026-03-02', checkNumber: ' ' })))
      .toBe('expenses.validation.checkNumberRequired');
  });
});
