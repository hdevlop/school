import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  expectNoHorizontalOverflow,
  mockApi,
  signInAs,
} from './support/acceptance';

/**
 * Expenses are the other half of School's ledger, and the screen formats more
 * of its data than any other list: the amount is fixed to two decimals and
 * carries the school's currency, the date is rendered rather than echoed, and
 * the category and payment method are translated from their stored codes.
 * Those conversions are what these tests hold.
 */
test.describe.configure({ mode: 'serial' });

const EXPENSES = [
  {
    id: 'acceptance-expense-1',
    title: 'Science lab supplies',
    category: 'supplies',
    amount: '1250.5',
    expenseDate: '2026-03-14',
    paymentMethod: 'bank_transfer',
    status: 'approved',
    vendor: 'Atlas Scientific',
  },
  {
    id: 'acceptance-expense-2',
    title: 'Generator maintenance',
    category: 'maintenance',
    amount: '800',
    expenseDate: '2026-04-02',
    paymentMethod: null,
    status: 'pending',
    vendor: null,
  },
];

const withExpenses = (page: Page) => mockApi(page, '/expenses', EXPENSES);

const cell = (page: Page, text: string) =>
  page.locator('[data-slot="table-cell"]', { hasText: text });

test('the expense ledger formats every amount, date and code it is given', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/expenses', setup: withExpenses });

  await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
  await expect(page.getByText('2 expenses total')).toBeVisible();

  await expect(cell(page, 'Science lab supplies').first()).toBeVisible();
  // Stored as "1250.5" and shown to two decimals; stored as a code and shown
  // as a word; stored as an ISO date and shown as a written one.
  await expect(cell(page, '1250.50').first()).toBeVisible();
  await expect(cell(page, 'Supplies').first()).toBeVisible();
  await expect(cell(page, 'Mar 14, 2026').first()).toBeVisible();
  await expect(cell(page, 'Approved').first()).toBeVisible();

  await expect(cell(page, 'Generator maintenance').first()).toBeVisible();
  await expect(cell(page, '800.00').first()).toBeVisible();
  await expect(cell(page, 'Apr 2, 2026').first()).toBeVisible();
  await expect(cell(page, 'Pending').first()).toBeVisible();

  // An expense with no payment method recorded says so rather than sitting empty.
  await expect(page.getByText('Not specified')).toBeVisible();

  await close();
});

test('the ledger is admin-only in the navigation and reachable from the financial group', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { setup: withExpenses });

  await page.getByRole('button', { name: 'Financial' }).click();
  await page.locator('a[href="/expenses"]:visible').first().click();

  await expect(page).toHaveURL(/\/expenses$/);
  await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
  await expect(cell(page, 'Science lab supplies').first()).toBeVisible();

  await close();
});

test('the ledger fits a phone viewport', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/expenses',
    viewport: { width: 390, height: 844 },
    setup: withExpenses,
  });

  await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
  await expect(page.getByText('Science lab supplies').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await close();
});
