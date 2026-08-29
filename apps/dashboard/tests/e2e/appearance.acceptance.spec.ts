import { expect, test } from '@playwright/test';
import { ensureRoleUser, expectNoHorizontalOverflow, signInAs } from './support/acceptance';

/**
 * Language and theme are offered from the page header on every screen, and both
 * have to survive a reload — the root Server Component reads them to choose the
 * first painted direction and colour scheme, so a preference that only lived in
 * React would flash the wrong one on every navigation.
 *
 * These tests sign in as the suite's own admin rather than the seeded one: the
 * language switcher writes the signed-in user's stored preference, and that is
 * not a record to change under a developer who is using the dashboard.
 */
test.describe.configure({ mode: 'serial' });

test('the header theme toggle switches the shell and survives a reload', async ({ browser }) => {
  const admin = await ensureRoleUser('admin');
  const { page, close } = await signInAs(browser, admin, { theme: 'light' });

  const html = page.locator('html');
  await expect(html).not.toHaveClass(/dark/);

  // The class flips optimistically while the write is still in flight, so the
  // response is what a reload assertion has to be sequenced against — otherwise
  // the test reloads before the preference has been stored and reads the old one.
  const toggleTheme = async () => {
    const stored = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/ui-theme'
        && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    expect((await stored).status()).toBe(200);
  };

  await toggleTheme();
  await expect(html).toHaveClass(/dark/);

  // The reload is the point: it proves the choice reached the cookie the server
  // renders from, rather than living only in the React tree that just changed.
  await page.reload();
  await expect(html).toHaveClass(/dark/);

  await toggleTheme();
  await expect(html).not.toHaveClass(/dark/);
  await page.reload();
  await expect(html).not.toHaveClass(/dark/);

  await close();
});

test('choosing Arabic translates the shell, flips it right-to-left, and survives a reload', async ({ browser }) => {
  const admin = await ensureRoleUser('admin');
  const { page, close } = await signInAs(browser, admin, { language: 'en' });

  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'en');
  await expect(page.locator('a[href="/students"]').first()).toContainText('Students');

  await page.getByRole('button', { name: 'Change language' }).click();
  await page.getByRole('menuitem', { name: 'العربية' }).click();

  await expect(html).toHaveAttribute('lang', 'ar');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('a[href="/students"]').first()).toContainText('التلاميذ');
  await expectNoHorizontalOverflow(page);

  await page.reload();
  await expect(html).toHaveAttribute('lang', 'ar');
  await expect(html).toHaveAttribute('dir', 'rtl');

  // Put it back, so the next test starts from the same place this one did.
  await page.getByRole('button', { name: 'Change language' }).click();
  await page.getByRole('menuitem', { name: 'English' }).click();
  await expect(html).toHaveAttribute('lang', 'en');
  await expect(html).toHaveAttribute('dir', 'ltr');

  await close();
});
