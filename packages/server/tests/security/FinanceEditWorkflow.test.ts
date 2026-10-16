import { describe, expect, it } from 'bun:test';
import { ExpenseValidator } from '../../src/modules/financial/expenses/ExpenseValidator';
import { PayrollValidator } from '../../src/modules/financial/payroll/PayrollValidator';
import { withEnglishMessages } from '../support/englishMessages';

// The production browser run (2026-10-16) set a pending expense to `paid`
// through the generic edit: no approver, no payment date, counted as spent.
// The database-backed version of this case is FinanceLifecycleTransport.

const rule = (current: string, next: string | undefined) =>
  () => ExpenseValidator.prototype.ensureEditableStatusChange.call({ t: (key: string) => key }, current, next);

describe('expense status through the generic edit', () => {
  it.each(['approved', 'paid', 'rejected'])('refuses moving a pending expense to %s', (next) => {
    expect(rule('pending', next)).toThrow();
  });

  it('refuses reopening or cancelling a paid expense', () => {
    expect(rule('paid', 'pending')).toThrow();
    expect(rule('paid', 'cancelled')).toThrow();
  });

  it('allows an unchanged status, no status, and cancelling an open expense', () => {
    expect(rule('pending', undefined)).not.toThrow();
    expect(rule('approved', 'approved')).not.toThrow();
    expect(rule('pending', 'cancelled')).not.toThrow();
    expect(rule('approved', 'cancelled')).not.toThrow();
  });
});

// Same run: a payslip took deductions of 150 against a gross of 100 and
// showed a net of -50; the generic edit could also set `paid` directly.

const payslipEdit = (current: string, next: Parameters<PayrollValidator['ensureEditable']>[1]) =>
  () => PayrollValidator.prototype.ensureEditable.call({ t: (key: string) => key }, { status: current }, next);

it('refuses payroll before hire with a translated error and allows the hire month', () => {
  const validator = withEnglishMessages(new PayrollValidator({} as any));
  expect(() => validator.ensureHiredForPeriod('2026-09', { hireDate: '2026-10-15' }))
    .toThrow('Payroll period cannot be before the staff member’s hire month.');
  expect(() => validator.ensureHiredForPeriod('2026-10', { hireDate: '2026-10-15' })).not.toThrow();
});

describe('payslip generic edit', () => {
  it('refuses deductions above gross', () => {
    expect(payslipEdit('pending', { amountsChanged: true, gross: 100, deductions: 150 })).toThrow();
    expect(payslipEdit('pending', { amountsChanged: true, gross: 100, deductions: 100 })).not.toThrow();
  });

  it('refuses paying through the edit and changing a paid payslip', () => {
    expect(payslipEdit('pending', { status: 'paid', amountsChanged: false })).toThrow();
    expect(payslipEdit('paid', { amountsChanged: true, gross: 100, deductions: 0 })).toThrow();
  });

  it('allows cancelling a pending payslip and editing notes', () => {
    expect(payslipEdit('pending', { status: 'cancelled', amountsChanged: false })).not.toThrow();
    expect(payslipEdit('paid', { amountsChanged: false })).not.toThrow();
  });
});
