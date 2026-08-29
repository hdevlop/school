import { expect, test } from '@playwright/test';
import { ADMIN, ensureRoleUser, signInAs } from './support/acceptance';

/**
 * Settings is the only screen in School that guards itself. Everywhere else the
 * sidebar decides what is offered and the backend decides what is served — a
 * teacher who types `/users` still gets the page, just no data. `/settings`
 * instead sends anyone but an admin or principal back to the dashboard, and
 * that difference is worth stating explicitly.
 *
 * These tests read the screen and never save from it: the settings row is the
 * live configuration of whatever database the suite is pointed at.
 */
test.describe.configure({ mode: 'serial' });

test('an admin can open settings and is offered the control that saves them', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, { at: '/settings' });

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Save Settings/ })).toBeVisible();

  await close();
});

test('settings is reachable from the sidebar footer rather than the navigation list', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN);

  // It is a button in the footer, not a nav link, so there is no `/settings`
  // anchor to click.
  await expect(page.locator('a[href="/settings"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings' }).click();

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await close();
});

test('a teacher who types the settings URL is returned to the dashboard, still signed in', async ({ browser }) => {
  const teacher = await ensureRoleUser('teacher');
  // Sign-in is handed straight to `/settings`; the route's server layout is
  // expected to settle the visitor on the dashboard instead.
  const { page, close } = await signInAs(browser, teacher, { at: '/settings', settlesAt: '/' });

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Settings' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Save Settings/ })).toHaveCount(0);

  // Returned, not signed out. The guard used to redirect from the client after
  // hydration, which raced the session verification and left the teacher at the
  // login screen; deciding on the server keeps the session intact.
  await expect(page.getByRole('button', { name: 'LogOut' })).toBeVisible();
  await expect(page.locator('input[name="identifier"]')).toHaveCount(0);

  await close();
});
