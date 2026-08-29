import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  captureWrites,
  expectNoHorizontalOverflow,
  mockApi,
  overrideApi,
  signInAs,
} from './support/acceptance';

/**
 * Taking the register is the one screen in School that is a workflow rather
 * than a list: it resolves a roster from the selected class and section, holds
 * the marks as a draft, and only sends them when they are submitted.
 *
 * The school's `attendanceMode` decides whether a teacher and subject must be
 * chosen first. These tests describe `daily` mode and pin that one setting,
 * leaving the rest of the settings document authentic.
 *
 * Below `NTable`'s card breakpoint the nine-column table is replaced by a card
 * per student. It used to compress instead — 44px columns and a student name
 * rendered 20px wide — so the last test here holds the replacement.
 */
test.describe.configure({ mode: 'serial' });

const SECTION = { id: 'acceptance-section-1', name: 'A', classId: 'acceptance-class-1' };
const CLASS = {
  id: 'acceptance-class-1',
  name: 'Grade 5A',
  sections: [{ id: SECTION.id, name: SECTION.name }],
};

const STUDENTS = [
  {
    id: 'acceptance-student-1',
    studentCode: 'ACC-0001',
    name: 'Amina Benali',
    gender: 'F',
    status: 'active',
    sectionId: SECTION.id,
    class: { id: CLASS.id, name: CLASS.name },
    section: { id: SECTION.id, name: SECTION.name },
    image: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acceptance-student-2',
    studentCode: 'ACC-0002',
    name: 'Bilal Haddad',
    gender: 'M',
    status: 'active',
    sectionId: SECTION.id,
    class: { id: CLASS.id, name: CLASS.name },
    section: { id: SECTION.id, name: SECTION.name },
    image: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

async function withRoster(page: Page) {
  await mockApi(page, '/students', STUDENTS);
  await mockApi(page, '/classes', [CLASS]);
  await mockApi(page, '/sections', [SECTION]);
  // No register has been taken for these students yet, so every mark the tests
  // make is a new one.
  await mockApi(page, '/attendance', []);
  await overrideApi(page, '/settings/public', (settings) => ({ ...settings, attendanceMode: 'daily' }));
}

/**
 * The three marks for one student, wherever that student is rendered: `NTable`
 * marks both a table row and a card with `data-row`, so the same helper reaches
 * them on a desktop and on a phone.
 *
 * They are addressed by role rather than by title: the icon inside each button
 * carries an SVG `<title>` of its own, so a title lookup matches twice.
 */
const mark = (page: Page, student: string, status: 'Present' | 'Absent' | 'Late') =>
  page
    .locator('[data-row="true"]', { hasText: student })
    .getByRole('button', { name: status, exact: true });

test('the register lists the selected section and offers a mark for every student', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/attendance/students',
    setup: withRoster,
  });

  await expect(page.getByText('2 students')).toBeVisible();
  await expect(page.getByText('Amina Benali')).toBeVisible();
  await expect(page.getByText('Bilal Haddad')).toBeVisible();

  for (const status of ['Present', 'Absent', 'Late'] as const) {
    await expect(mark(page, 'Amina Benali', status)).toBeVisible();
  }

  // Nothing has been marked, so there is nothing to send yet.
  await expect(page.getByRole('button', { name: 'Submit Attendance' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reset' })).toHaveCount(0);

  await close();
});

test('marking a student is held as a draft that can be reset before it is sent', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/attendance/students',
    setup: withRoster,
  });
  await expect(page.getByText('Amina Benali')).toBeVisible();

  const absent = mark(page, 'Amina Benali', 'Absent');
  await expect(absent).toHaveAttribute('aria-pressed', 'false');
  await absent.click();
  await expect(absent).toHaveAttribute('aria-pressed', 'true');

  // A pending mark is what makes submitting possible, and what the reset
  // control exists to discard.
  const submit = page.getByRole('button', { name: 'Submit Attendance' });
  const reset = page.getByRole('button', { name: 'Reset' });
  await expect(submit).toBeEnabled();
  await expect(reset).toBeVisible();

  await reset.click();
  await expect(absent).toHaveAttribute('aria-pressed', 'false');
  await expect(submit).toBeDisabled();

  await close();
});

test('submitting sends one record per marked student, with the mark that was made', async ({ browser }) => {
  let sent: Record<string, any>[] = [];
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/attendance/students',
    setup: async (p) => {
      await withRoster(p);
      // Registered after the read mocks so it is consulted first, and so no
      // mark this test makes can reach the real database.
      sent = await captureWrites(p, '/attendance', 'POST', { id: 'acceptance-attendance-1' });
    },
  });
  await expect(page.getByText('Amina Benali')).toBeVisible();

  await mark(page, 'Amina Benali', 'Absent').click();
  await mark(page, 'Bilal Haddad', 'Late').click();
  await page.getByRole('button', { name: 'Submit Attendance' }).click();

  await expect.poll(() => sent.length, { message: 'both marks should be sent' }).toBe(2);
  expect(sent.map((record) => [record.studentId, record.status]).sort()).toEqual([
    ['acceptance-student-1', 'absent'],
    ['acceptance-student-2', 'late'],
  ]);
  // The register is taken for a section, and the record has to say which.
  for (const record of sent) expect(record.sectionId).toBe(SECTION.id);

  await close();
});

test('a phone gets a card per student, with the same marks and no squeezed columns', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/attendance/students',
    viewport: { width: 390, height: 844 },
    setup: withRoster,
  });

  // The table is replaced rather than compressed, and the student stays legible.
  await expect(page.locator('[data-slot="table-row"]')).toHaveCount(0);
  await expect(page.getByText('Amina Benali')).toBeVisible();
  await expect(page.getByText('ACC-0001')).toBeVisible();

  // And the register still works: the marks are reachable and still stage a draft.
  const absent = mark(page, 'Amina Benali', 'Absent');
  await expect(absent).toHaveAttribute('aria-pressed', 'false');
  await absent.click();
  await expect(absent).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Submit Attendance' })).toBeEnabled();

  await expectNoHorizontalOverflow(page);

  await close();
});
