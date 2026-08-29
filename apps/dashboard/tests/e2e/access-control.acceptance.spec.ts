import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  apiPath,
  ensureRoleUser,
  failApi,
  mockApi,
  signInAs,
} from './support/acceptance';

/**
 * Access control is where School says who exists and what each role may do, so
 * it is also the place to state the boundary plainly: the sidebar decides what
 * is offered, and the backend decides what is served. The last test holds the
 * second half of that — a role the navigation never offers these screens to can
 * still type the URL, and must come away with nothing.
 */
test.describe.configure({ mode: 'serial' });

const USERS = [
  {
    id: 'acceptance-user-1',
    name: 'Rachid Alami',
    email: 'rachid@school.test',
    status: 'active',
    image: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    analytics: { totalLogins: 12, totalSessions: 4 },
  },
  {
    id: 'acceptance-user-2',
    name: 'Hind Bennis',
    email: 'hind@school.test',
    status: 'inactive',
    image: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    analytics: { totalLogins: 0, totalSessions: 0 },
  },
];

const ROLES = [
  { id: 'acceptance-role-1', name: 'registrar', description: 'Handles enrolment' },
  { id: 'acceptance-role-2', name: 'librarian', description: null },
];

const withUsers = (page: Page) => mockApi(page, '/users', USERS);
const withRoles = (page: Page) => mockApi(page, '/roles', ROLES);

test('an admin sees every account with its status and sign-in activity', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/users', setup: withUsers });

  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  await expect(page.getByText('2 users total')).toBeVisible();

  await expect(page.getByText('Rachid Alami')).toBeVisible();
  await expect(page.getByText('rachid@school.test')).toBeVisible();
  await expect(page.getByText('Hind Bennis')).toBeVisible();
  await expect(page.getByText('hind@school.test')).toBeVisible();

  // The card leads with how much the account has actually been used.
  await expect(page.getByText('Total Logins').first()).toBeVisible();
  await expect(page.getByText('12')).toBeVisible();

  await close();
});

test('the role list opens as a table and offers permissions per role', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/roles', setup: withRoles });

  await expect(page.getByRole('heading', { name: 'Roles' })).toBeVisible();
  await expect(page.getByText('2 roles total')).toBeVisible();

  for (const header of ['Role Name', 'Description', 'Permissions']) {
    await expect(page.locator('[data-slot="table-head"]', { hasText: header }).first()).toBeVisible();
  }
  await expect(page.locator('[data-slot="table-cell"]', { hasText: 'registrar' }).first()).toBeVisible();
  await expect(page.getByText('Handles enrolment')).toBeVisible();
  await expect(page.getByText('No description')).toBeVisible();

  // Permissions are managed per role rather than in bulk, and the dialog names
  // the role it is about.
  await page
    .locator('[data-slot="table-row"]', { hasText: 'registrar' })
    .getByRole('button', { name: 'Manage' })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Manage Permissions - registrar');

  await close();
});

test('a teacher who types an access-control URL is refused the data behind it', async ({ browser }) => {
  const teacher = await ensureRoleUser('teacher');
  // No mock: the point of this test is what the real backend does.
  const { page, close } = await signInAs(browser, teacher, { at: '/users' });

  // The screen is reachable — routing is not the control here — but the API
  // that fills it refuses, so no account is disclosed.
  const refused = await page.request.get(apiPath('/api/users'));
  expect(refused.ok(), 'the accounts endpoint must not serve a teacher').toBe(false);
  expect([401, 403]).toContain(refused.status());

  await expect(page.locator('[data-slot="table-row"]')).toHaveCount(0);

  // And says so. A refusal is not an empty list: offering "add your first item"
  // here would describe a school with no accounts and invite an action that
  // would be refused as well.
  await expect(page.getByText('Access denied')).toBeVisible();
  await expect(page.getByText('You do not have permission to view this.')).toBeVisible();
  await expect(page.getByText('Add your first item to get started.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create User' })).toHaveCount(0);
  // Nor does the header count the accounts it was not shown.
  await expect(page.getByText('0 users total')).toHaveCount(0);

  // And the shell still never offers the section it belongs to.
  await expect(page.getByRole('button', { name: 'Access Control' })).toHaveCount(0);

  await close();
});

test('a list that fails to load says so, in the language being read', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/students',
    language: 'fr',
    setup: (target) => failApi(target, '/students', 500),
  });

  // A server that could not answer is a different thing from one that refused,
  // and both are different from a school with no students on the roll.
  await expect(page.getByText('Une erreur est survenue')).toBeVisible();
  await expect(page.getByText("Cette liste n'a pas pu être chargée. Veuillez réessayer.")).toBeVisible();

  await expect(page.getByText('Aucune donnée disponible')).toHaveCount(0);
  await expect(page.getByText('0 étudiants au total')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Créer l’élève' })).toHaveCount(0);
  // Nothing here falls back to the packaged English.
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
  await expect(page.getByText('Access denied')).toHaveCount(0);

  await close();
});
