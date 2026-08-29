import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  expectNoHorizontalOverflow,
  mockApi,
  signInAs,
} from './support/acceptance';

/**
 * Classes, sections and subjects are the academic structure everything else
 * hangs off. Unlike the people screens they open as a table rather than cards,
 * so this is also where the table renderer — its header row, its cells, and its
 * behaviour when a value is missing — is held to account.
 */
test.describe.configure({ mode: 'serial' });

const CLASSES = [
  {
    id: 'acceptance-class-1',
    name: 'Grade 5A',
    academicYear: '2026-2027',
    level: 5,
    description: 'Primary fifth year',
  },
  {
    id: 'acceptance-class-2',
    name: 'Grade 6B',
    academicYear: '2026-2027',
    level: 6,
    description: null,
  },
];

const SUBJECTS = [
  {
    id: 'acceptance-subject-1',
    code: 'MATH-5',
    name: 'Mathematics',
    description: 'Arithmetic and geometry',
  },
  {
    id: 'acceptance-subject-2',
    code: 'PHYS-5',
    name: 'Physics',
    description: 'Introduction to mechanics',
  },
];

const cell = (page: Page, text: string) =>
  page.locator('[data-slot="table-cell"]', { hasText: text });

const columnHeader = (page: Page, text: string) =>
  page.locator('[data-slot="table-head"]', { hasText: text });

test('the class list opens as a table and states the year and level of each class', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/classes',
    setup: (p) => mockApi(p, '/classes', CLASSES),
  });

  await expect(page.getByRole('heading', { name: 'Classes' })).toBeVisible();
  await expect(page.getByText('2 classes total')).toBeVisible();

  for (const header of ['Class Name', 'Academic Year', 'Level', 'Description']) {
    await expect(columnHeader(page, header).first()).toBeVisible();
  }

  await expect(cell(page, 'Grade 5A').first()).toBeVisible();
  await expect(cell(page, '2026-2027').first()).toBeVisible();
  await expect(cell(page, 'Primary fifth year').first()).toBeVisible();
  await expect(cell(page, 'Grade 6B').first()).toBeVisible();

  // A class without a description says so rather than rendering an empty cell.
  await expect(page.getByText('No description')).toBeVisible();

  await close();
});

test('the subject list pairs every subject with its code', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/subjects',
    setup: (p) => mockApi(p, '/subjects', SUBJECTS),
  });

  await expect(page.getByRole('heading', { name: 'Subjects' })).toBeVisible();
  await expect(page.getByText('2 subjects total')).toBeVisible();

  for (const header of ['Code', 'Name', 'Description']) {
    await expect(columnHeader(page, header).first()).toBeVisible();
  }

  await expect(cell(page, 'MATH-5').first()).toBeVisible();
  await expect(cell(page, 'Mathematics').first()).toBeVisible();
  await expect(cell(page, 'PHYS-5').first()).toBeVisible();
  await expect(cell(page, 'Physics').first()).toBeVisible();

  await expect(page.getByRole('button', { name: 'Create Subject' })).toBeVisible();

  await close();
});

test('a class table switched to a phone viewport keeps its records on screen', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/classes',
    viewport: { width: 390, height: 844 },
    setup: (p) => mockApi(p, '/classes', CLASSES),
  });

  await expect(page.getByRole('heading', { name: 'Classes' })).toBeVisible();
  await expect(page.getByText('Grade 5A').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await close();
});
