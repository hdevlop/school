// Documents outside the shell with the origin process stopped and browser
// connectivity on: branded offline page, never the shell or a browser error.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { createOfflineProfile } from './offline-profile.mjs';
import { recordedOfflineLanguage } from './offline-language.mjs';
import { waitForOfflineCondition } from './wait-offline-condition.mjs';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const artifacts = resolve(appRoot, '../../.cache');
const manifest = JSON.parse(await readFile(resolve(appRoot, 'public/offline-shell/manifest.json'), 'utf8'));
const UNLISTED = ['/', '/welcome', '/login', '/register', '/forgot-password', '/reset-password?token=fixture', '/change-password',
  '/public-page', '/academic-year-migration', '/some/unlisted/page?x=1'];
let failed = false;
for (const name of (process.env.OFFLINE_BROWSERS ?? 'chromium').split(',')) {
  const child = spawn('bun', ['scripts/offline-fixture.mjs'], { cwd: appRoot, stdio: ['ignore', 'pipe', 'inherit'] });
  const exited = new Promise(resolve => child.once('exit', resolve));
  let context;
  try {
    const origin = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(new Error('Fixture startup timed out')); }, 15000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.stdout.once('data', chunk => { clearTimeout(timer); resolve(chunk.toString().trim()); });
    });
    const profile = await createOfflineProfile(artifacts, `offline-fallback-${name}-`, name);
    context = await ({ chromium, firefox, webkit })[name].launchPersistentContext(profile, { headless: true });
    const errors = [];
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + 'fixture.html');
    await page.evaluate(async () => {
      localStorage.setItem('school.offline-shell.v1', JSON.stringify({ version: 1, accountId: 'fallback-fixture', role: 'admin', expiresAt: Date.now() + 3600000,
        routes: [{ href: '/home', label: 'Home' }, { href: '/students', label: 'Students' }],
        ui: { app: { appName: 'MyScolAI' }, preferences: { language: 'en', theme: 'light', timeZone: 'Africa/Casablanca' }, appearance: { designConfig: {} }, branding: {} } }));
      await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await waitForOfflineCondition(page, async version => {
      const worker = navigator.serviceWorker.controller;
      if (!worker) return false;
      return new Promise(resolve => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => resolve(false), 2000);
        channel.port1.onmessage = event => { clearTimeout(timer); resolve(event.data.cacheVersion === version && event.data.ready === true); };
        worker.postMessage({ type: 'NAJM_PWA_STATUS', protocol: 1, cacheId: 'myscolai-shell' }, [channel.port2]);
      });
    }, manifest.version);
    // Online, unlisted documents keep their responses, redirects and downloads.
    assert.equal((await page.goto(origin + 'login')).status(), 200);
    await page.getByRole('heading', { name: 'Online /login', exact: true }).waitFor();
    assert.equal((await page.goto(origin + 'missing-page')).status(), 404);
    await page.goto(origin + 'students');
    assert.equal(new URL(page.url()).pathname, '/login');
    const download = page.waitForEvent('download');
    await page.goto(origin + 'download.csv').catch(error => { if (!/download|aborted|cancel/i.test(error.message)) throw error; });
    assert.equal((await download).suggestedFilename(), 'export.csv');
    child.kill();
    await exited;
    await assert.rejects(fetch(origin + 'api/health/status'), 'The server must actually be stopped');
    // French, Arabic and English stacked, led by the language the app last
    // displayed: French until one is recorded, then the shell's English.
    const ORDER = { fr: ['fr:ltr', 'ar:rtl', 'en:ltr'], en: ['en:ltr', 'fr:ltr', 'ar:rtl'] };
    const branded = async (path, lead = 'fr') => {
      const response = await page.goto(origin + path.slice(1));
      assert.equal(response.status(), 503, path);
      await page.getByRole('heading', { name: 'MyScolAI is offline', exact: true }).waitFor();
      assert.deepEqual(await page.locator('main > section').evaluateAll(sections => sections.map(section => section.lang + ':' + section.dir)), ORDER[lead], path);
      assert.equal(await page.locator('html').getAttribute('lang'), lead, path);
      assert.equal(await page.locator('meta[name="school-shell-version"]').count(), 0, path + ' must not get the shell');
    };
    for (const path of UNLISTED) await branded(path);
    await page.reload();
    await page.getByRole('heading', { name: 'MyScolAI est hors ligne', exact: true }).waitFor();
    for (const path of ['/home', '/students/fixture-id']) {
      await page.goto(origin + path.slice(1));
      await page.getByText('School data is not available offline yet.', { exact: false }).waitFor();
    }
    // The shell records the language it displays (its prepared record's English).
    await waitForOfflineCondition(page, recordedOfflineLanguage, 'en');
    // One failed browser navigation per page: in a worker-controlled Chromium
    // context, closing a page after two browser error pages never settles.
    const excluded = await context.newPage();
    try { await assert.rejects(excluded.goto(origin + 'api/health/status', { timeout: 8000 })); } finally { await excluded.close(); }
    // An evicted shell changes nothing for unlisted pages; listed ones get the branded page too.
    await page.evaluate(async ({ version, document }) => (await caches.open('najm-pwa:myscolai-shell:' + version)).delete(document), manifest);
    await branded('/welcome', 'en');
    await branded('/home', 'en');
    assert.deepEqual(errors, []);
    console.log(`${name}: PASS ${UNLISTED.length} unlisted documents show the branded offline page with the server stopped (and on reload), listed routes keep the shell, /api stays a browser error, an evicted shell falls back to the branded page, French/Arabic/English stacked and led by the language the app last displayed, online 200/404/auth redirect/download unchanged`);
  } catch (error) {
    failed = true;
    console.error(`${name}: FAIL`, error.stack);
  } finally {
    await context?.close();
    if (child.exitCode === null) child.kill();
  }
}
if (failed) process.exitCode = 1;
