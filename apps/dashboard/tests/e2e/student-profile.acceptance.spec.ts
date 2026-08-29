import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  mockApi,
  signInAs,
} from './support/acceptance';

/**
 * The student profile is the one place in School that gathers a single student
 * from every direction at once — identity, attendance, grades, fees, transport
 * — and it opens over the directory rather than as its own route.
 *
 * Its sidebar does not simply display what it is given: the absence and late
 * counts are tallied from the attendance rows. That derivation is the part
 * worth holding, so the fixture contains a deliberate mix of statuses.
 */
test.describe.configure({ mode: 'serial' });

const STUDENT_ID = 'acceptance-student-1';

const STUDENT = {
  id: STUDENT_ID,
  studentCode: 'ACC-0001',
  name: 'Amina Benali',
  email: 'amina.benali@school.test',
  phone: '0612345678',
  gender: 'F',
  status: 'active',
  age: 11,
  class: { id: 'acceptance-class-1', name: 'Grade 5A' },
  section: { id: 'acceptance-section-1', name: 'A' },
  image: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const PARENTS = [
  {
    id: 'acceptance-parent-1',
    name: 'Youssef Alaoui',
    relationshipType: 'father',
    phone: '+212600000001',
    email: 'youssef@school.test',
    image: null,
  },
];

// Two absences and one late among five records, so the counts cannot be
// mistaken for "how many rows are there".
const ATTENDANCE = [
  { id: 'a1', studentId: STUDENT_ID, status: 'present', date: '2026-05-04' },
  { id: 'a2', studentId: STUDENT_ID, status: 'absent', date: '2026-05-05' },
  { id: 'a3', studentId: STUDENT_ID, status: 'present', date: '2026-05-06' },
  { id: 'a4', studentId: STUDENT_ID, status: 'late', date: '2026-05-07' },
  { id: 'a5', studentId: STUDENT_ID, status: 'absent', date: '2026-05-08' },
];

async function withProfile(page: Page) {
  await mockApi(page, '/students', [STUDENT]);
  await mockApi(page, `/students/${STUDENT_ID}`, STUDENT);
  await mockApi(page, `/students/${STUDENT_ID}/parents`, PARENTS);
  await mockApi(page, `/attendance/student/${STUDENT_ID}`, ATTENDANCE);
  // Mocked to empty rather than left alone: the profile asks for these too, and
  // an acceptance run should not be sending a made-up id to the real backend.
  await mockApi(page, `/grades/student/${STUDENT_ID}/report`, null);
  await mockApi(page, `/fees/student/${STUDENT_ID}`, { fees: [], summary: null });
}

/** The profile opens over the directory, so everything is scoped to its dialog. */
async function openProfile(page: Page) {
  await expect(page.getByText('Amina Benali')).toBeVisible();
  await page.getByRole('button', { name: 'Row actions' }).first().click();
  await page.getByRole('menuitem', { name: 'View' }).click();
  const profile = page.getByRole('dialog');
  await expect(profile.getByRole('heading', { name: 'Student Details' })).toBeVisible();
  return profile;
}

test('opening a student gathers their identity, class and standing in one place', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/students', setup: withProfile });
  const profile = await openProfile(page);

  await expect(profile.getByText('Profile & Academic Records')).toBeVisible();
  await expect(profile.getByText('Amina Benali').first()).toBeVisible();
  await expect(profile.getByText('Grade 5A · A')).toBeVisible();
  await expect(profile.getByText('Active').first()).toBeVisible();
  // The age is stated twice on the profile; either instance proves the point.
  await expect(profile.getByText('11 yrs').first()).toBeVisible();

  await close();
});

test('the sidebar counts absences and lateness rather than attendance rows', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/students', setup: withProfile });
  const profile = await openProfile(page);

  // Each stat renders its label and value as sibling paragraphs, so the value
  // is read from the one that follows the label rather than from the card.
  const stat = (label: string) =>
    profile
      .locator('p', { hasText: new RegExp(`^${label}$`) })
      .locator('xpath=following-sibling::p[1]');

  // Five records: two absences, one late. Neither figure is the row count.
  await expect(stat('Absences')).toHaveText('2');
  await expect(stat('Late')).toHaveText('1');

  await close();
});

test('the profile offers a tab per record type and closes back to the directory', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/students', setup: withProfile });
  const profile = await openProfile(page);

  for (const label of ['Overview', 'Attendance', 'Grades', 'Fees', 'Transport', 'Alerts']) {
    await expect(profile.getByRole('tab', { name: label })).toBeVisible();
  }

  await profile.getByRole('tab', { name: 'Attendance' }).click();
  await expect(profile.getByRole('tab', { name: 'Attendance' })).toHaveAttribute('aria-selected', 'true');

  // Closing returns the directory rather than navigating anywhere.
  await profile.getByRole('button', { name: 'Close student details' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/students$/);
  await expect(page.getByText('Amina Benali')).toBeVisible();

  await close();
});
