import { expect, test, type Browser, type Page } from '@playwright/test';
import { hash } from 'bcryptjs';
import postgres from 'postgres';

const ADMIN = {
  identifier: process.env.ADMIN_EMAIL ?? 'admin@admin.com',
  password: process.env.ADMIN_PASSWORD ?? 'ChangeMe123456',
};
const TEST_PASSWORD = 'Upgrade12345';
const NEW_PASSWORD = 'Upgrade67890';
const TEST_USER_PREFIX = 'upgrade_e2e_';

const databaseUrl = process.env.DB_URL;
if (!databaseUrl) throw new Error('DB_URL is required for the Najm upgrade E2E suite.');

const sql = postgres(databaseUrl, { max: 1 });

async function ensureRoleUser(role: string) {
  const [roleRow] = await sql<{ id: string }[]>`
    select id from roles where name = ${role} limit 1
  `;
  if (!roleRow) throw new Error(`The ${role} role must be seeded before E2E.`);

  const id = `${TEST_USER_PREFIX}${role}`;
  const email = `${TEST_USER_PREFIX}${role}@school.test`;
  const password = await hash(TEST_PASSWORD, 4);
  await sql`
    insert into users (
      id, email, email_verified, password, status, role_id, name,
      failed_login_attempts, phone_verified, created_at, updated_at
    ) values (
      ${id}, ${email}, true, ${password}, 'active', ${roleRow.id},
      ${`Upgrade ${role}`}, 0, false, now(), now()
    )
    on conflict (id) do update set
      email = excluded.email,
      password = excluded.password,
      status = 'active',
      role_id = excluded.role_id,
      failed_login_attempts = 0,
      lockout_until = null,
      updated_at = now()
  `;
  return { id, identifier: email, password: TEST_PASSWORD };
}

async function requirePasswordSetup(userId: string) {
  await sql`
    insert into credential_setup_requirements (
      user_id, purpose, temporary_credential_kind, required,
      completed_at, created_at, updated_at
    ) values (${userId}, 'password', 'exact', true, null, now(), now())
    on conflict (user_id, purpose) do update set
      temporary_credential_kind = excluded.temporary_credential_kind,
      required = true,
      completed_at = null,
      updated_at = now()
  `;
}

async function login(page: Page, credentials = ADMIN, rememberMe = false) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(credentials.identifier);
  await page.getByLabel('Password').fill(credentials.password);
  const checkbox = page.getByLabel('Keep me logged in');
  if (rememberMe !== (await checkbox.isChecked())) await checkbox.click();
  await page.getByRole('button', { name: 'Login', exact: true }).click();
}

async function loginInNewContext(
  browser: Browser,
  credentials: { identifier: string; password: string },
  rememberMe = false,
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, credentials, rememberMe);
  return { context, page };
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await Promise.all(
    ['admin', 'principal', 'teacher', 'accounting', 'student', 'parent'].map(ensureRoleUser),
  );
});

test.afterAll(async () => {
  await sql`delete from users where id like ${`${TEST_USER_PREFIX}%`}`;
  await sql.end();
});

test('anonymous routing and first-paint preferences use the server snapshot', async ({ page }) => {
  await page.goto('/students');
  await expect(page).toHaveURL(/\/login\?from=%2Fstudents$/);
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();

  await expect((await page.request.post('/api/ui-language', { data: { language: 'ar' } })).status()).toBe(200);
  await expect((await page.request.post('/api/ui-theme', { data: { theme: 'dark' } })).status()).toBe(200);
  await expect((await page.request.post('/api/ui-timezone', { data: { timeZone: 'Africa/Casablanca' } })).status()).toBe(200);
  await page.reload();

  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'ar');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(html).toHaveAttribute('data-time-zone', 'Africa/Casablanca');
  await expect(html).toHaveClass(/dark/);
  const authLogo = page.getByRole('img', { name: 'MyScolAI' });
  await expect(authLogo).toBeVisible();
  await expect.poll(() => authLogo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);

  await expect((await page.request.post('/api/ui-language', { data: { language: 'xx' } })).status()).toBe(400);
  await expect((await page.request.post('/api/ui-theme', { data: { theme: 'system' } })).status()).toBe(400);
  await expect((await page.request.post('/api/ui-timezone', { data: { timeZone: 'Mars/Olympus' } })).status()).toBe(400);
});

test('admin login covers failures, session/persistent cookies, redirects, mobile sidebar, and logout cleanup', async ({ browser, page }) => {
  const wrong = await page.request.post('/api/auth/login', {
    data: { ...ADMIN, password: 'wrong-password', rememberMe: false },
  });
  expect(wrong.status()).toBe(401);

  await login(page);
  await expect(page).toHaveURL(/\/$/);
  const sessionCookies = await page.context().cookies();
  expect(sessionCookies.find((cookie) => cookie.name === 'refreshToken')?.expires).toBe(-1);
  expect(sessionCookies.find((cookie) => cookie.name === 'sms.remember')?.expires).toBe(-1);

  await page.goto('/login');
  await expect(page).toHaveURL(/\/$/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/students');
  const openSidebar = page.getByRole('button', { name: 'Open sidebar' });
  await expect(openSidebar).toBeVisible();
  await openSidebar.click();
  await expect(page.locator('a[href="/students"]:visible').first()).toBeVisible();

  await page.request.post('/api/ui-language', { data: { language: 'fr' } });
  await page.request.post('/api/ui-theme', { data: { theme: 'dark' } });
  await page.request.post('/api/ui-timezone', { data: { timeZone: 'Africa/Casablanca' } });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('button:has(svg.lucide-log-out)').click();
  await expect(page).toHaveURL(/\/login$/);
  const clearedNames = (await page.context().cookies()).map((cookie) => cookie.name);
  for (const name of [
    'refreshToken', 'najm.session', 'sms.remember',
    'school-ui-language', 'school-ui-theme', 'school-ui-timezone',
  ]) expect(clearedNames).not.toContain(name);

  const remembered = await loginInNewContext(browser, ADMIN, true);
  await expect(remembered.page).toHaveURL(/\/$/);
  const persistent = await remembered.context.cookies();
  expect(persistent.find((cookie) => cookie.name === 'refreshToken')?.expires).toBeGreaterThan(0);
  expect(persistent.find((cookie) => cookie.name === 'sms.remember')?.expires).toBeGreaterThan(0);
  await remembered.context.close();
});

test('credential setup completes once, requires a fresh login, rejects replay, cancellation, and expiry', async ({ browser }) => {
  const setupUser = await ensureRoleUser('admin');
  await requirePasswordSetup(setupUser.id);

  const first = await loginInNewContext(browser, setupUser);
  await expect(first.page).toHaveURL(/\/change-password$/);
  await expect(first.page.getByLabel('New password')).toBeVisible();
  await first.page.getByLabel('New password').fill(NEW_PASSWORD);
  await first.page.getByLabel('Confirm password').fill(NEW_PASSWORD);
  await first.page.getByRole('button', { name: 'Set password' }).click();
  await expect(first.page).toHaveURL(/\/login$/);
  expect((await first.context.cookies()).map((cookie) => cookie.name)).not.toContain('najm.session');

  const replay = await first.page.request.post('/api/auth/credential-setup/change', {
    data: { newPassword: 'Replay12345' },
  });
  expect(replay.status()).toBe(401);
  await login(first.page, { identifier: setupUser.identifier, password: NEW_PASSWORD });
  await expect(first.page).toHaveURL(/\/$/);
  await first.context.close();

  const cancelledUser = await ensureRoleUser('principal');
  await requirePasswordSetup(cancelledUser.id);
  const cancelled = await loginInNewContext(browser, cancelledUser);
  await expect(cancelled.page).toHaveURL(/\/change-password$/);
  await cancelled.page.getByRole('button', { name: 'Cancel' }).click();
  await expect(cancelled.page).toHaveURL(/\/login$/);
  expect((await cancelled.context.cookies()).map((cookie) => cookie.name)).not.toContain('najm.credential-setup');
  await cancelled.context.close();

  const expiredUser = await ensureRoleUser('teacher');
  await requirePasswordSetup(expiredUser.id);
  const expired = await loginInNewContext(browser, expiredUser);
  await expect(expired.page).toHaveURL(/\/change-password$/);
  await sql`
    update credential_setup_sessions set expires_at = now() - interval '1 minute'
    where user_id = ${expiredUser.id} and consumed_at is null and revoked_at is null
  `;
  const expiredChange = await expired.page.request.post('/api/auth/credential-setup/change', {
    data: { newPassword: NEW_PASSWORD },
  });
  expect(expiredChange.status()).toBe(401);
  await expired.context.close();
});

test('role, locale, viewport, RTL, dark-mode, touch and keyboard matrix stays routable', async ({ browser }, testInfo) => {
  const cases = [
    { role: 'admin', language: 'en', width: 1440, height: 900, theme: 'light' },
    { role: 'principal', language: 'fr', width: 1024, height: 768, theme: 'dark' },
    { role: 'teacher', language: 'ar', width: 390, height: 844, theme: 'dark' },
    { role: 'accounting', language: 'es', width: 768, height: 1024, theme: 'light' },
    { role: 'student', language: 'ar', width: 390, height: 844, theme: 'light' },
    { role: 'parent', language: 'fr', width: 1024, height: 768, theme: 'dark' },
  ] as const;

  for (const entry of cases) {
    const user = await ensureRoleUser(entry.role);
    const context = await browser.newContext({
      viewport: { width: entry.width, height: entry.height },
      hasTouch: entry.width <= 768,
    });
    const page = await context.newPage();
    await page.request.post('/api/ui-language', { data: { language: entry.language } });
    await page.request.post('/api/ui-theme', { data: { theme: entry.theme } });
    await login(page, user);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', entry.language);
    await expect(page.locator('html')).toHaveAttribute('dir', entry.language === 'ar' ? 'rtl' : 'ltr');
    if (entry.theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
    else await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).not.toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath(`${entry.role}-${entry.language}-${entry.width}.png`),
      fullPage: true,
    });
    await context.close();
  }
});
