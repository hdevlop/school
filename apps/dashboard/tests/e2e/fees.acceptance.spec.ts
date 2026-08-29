import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  expectNoHorizontalOverflow,
  mockApi,
  signInAs,
} from './support/acceptance';

/**
 * Fee collection is the screen where School states, per student, how much is
 * owed and how much of it has arrived. The numbers are what matter, so the whole
 * dependency chain the screen reads is mocked: the fee rows themselves, plus the
 * classes and sections that drive the selector the list is filtered by.
 *
 * `FeesTable` defaults its class selector to the first class it is given and its
 * section selector to that class's "A" section, so mocked fee rows only survive
 * the filter when they belong to the mocked class and section.
 */
test.describe.configure({ mode: 'serial' });

const CLASS = { id: 'acceptance-class-1', name: 'Grade 5A' };
const SECTION = { id: 'acceptance-section-1', name: 'A', classId: CLASS.id };

const FEES = [
  {
    id: 'acceptance-fee-1',
    student: { id: 'acceptance-student-1', name: 'Amina Benali', studentCode: 'ACC-0001', image: null },
    class: CLASS,
    section: { id: SECTION.id, name: SECTION.name },
    netAmount: 6000,
    totalPaid: 1500,
    totalDue: 4500,
    overdueCount: 2,
  },
  {
    id: 'acceptance-fee-2',
    student: { id: 'acceptance-student-2', name: 'Bilal Haddad', studentCode: 'ACC-0002', image: null },
    class: CLASS,
    section: { id: SECTION.id, name: SECTION.name },
    netAmount: 4000,
    totalPaid: 4000,
    totalDue: 0,
    overdueCount: 0,
  },
];

async function withFees(page: Page) {
  await mockApi(page, '/fees', FEES);
  await mockApi(page, '/classes', [CLASS]);
  await mockApi(page, '/sections', [SECTION]);
}

test('the fee list states what each student owes and how much of it has been paid', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/fees', setup: withFees });

  await expect(page.getByRole('heading', { name: 'Fees' })).toBeVisible();
  await expect(page.getByText('2 students total')).toBeVisible();

  // An outstanding balance: the amount shown is what is still due, the badge
  // counts the overdue instalments, and the bar reports the collected share.
  await expect(page.getByText('Amina Benali')).toBeVisible();
  await expect(page.getByText('ACC-0001')).toBeVisible();
  await expect(page.getByText('Grade 5A - A').first()).toBeVisible();
  await expect(page.getByText('2 Overdue')).toBeVisible();
  await expect(page.getByText('4500.00')).toBeVisible();
  await expect(page.getByText('Paid Amount: 1500')).toBeVisible();
  await expect(page.getByText('25%')).toBeVisible();

  // A settled balance swaps the outstanding figure for the full amount and
  // states the record as paid rather than counting nothing overdue.
  await expect(page.getByText('Bilal Haddad')).toBeVisible();
  await expect(page.getByText('Paid', { exact: true })).toBeVisible();
  await expect(page.getByText('4000.00')).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible();

  await close();
});

test('a fee record can be opened from its row and offers edit and delete', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/fees', setup: withFees });
  await expect(page.getByText('Amina Benali')).toBeVisible();

  await page.getByRole('button', { name: 'Row actions' }).first().click();
  for (const action of ['View', 'Edit', 'Delete']) {
    await expect(page.getByRole('menuitem', { name: action })).toBeVisible();
  }
  await page.keyboard.press('Escape');

  await close();
});

test('the fee list stays readable on a phone', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/fees',
    viewport: { width: 390, height: 844 },
    setup: withFees,
  });

  await expect(page.getByRole('heading', { name: 'Fees' })).toBeVisible();
  await expect(page.getByText('Amina Benali')).toBeVisible();
  await expect(page.getByText('4500.00')).toBeVisible();
  await expect(page.getByText('2 Overdue')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await close();
});
