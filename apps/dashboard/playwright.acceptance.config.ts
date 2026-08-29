import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// The suite runs under Node rather than Bun: Bun on Windows does not hand
// Chrome the extra file descriptors its `--remote-debugging-pipe` handshake
// needs, so every launch times out. Node has no `--env-file` equivalent of
// Bun's, so the monorepo's single env file is loaded here instead.
if (!process.env.DB_URL && existsSync('.env.local')) process.loadEnvFile('.env.local');

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3102);
export const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

// The acceptance suite asserts product behaviour — role-scoped navigation, the
// shared table/card shell, and the preference surfaces — rather than the
// framework migration that `playwright.najm-upgrade.config.ts` covers. The two
// suites share a directory and are kept apart by `testMatch`.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /\.acceptance\.spec\.ts$/,
  globalTeardown: './tests/e2e/support/globalTeardown.ts',
  // The suite provisions deterministic fixture users in the shared database, so
  // the specs cannot be spread across parallel workers.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI
    ? [['line'], ['html', { outputFolder: 'playwright-report/acceptance', open: 'never' }]]
    : 'line',
  outputDir: 'test-results/acceptance',
  use: {
    ...devices['Desktop Chrome'],
    // Playwright's default headless browser is `chrome-headless-shell`, whose
    // CDP handshake never completes on some Windows machines — every launch
    // then fails with a bare timeout. The `chromium` channel runs the same
    // downloaded build in its normal headless mode and starts reliably.
    // `PLAYWRIGHT_CHANNEL=chrome` switches to a locally installed Chrome.
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chromium',
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `bun run start -- -p ${port}`,
        url: `${baseURL}/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          ...process.env,
          NEXT_PUBLIC_APP_URL: baseURL,
          FRONTEND_URL: baseURL,
          CORS_ORIGIN: baseURL,
          NAJM_AUTH_INTERNAL_URL: `${baseURL}/api/auth/session/recover`,
          // Najm Auth ships an 8-per-10-minutes login limit, and this suite
          // signs in once per test because its refresh tokens are single-use
          // and cannot be shared between sessions. Without a raised limit the
          // run reports 429s rather than test results. A server started outside
          // the suite needs this set on its own environment.
          NAJM_AUTH_LOGIN_RATE_LIMIT: process.env.NAJM_AUTH_LOGIN_RATE_LIMIT ?? '200',
        },
      },
});
