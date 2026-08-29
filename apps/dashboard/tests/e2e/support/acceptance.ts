import { expect, type Browser, type Page } from '@playwright/test';
import { hash } from 'bcryptjs';
import postgres from 'postgres';
import { baseURL } from '../../../playwright.acceptance.config';

const databaseUrl = process.env.DB_URL;
if (!databaseUrl) throw new Error('DB_URL is required for the School acceptance suite.');

/**
 * A connection per call rather than one long-lived pool. Playwright reuses a
 * worker process across spec files, so a shared pool would either be closed by
 * whichever file finished first or outlive the run and hold the worker open.
 */
async function withSql<T>(run: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    return await run(sql);
  } finally {
    await sql.end();
  }
}

/** Every fixture identity this suite creates is namespaced, so cleanup is exact. */
export const FIXTURE_PREFIX = 'acceptance_e2e_';
const FIXTURE_PASSWORD = 'Acceptance12345';

export const ADMIN = {
  identifier: process.env.ADMIN_EMAIL ?? 'admin@admin.com',
  password: process.env.ADMIN_PASSWORD ?? 'ChangeMe123456',
};

export type FixtureRole = 'admin' | 'teacher' | 'parent' | 'accounting' | 'student';
export interface Credentials {
  identifier: string;
  password: string;
}

// `page.request` does not reliably resolve a relative path against the project
// `baseURL` in every runtime this suite executes under, so preference calls
// build an absolute URL instead of depending on that resolution.
export const apiPath = (path: string) => new URL(path, baseURL).toString();

/**
 * A deterministic user per role, owned by this suite. The seeded demo accounts
 * are left untouched: acceptance runs must not depend on — or damage — data a
 * developer is also looking at in the dashboard.
 */
export async function ensureRoleUser(role: FixtureRole): Promise<Credentials & { id: string }> {
  return withSql(async (sql) => {
    const [roleRow] = await sql<{ id: string }[]>`
      select id from roles where name = ${role} limit 1
    `;
    if (!roleRow) throw new Error(`The ${role} role must be seeded before the acceptance suite runs.`);

    const id = `${FIXTURE_PREFIX}${role}`;
    const email = `${FIXTURE_PREFIX}${role}@school.test`;
    const password = await hash(FIXTURE_PASSWORD, 4);
    await sql`
      insert into users (
        id, email, email_verified, password, status, role_id, name,
        failed_login_attempts, phone_verified, created_at, updated_at
      ) values (
        ${id}, ${email}, true, ${password}, 'active', ${roleRow.id},
        ${`Acceptance ${role}`}, 0, false, now(), now()
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
    return { id, identifier: email, password: FIXTURE_PASSWORD };
  });
}

export async function removeFixtureUsers() {
  await withSql((sql) => sql`delete from users where id like ${`${FIXTURE_PREFIX}%`}`);
}

/**
 * Fields are addressed by form name, not by label: the login labels are
 * translated, and this suite deliberately signs in under several languages.
 * The submit caption is a hardcoded English string in the page itself.
 */
export async function login(
  page: Page,
  credentials: Credentials,
  { rememberMe = false, from = '/' }: { rememberMe?: boolean; from?: string } = {},
) {
  // `?from=` is how the login screen is told where to hand over to, and using it
  // keeps the whole sign-in to a single navigation.
  await page.goto(from === '/' ? '/login' : `/login?from=${encodeURIComponent(from)}`);
  await page.locator('input[name="identifier"]').fill(credentials.identifier);
  await page.locator('input[name="password"]').fill(credentials.password);

  // Not `getByLabel`: najm-kit's checkbox `FormInput` renders a `<label for>`
  // whose id never reaches the checkbox control, so the box is found by DOM
  // proximity to its caption instead of a broken for/id association.
  const remember = page
    .locator('[data-slot="form-item"]', { hasText: 'Keep me logged in' })
    .getByRole('checkbox');
  if (rememberMe !== (await remember.isChecked())) await remember.click();

  // React Hook Form owns the submit handler, so a click that lands before the
  // login island hydrates is dropped silently and the page simply sits there.
  // One repeat covers that; more would only spend the login rate limit faster.
  const submit = page.getByRole('button', { name: 'Login', exact: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const settled = page
      .waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/login', { timeout: 10_000 })
      .catch(() => null);
    await submit.click().catch(() => undefined);
    const response = await settled;
    if (!response) continue;

    if (response.status() === 429) {
      throw new Error(
        'Sign-in was rate limited (429). Najm Auth allows 8 logins per 10 minutes by default; '
        + 'either wait out the window or raise NAJM_AUTH_LOGIN_RATE_LIMIT on the server under test.',
      );
    }
    expect(response.status(), 'sign-in should be accepted').toBe(200);
    return;
  }
  throw new Error('The login request never left the browser.');
}

export interface SessionOptions {
  /** Route to land on. Signing in hands over to it directly. Defaults to `/`. */
  at?: string;
  /**
   * Where the session is expected to come to rest, when that is not `at` —
   * a screen that guards itself will move the session off the route it was
   * handed. Naming it here keeps such a case to a single navigation.
   */
  settlesAt?: string;
  viewport?: { width: number; height: number };
  language?: 'en' | 'fr' | 'ar' | 'es';
  theme?: 'light' | 'dark';
  /** Runs before the sign-in navigation, so route mocks cover the first render. */
  setup?: (page: Page) => Promise<void>;
}

/**
 * A signed-in browser context of its own per test.
 *
 * Sharing one session between tests is not an option here: Najm Auth rotates
 * refresh tokens on use and invalidates the previous one, so a second context
 * built from the same cookies signs the first one out, and two pages on one
 * context race each other's refresh. A test that loses that race silently reads
 * an empty list instead of failing, which is the worst possible outcome for a
 * suite meant to describe behaviour.
 *
 * The cost is one sign-in per test against a rate-limited endpoint — see the
 * `NAJM_AUTH_LOGIN_RATE_LIMIT` note in `playwright.acceptance.config.ts`.
 *
 * Preferences are written before the first navigation because the root Server
 * Component reads them to pick the painted language, direction, and theme;
 * setting them afterwards would only be observable on the next navigation.
 */
export async function signInAs(
  browser: Browser,
  credentials: Credentials,
  options: SessionOptions = {},
): Promise<{ page: Page; close: () => Promise<void> }> {
  const viewport = options.viewport ?? { width: 1440, height: 900 };
  const context = await browser.newContext({
    baseURL,
    viewport,
    hasTouch: viewport.width <= 768,
  });
  const page = await context.newPage();

  await setLanguage(page, options.language ?? 'en');
  await setTheme(page, options.theme ?? 'light');
  await options.setup?.(page);

  const destination = options.at ?? '/';
  await login(page, credentials, { from: destination });

  // Every full document load re-verifies the session, and Najm Auth rotates the
  // refresh token when it does. Two navigations in quick succession therefore
  // race each other: the second one can present a token the first has already
  // rotated away, leaving the client signed out while the server-rendered page
  // still draws — a sidebar that silently falls back to the non-admin shape and
  // lists that silently come back empty. Handing over straight to the
  // destination keeps sign-in to one navigation and removes the race.
  await page.waitForURL((url) => url.pathname === (options.settlesAt ?? destination));
  await page.waitForLoadState('load');
  return { page, close: () => context.close() };
}

export async function setLanguage(page: Page, language: 'en' | 'fr' | 'ar' | 'es') {
  const response = await page.request.post(apiPath('/api/ui-language'), { data: { language } });
  expect(response.status()).toBe(200);
}

export async function setTheme(page: Page, theme: 'light' | 'dark') {
  const response = await page.request.post(apiPath('/api/ui-theme'), { data: { theme } });
  expect(response.status()).toBe(200);
}

const envelope = (data: unknown, message = 'ok') =>
  JSON.stringify({ success: true, message, data });

const onApi = (pathname: string) => (url: URL) => url.pathname === `/api${pathname}`;

/**
 * School's API envelope. Mocking it keeps a rendering assertion about the row
 * the test wrote, not about whatever the shared demo database happens to hold
 * on the day the suite runs.
 *
 * Reads only. A write to the same path falls through, so a test that triggers
 * one has to say what should happen to it — see `captureWrites`.
 */
export async function mockApi(page: Page, pathname: string, data: unknown, message = 'ok') {
  await page.route(onApi(pathname), (route) => (
    route.request().method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: envelope(data, message) })
      : route.fallback()
  ));
}

/**
 * Makes one endpoint fail, so a test can state what the screen does about it.
 *
 * The default 500 is a server that could not answer; pass 401 or 403 for one
 * that refused. The distinction is the point — a table has to tell those apart
 * from each other, and both from a list that is genuinely empty.
 */
export async function failApi(page: Page, pathname: string, status = 500, message = 'Request failed') {
  await page.route(onApi(pathname), (route) => (
    route.request().method() === 'GET'
      ? route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message }),
        })
      : route.fallback()
  ));
}

/**
 * Pins one part of a real response instead of inventing the whole thing.
 *
 * Some screens read a single field out of a large server-owned document — the
 * public settings, say — and behave differently depending on it. Replacing the
 * document wholesale would make the test a fixture-maintenance problem; this
 * keeps every other field authentic and states exactly which one the test
 * depends on.
 */
export async function overrideApi(
  page: Page,
  pathname: string,
  transform: (data: any) => unknown,
) {
  await page.route(onApi(pathname), async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({
      status: response.status(),
      contentType: 'application/json',
      body: JSON.stringify({ ...body, data: transform(body?.data) }),
    });
  });
}

/**
 * Intercepts a write and records what was sent, so a test can assert on the
 * request the UI produced rather than on a toast. Nothing reaches the real
 * backend: an acceptance run must not mutate the database it reads from.
 */
export async function captureWrites(
  page: Page,
  pathname: string,
  method: 'POST' | 'PUT' | 'DELETE',
  data: unknown = null,
): Promise<Record<string, any>[]> {
  const sent: Record<string, any>[] = [];
  await page.route(onApi(pathname), (route) => {
    if (route.request().method() !== method) return route.fallback();
    sent.push(route.request().postDataJSON() ?? {});
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(data) });
  });
  return sent;
}

/**
 * The app body is `overflow-hidden`, so a layout that blows past the viewport
 * is silently clipped rather than made scrollable. Comparing the scroll width
 * against the client width is what still catches it.
 */
export async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    }))
    .toBeLessThanOrEqual(1);
}
