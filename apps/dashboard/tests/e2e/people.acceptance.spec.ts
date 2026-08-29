import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  expectNoHorizontalOverflow,
  mockApi,
  signInAs,
} from './support/acceptance';

/**
 * The teacher and parent directories are the two people screens an admin works
 * from. Both render as cards, and both say something the student directory does
 * not: a teacher card resolves the classes behind their assignments, and a
 * parent card marks a parent no child is attached to.
 */
test.describe.configure({ mode: 'serial' });

const CLASS = { id: 'acceptance-class-1', name: 'Grade 5A' };

// `NSectionInfo` elides a card value past twelve characters, so the teacher
// fixtures stay inside it rather than asserting on an ellipsis.
const TEACHERS = [
  {
    id: 'acceptance-teacher-1',
    name: 'Nadia Chraibi',
    email: 'nadia@school.test',
    phone: '0612345678',
    specialization: 'Mathematics',
    status: 'active',
    image: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    assignments: [{ classId: CLASS.id, subjectId: 'acceptance-subject-1' }],
  },
  {
    id: 'acceptance-teacher-2',
    name: 'Omar Fassi',
    email: 'omar@school.test',
    phone: '0698765432',
    specialization: 'Physics',
    status: 'active',
    image: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    assignments: [],
  },
];

const PARENTS = [
  {
    id: 'acceptance-parent-1',
    name: 'Youssef Alaoui',
    email: 'youssef@school.test',
    phone: '+212600000001',
    relationshipType: 'father',
    occupation: 'Engineer',
    totalChildren: 2,
    isOrphaned: false,
    image: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acceptance-parent-2',
    name: 'Salma Idrissi',
    email: 'salma@school.test',
    phone: '+212600000002',
    relationshipType: 'mother',
    occupation: 'Doctor',
    totalChildren: 0,
    isOrphaned: true,
    image: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

async function withTeachers(page: Page) {
  await mockApi(page, '/teachers', TEACHERS);
  // The card resolves assignment class ids through the classes cache, so the
  // class it names has to be one the page was given.
  await mockApi(page, '/classes', [CLASS]);
}

const withParents = (page: Page) => mockApi(page, '/parents', PARENTS);

test('the teacher directory names each teacher, their subject and the classes they are assigned to', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/teachers', setup: withTeachers });

  await expect(page.getByRole('heading', { name: 'Teachers' })).toBeVisible();
  await expect(page.getByText('2 teachers total')).toBeVisible();

  await expect(page.getByText('Nadia Chraibi')).toBeVisible();
  await expect(page.getByText('Mathematics')).toBeVisible();
  await expect(page.getByText('0612345678')).toBeVisible();
  await expect(page.getByText('nadia@school.test')).toBeVisible();
  // Assignments are stored as class ids; the card is expected to show the name.
  await expect(page.getByText('Grade 5A')).toBeVisible();

  await expect(page.getByText('Omar Fassi')).toBeVisible();
  await expect(page.getByText('Physics')).toBeVisible();

  await expect(page.getByRole('button', { name: 'Create Teacher' })).toBeVisible();

  await close();
});

test('the parent directory shows the relationship and marks a parent with no children', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/parents', setup: withParents });

  await expect(page.getByRole('heading', { name: 'Parents' })).toBeVisible();
  await expect(page.getByText('2 parents total')).toBeVisible();

  await expect(page.getByText('Youssef Alaoui')).toBeVisible();
  await expect(page.getByText('Father')).toBeVisible();
  await expect(page.getByText('Engineer')).toBeVisible();

  await expect(page.getByText('Salma Idrissi')).toBeVisible();
  await expect(page.getByText('Mother')).toBeVisible();
  await expect(page.getByText('Doctor')).toBeVisible();

  // A parent no child is attached to is flagged, and one with children is not.
  const attached = page.getByRole('link', { name: 'View Youssef Alaoui' });
  const unattached = page.getByRole('link', { name: 'View Salma Idrissi' });
  await expect(unattached).toHaveAttribute('data-parent-orphan-card', 'true');
  await expect(attached).not.toHaveAttribute('data-parent-orphan-card', 'true');

  await close();
});

test('both people directories fit a phone viewport', async ({ browser }) => {
  const teachers = await signInAs(browser, ADMIN, {
    at: '/teachers',
    viewport: { width: 390, height: 844 },
    setup: withTeachers,
  });
  await expect(teachers.page.getByText('Nadia Chraibi')).toBeVisible();
  await expectNoHorizontalOverflow(teachers.page);
  await teachers.close();

  const parents = await signInAs(browser, ADMIN, {
    at: '/parents',
    viewport: { width: 390, height: 844 },
    setup: withParents,
  });
  await expect(parents.page.getByText('Youssef Alaoui')).toBeVisible();
  await expectNoHorizontalOverflow(parents.page);
  await parents.close();
});
