import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  expectNoHorizontalOverflow,
  mockApi,
  signInAs,
} from './support/acceptance';

/**
 * The student directory is the reference implementation of School's list
 * screen: one `NTable` fed by `useEntityCRUD`, a card renderer for narrow
 * viewports, and the filter set from `useStudentsTableFilters`. The records are
 * mocked so the assertions describe the rows this test wrote rather than
 * whatever the shared demo database holds on the day the suite runs.
 */
test.describe.configure({ mode: 'serial' });

const STUDENTS = [
  {
    id: 'acceptance-student-1',
    studentCode: 'ACC-0001',
    name: 'Amina Benali',
    email: 'amina.benali@school.test',
    phone: '+212600000001',
    gender: 'F',
    status: 'active',
    class: { id: 'acceptance-class-1', name: 'Grade 5A' },
    section: { id: 'acceptance-section-1', name: 'Alpha' },
    image: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acceptance-student-2',
    studentCode: 'ACC-0002',
    name: 'Bilal Haddad',
    email: 'bilal.haddad@school.test',
    phone: '+212600000002',
    gender: 'M',
    status: 'inactive',
    class: { id: 'acceptance-class-2', name: 'Grade 6B' },
    section: { id: 'acceptance-section-2', name: 'Beta' },
    image: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const withStudents = (page: Page) => mockApi(page, '/students', STUDENTS);

// The filter row is rendered twice — once for the toolbar and once for the
// mobile popover — and only one of the two is on screen at a given width.
const searchBox = (page: Page) =>
  page.getByPlaceholder('Search by name...').filter({ visible: true }).first();

test('the directory lists every student with the identity a card is meant to carry', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/students', setup: withStudents });

  await expect(page.getByRole('heading', { name: 'Students' })).toBeVisible();
  await expect(page.getByText('2 students total')).toBeVisible();

  await expect(page.getByText('Amina Benali')).toBeVisible();
  await expect(page.getByText('Grade 5A')).toBeVisible();
  // Short on purpose: `NSectionInfo` elides a card value past a dozen
  // characters, and this assertion is about the section being shown at all.
  await expect(page.getByText('Alpha')).toBeVisible();
  // Exact, because an unanchored "Male" also matches "Female".
  await expect(page.getByText('Female', { exact: true })).toBeVisible();

  await expect(page.getByText('Bilal Haddad')).toBeVisible();
  await expect(page.getByText('Grade 6B')).toBeVisible();
  await expect(page.getByText('Male', { exact: true })).toBeVisible();

  await close();
});

test('search narrows the directory by name and by student code', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/students', setup: withStudents });
  await expect(page.getByText('Amina Benali')).toBeVisible();

  await searchBox(page).fill('Bilal');
  await expect(page.getByText('Bilal Haddad')).toBeVisible();
  await expect(page.getByText('Amina Benali')).toHaveCount(0);

  // The name column's filter also matches the code, which is what makes the
  // single search box usable for both.
  await searchBox(page).fill('ACC-0001');
  await expect(page.getByText('Amina Benali')).toBeVisible();
  await expect(page.getByText('Bilal Haddad')).toHaveCount(0);

  // A search that matches nothing empties the list rather than showing the
  // "no data" state, which `NTable` reserves for an empty dataset.
  await searchBox(page).fill('no-such-student');
  await expect(page.getByText('Amina Benali')).toHaveCount(0);
  await expect(page.getByText('Bilal Haddad')).toHaveCount(0);
  await expect(page.getByText('0 of 0 row(s) selected')).toBeVisible();

  await searchBox(page).fill('');
  await expect(page.getByText('Amina Benali')).toBeVisible();
  await expect(page.getByText('Bilal Haddad')).toBeVisible();

  await close();
});

test('a row offers view, edit and delete, and deleting asks before it acts', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/students', setup: withStudents });
  await expect(page.getByText('Amina Benali')).toBeVisible();

  await page.getByRole('button', { name: 'Row actions' }).first().click();
  for (const action of ['View', 'Edit', 'Delete']) {
    await expect(page.getByRole('menuitem', { name: action })).toBeVisible();
  }

  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const confirmation = page.getByRole('dialog');
  await expect(confirmation).toBeVisible();
  await expect(confirmation.getByText('Are you sure you want to delete?')).toBeVisible();
  await expect(confirmation.getByText('Amina Benali')).toBeVisible();

  // Cancelling has to leave the record alone.
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.getByText('Amina Benali')).toBeVisible();

  await close();
});

test('creating a student opens the three-step intake wizard', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/students', setup: withStudents });
  await expect(page.getByText('Amina Benali')).toBeVisible();

  await page.getByRole('button', { name: 'Create Student' }).click();

  const wizard = page.getByRole('dialog');
  await expect(wizard.getByRole('heading', { name: 'Create New Student' })).toBeVisible();
  for (const step of ['Student Information', 'Parents Information', 'Fees Information']) {
    await expect(wizard.getByText(step)).toBeVisible();
  }
  for (const field of ['Student Code', 'Full Name', 'Gender', 'Class']) {
    await expect(wizard.getByText(field, { exact: false }).first()).toBeVisible();
  }

  await close();
});

test('the directory keeps its records inside a phone viewport', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/students',
    viewport: { width: 390, height: 844 },
    setup: withStudents,
  });

  await expect(page.getByRole('heading', { name: 'Students' })).toBeVisible();
  await expect(page.getByText('Amina Benali')).toBeVisible();
  await expect(page.getByText('Grade 5A')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await close();
});

test('Arabic flips the shell to right-to-left without pushing the directory off-screen', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/students',
    language: 'ar',
    viewport: { width: 390, height: 844 },
    setup: withStudents,
  });

  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'ar');
  await expect(html).toHaveAttribute('dir', 'rtl');

  // The record itself is language-independent, so it is the honest thing to
  // assert once the chrome has been translated out from under the test.
  await expect(page.getByText('Amina Benali')).toBeVisible();
  await expect(page.getByText('Grade 5A')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await close();
});
