import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  expectNoHorizontalOverflow,
  mockApi,
  signInAs,
} from './support/acceptance';

/**
 * Student conduct is recorded on two screens that mirror each other: one for
 * violations and one for recognition. Both translate their stored codes into
 * words, and both are about a named student rather than an anonymous row, so
 * that is what these tests hold them to.
 */
test.describe.configure({ mode: 'serial' });

const student = (index: number, name: string) => ({
  id: `acceptance-student-${index}`,
  name,
  studentCode: `ACC-000${index}`,
  image: null,
});

const CLASS = { id: 'acceptance-class-1', name: 'Grade 5A' };
const SECTION = { id: 'acceptance-section-1', name: 'A' };

const INCIDENTS = [
  {
    id: 'acceptance-incident-1',
    student: student(1, 'Amina Benali'),
    class: CLASS,
    section: SECTION,
    category: 'uniform_violation',
    description: 'Wore trainers on a formal day.',
    severity: 'low',
    status: 'open',
    incidentAt: '2026-05-04T09:00:00.000Z',
    actionType: 'warning',
    reporter: { id: 'acceptance-user-1', name: 'Rachid Alami' },
  },
  {
    id: 'acceptance-incident-2',
    student: student(2, 'Bilal Haddad'),
    class: CLASS,
    section: SECTION,
    category: 'cheating',
    description: 'Copied during a class test.',
    severity: 'critical',
    status: 'resolved',
    incidentAt: '2026-05-06T11:30:00.000Z',
    actionType: 'suspension',
    reporter: { id: 'acceptance-user-1', name: 'Rachid Alami' },
  },
];

const RECOGNITIONS = [
  {
    id: 'acceptance-reward-1',
    student: student(1, 'Amina Benali'),
    class: CLASS,
    section: SECTION,
    category: 'leadership',
    description: 'Organised the reading corner.',
    recognitionLevel: 'excellence',
    rewardType: 'certificate',
    points: 15,
    behaviorAt: '2026-05-08T10:00:00.000Z',
    awardedBy: { id: 'acceptance-user-1', name: 'Rachid Alami' },
  },
  {
    id: 'acceptance-reward-2',
    student: student(2, 'Bilal Haddad'),
    class: CLASS,
    section: SECTION,
    category: 'helpfulness',
    description: 'Helped a classmate catch up.',
    recognitionLevel: 'appreciation',
    rewardType: 'verbal_praise',
    points: 0,
    behaviorAt: '2026-05-09T10:00:00.000Z',
    awardedBy: null,
  },
];

const cell = (page: Page, text: string) =>
  page.locator('[data-slot="table-cell"]', { hasText: text });

test('a violation names the student, the category in words, and how serious it is', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/discipline',
    setup: (p) => mockApi(p, '/discipline', INCIDENTS),
  });

  await expect(page.getByText('2 discipline records')).toBeVisible();

  await expect(cell(page, 'Amina Benali').first()).toBeVisible();
  // Stored as `uniform_violation` and read as a phrase, with the free-text
  // description kept alongside it rather than replacing it.
  await expect(cell(page, 'Uniform violation').first()).toBeVisible();
  await expect(cell(page, 'Wore trainers on a formal day.').first()).toBeVisible();
  await expect(cell(page, 'Low').first()).toBeVisible();
  await expect(cell(page, 'Open').first()).toBeVisible();

  await expect(cell(page, 'Bilal Haddad').first()).toBeVisible();
  await expect(cell(page, 'Cheating').first()).toBeVisible();
  await expect(cell(page, 'Critical').first()).toBeVisible();
  await expect(cell(page, 'Resolved').first()).toBeVisible();

  await close();
});

test('recognition records the level, the reward and the points awarded', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/behavior-rewards',
    setup: (p) => mockApi(p, '/behavior-rewards', RECOGNITIONS),
  });

  await expect(page.getByText('2 recognition records')).toBeVisible();

  await expect(cell(page, 'Amina Benali').first()).toBeVisible();
  await expect(cell(page, 'Leadership').first()).toBeVisible();
  await expect(cell(page, 'Excellence').first()).toBeVisible();
  await expect(cell(page, 'Certificate').first()).toBeVisible();
  // Points are shown as an award rather than a bare number.
  await expect(cell(page, '+15').first()).toBeVisible();

  await expect(cell(page, 'Bilal Haddad').first()).toBeVisible();
  await expect(cell(page, 'Appreciation').first()).toBeVisible();
  await expect(cell(page, 'Verbal praise').first()).toBeVisible();
  // Nothing awarded reads as nothing, not as a zero.
  await expect(cell(page, '—').first()).toBeVisible();

  await close();
});

test('both conduct screens sit behind one navigation group and fit a phone', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    viewport: { width: 390, height: 844 },
    setup: async (p) => {
      await mockApi(p, '/discipline', INCIDENTS);
      await mockApi(p, '/behavior-rewards', RECOGNITIONS);
    },
  });

  const trigger = page.locator('[data-slot="page-header-sidebar-trigger"]');
  await trigger.click();
  await page.getByRole('button', { name: 'Student Conduct' }).click();
  await page.locator('a[href="/discipline"]:visible').first().click();

  await expect(page).toHaveURL(/\/discipline$/);
  await expect(page.getByText('Amina Benali').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await close();
});
