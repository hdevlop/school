// Built shell + real worker, without a School database or account.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { createOfflineProfile } from './offline-profile.mjs';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const child = spawn('bun', ['scripts/offline-fixture.mjs'], { cwd: appRoot, stdio: ['ignore', 'pipe', 'inherit'] });
try {
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Fixture startup timed out')), 15000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.stdout.once('data', data => { clearTimeout(timer); resolve(data.toString().trim()); });
  });
  const control = async options => {
    const response = await fetch(new URL('recovery-control', origin), { method: 'POST', body: JSON.stringify(options), headers: { 'content-type': 'application/json' } });
    assert(response.ok);
  };
  for (const name of (process.env.OFFLINE_BROWSERS ?? 'chromium').split(',')) {
    const profile = await createOfflineProfile(resolve(appRoot, '../../.cache'), 'offline-recovery-', name);
    const context = await { chromium, firefox, webkit }[name].launchPersistentContext(profile, { headless: true });
    let page;
    const trace = [];
    try {
      page = await context.newPage();
      page.setDefaultTimeout(40000);
      const started = Date.now();
      page.on('request', request => { if (['/home', '/api/health/status'].includes(new URL(request.url()).pathname)) trace.push({ ms: Date.now() - started, path: new URL(request.url()).pathname, navigation: request.isNavigationRequest() }); });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await control({ health: 503, page: 503 });
      await page.goto(new URL('fixture.html', origin).href);
      await page.evaluate(async () => {
        localStorage.setItem('school.offline-shell.v1', JSON.stringify({ version: 1, accountId: 'fixture', role: 'admin',
          academicYear: '2026-2027', expiresAt: Date.now() + 3600000, routes: [{ href: '/home', label: 'Home' }],
          ui: { app: { appName: 'MyScolAI' }, preferences: { language: 'en', theme: 'light', timeZone: 'Africa/Casablanca' }, appearance: { designConfig: {} }, branding: {} } }));
        await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      });
      await context.setOffline(true);
      await page.goto(new URL('home', origin).href);
      await page.getByRole('link', { name: 'Try online' }).waitFor();
      const isShell = () => page.locator('meta[name="school-shell-version"]').count();
      const failedHealth = page.waitForResponse(response => response.url().endsWith('/api/health/status') && response.status() === 503);
      await context.setOffline(false);
      await failedHealth;
      assert.equal(await page.evaluate(() => navigator.onLine), true);
      assert.equal(await isShell(), 1, 'Wi-Fi alone must not trigger navigation');

      await control({ health: 200, page: 503 });
      const failedPage = page.waitForResponse(response => response.url() === new URL('home', origin).href && response.status() === 503);
      await page.evaluate(() => dispatchEvent(new Event('online')));
      await failedPage;
      assert.equal(await isShell(), 1, 'Healthy API alone must not trigger navigation');

      // A page can stay slow after health recovers. Its bounded probe must fail
      // without making the browser repeat its ten-second navigation fallback.
      await control({ health: 200, page: 200, delay: 12000 });
      const slowPage = page.waitForEvent('requestfailed', { predicate: request => request.url() === new URL('home', origin).href });
      await page.evaluate(() => dispatchEvent(new Event('focus')));
      await slowPage;
      assert.equal(await isShell(), 1, 'Slow route must retain the offline view');

      // Open work is preserved even after the actual page recovers.
      await page.evaluate(() => {
        const form = document.createElement('form'); form.id = 'recovery-draft';
        form.innerHTML = '<input aria-label="Recovery draft" value="keep me">'; document.body.append(form);
      });
      await control({ health: 200, page: 200 });
      await page.evaluate(() => dispatchEvent(new Event('online')));
      await page.waitForTimeout(500);
      assert.equal(await isShell(), 1);
      assert.equal(await page.getByLabel('Recovery draft').inputValue(), 'keep me');
      await page.evaluate(() => { document.getElementById('recovery-draft').remove(); dispatchEvent(new Event('focus')); });
      await page.getByRole('heading', { name: 'Live School page' }).waitFor();
      assert.equal(await isShell(), 0, 'Recovery must leave the offline shell without a click');

      // If navigation stalls after a successful probe, bound automatic retries
      // across the resulting new shell document as well as within this one.
      await control({ health: 200, page: 200, navigationDelay: 12000 });
      await context.setOffline(true);
      await page.goto(new URL('home', origin).href);
      await page.getByRole('link', { name: 'Try online' }).waitFor();
      await page.evaluate(() => sessionStorage.removeItem('school.offline-return.v1'));
      let navigations = 0;
      page.on('request', request => { if (request.isNavigationRequest()) navigations++; });
      await context.setOffline(false);
      await page.waitForEvent('framenavigated', { predicate: frame => frame === page.mainFrame() });
      await page.getByRole('link', { name: 'Try online' }).waitFor();
      await page.evaluate(() => { dispatchEvent(new Event('focus')); dispatchEvent(new Event('online')); });
      await page.waitForTimeout(500);
      assert.equal(navigations, 1, 'No immediate reload loop after the worker falls back again');

      await context.setOffline(true);
      await page.evaluate(() => { localStorage.removeItem('school.offline-shell.v1'); sessionStorage.removeItem('school.offline-return.v1'); });
      await page.reload();
      await page.locator('[data-school-offline-unprepared]').waitFor();
      await control({ health: 200, page: 200 });
      await context.setOffline(false);
      await page.getByRole('heading', { name: 'Live School page' }).waitFor();
      assert.equal(await isShell(), 0, 'An unprepared device must recover too');
      assert.deepEqual(errors, []);
      console.log(`${name}: PASS network/API/slow-page checks, draft protection, automatic live-page recovery, reload cooldown and unprepared-device recovery`);
    } catch (error) {
      console.error(name, 'recovery diagnostic', trace, await page?.evaluate(() => ({ url: location.href, online: navigator.onLine,
        visibility: document.visibilityState, cooldown: sessionStorage.getItem('school.offline-return.v1'),
        shell: !!document.querySelector('meta[name="school-shell-version"]') })).catch(() => null));
      await page?.screenshot({ path: resolve(appRoot, '../../.cache', `offline-recovery-${name}-failure.png`) }).catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
} finally { child.kill(); }
