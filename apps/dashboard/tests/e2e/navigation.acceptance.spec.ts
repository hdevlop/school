import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  ensureRoleUser,
  expectNoHorizontalOverflow,
  signInAs,
} from './support/acceptance';

/**
 * What a signed-in person is offered is decided entirely by their role in
 * `DashboardShell`. These are the navigation guarantees the shell makes; the
 * backend stays the authority on what each role may actually read or write.
 */
test.describe.configure({ mode: 'serial' });

const ADMIN_ONLY_GROUPS = ['Financial', 'Transport', 'Access Control'] as const;
const TEACHING_LINKS = ['/', '/students', '/parents', '/teachers'] as const;

/**
 * `NSidebar` mounts the desktop rail and the mobile drawer at the same time and
 * parks the inactive one off-screen, where it keeps a real bounding box. A CSS
 * `:visible` filter still matches it, so "offered" has to mean on screen.
 */
async function expectNavOffered(page: Page, href: string, offered = true) {
  await expect
    .poll(() => page.evaluate((selector) => (
      [...document.querySelectorAll<HTMLElement>(selector)].some((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0
          && box.right > 0 && box.left < window.innerWidth
          && box.bottom > 0 && box.top < window.innerHeight;
      })
    ), `a[href="${href}"]`), { message: `expected a link to ${href} to ${offered ? '' : 'not '}be on screen` })
    .toBe(offered);
}

test('an anonymous visitor is sent to the login screen and keeps the route they asked for', async ({ page }) => {
  await page.goto('/students');

  await expect(page).toHaveURL(/\/login\?from=%2Fstudents$/);
  await expect(page.locator('input[name="identifier"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
});

test('an admin is offered every section, and a collapsed group opens to its routes', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN);

  await expect(page).toHaveURL(/\/$/);
  for (const href of [...TEACHING_LINKS, '/staff']) {
    await expectNavOffered(page, href);
  }
  for (const group of ADMIN_ONLY_GROUPS) {
    await expect(page.getByRole('button', { name: group })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();

  // A group is a disclosure, not a link: its routes exist only once opened.
  await expect(page.locator('a[href="/fees"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Financial' }).click();
  for (const href of ['/fees', '/expenses', '/payroll', '/fee-types']) {
    await expectNavOffered(page, href);
  }

  await close();
});

test('a teacher is offered the teaching sections and none of the administrative ones', async ({ browser }) => {
  const teacher = await ensureRoleUser('teacher');
  const { page, close } = await signInAs(browser, teacher);

  // The positive half runs first: it proves the shell rendered with a resolved
  // role, so the absences below are a decision and not an unfinished render.
  for (const href of TEACHING_LINKS) {
    await expectNavOffered(page, href);
  }

  await expect(page.locator('a[href="/staff"]')).toHaveCount(0);
  for (const group of ADMIN_ONLY_GROUPS) {
    await expect(page.getByRole('button', { name: group })).toHaveCount(0);
  }
  await expect(page.getByRole('button', { name: 'Settings' })).toHaveCount(0);

  // Attendance stays, but only the student register inside it.
  await page.getByRole('button', { name: 'Attendance' }).click();
  await expectNavOffered(page, '/attendance/students');
  await expect(page.locator('a[href="/attendance/staff"]')).toHaveCount(0);

  await close();
});

test('a parent is offered no dashboard navigation at all', async ({ browser }) => {
  const parent = await ensureRoleUser('parent');
  const { page, close } = await signInAs(browser, parent);

  // Signing out is the only control the shell offers this role, so its presence
  // is what marks the sidebar as rendered.
  await expect(page.getByRole('button', { name: 'LogOut' })).toBeVisible();
  await expect(page.locator('a[href]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Settings' })).toHaveCount(0);

  await close();
});

test('the mobile shell parks navigation off-screen until the header trigger asks for it', async ({ browser }) => {
  const { page, close } = await signInAs(browser, ADMIN, {
    at: '/students',
    viewport: { width: 390, height: 844 },
  });

  await expect(page.getByRole('heading', { name: 'Students' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const trigger = page.locator('[data-slot="page-header-sidebar-trigger"]');
  await expect(trigger).toBeVisible();
  await expectNavOffered(page, '/students', false);

  await trigger.click();
  for (const href of ['/students', '/parents', '/staff']) {
    await expectNavOffered(page, href);
  }
  await expectNoHorizontalOverflow(page);

  // Dismissing it returns the whole viewport to the page.
  await page.getByRole('button', { name: 'Close sidebar' }).click();
  await expectNavOffered(page, '/students', false);
  await expectNoHorizontalOverflow(page);

  await close();
});
