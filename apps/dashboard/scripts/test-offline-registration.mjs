// Exercise the actual production layout's automatic registration/update client.
// Previous harnesses registered the new worker manually and missed this path.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { recordedOfflineLanguage } from './offline-language.mjs';
import { waitForOfflineCondition } from './wait-offline-condition.mjs';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const artifacts = resolve(appRoot, '../../.cache');
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(resolve(artifacts, 'offline-registration-'));
let fixture = spawn('bun', ['scripts/offline-fixture.mjs'], { cwd: appRoot, stdio: ['ignore', 'pipe', 'inherit'] });
let server;
let context;
const log = await open(resolve(artifacts, 'offline-registration-next.log'), 'w');
try {
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Fixture startup timeout')), 15000);
    fixture.once('error', reject);
    fixture.stdout.once('data', data => { clearTimeout(timer); resolve(data.toString().trim()); });
  });
  const port = new URL(origin).port;
  context = await chromium.launchPersistentContext(profile, { headless: true });
  let page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(20000);
  await page.goto(origin + 'fixture.html');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw-legacy.js');
    await navigator.serviceWorker.ready;
    localStorage.setItem('school.offline-shell.v1', JSON.stringify({ version: 1, accountId: 'registration-fixture',
      expiresAt: Date.now() + 3600000, routes: [{ href: '/home', label: 'Home' }],
      ui: { app: { appName: 'MyScolAI' }, preferences: { language: 'en', theme: 'light', timeZone: 'Africa/Casablanca' }, appearance: { designConfig: {} }, branding: {} },
    }));
  });
  await page.reload();
  const fixtureExited = once(fixture, 'exit'); fixture.kill(); await fixtureExited; fixture = null;
  server = spawn(process.execPath, [resolve(appRoot, '../../node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', port], {
    cwd: appRoot, stdio: ['ignore', log.fd, log.fd],
  });
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch(origin + 'login', { signal: AbortSignal.timeout(1000) })).ok) break; }
    catch { /* Server starting. */ }
    if (attempt === 79) throw new Error('Next production server did not start');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  // No manual registration of /sw.js: the actual application must do it.
  await page.goto(origin + 'login');
  // A silent/slow controller is not proof of a legacy build. Every waiting
  // update uses the explicit action (or natural activation after clients close).
  await page.locator('[data-school-offline-action="update"]').click({ timeout: 30000 });
  await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('/sw.js'), null, { timeout: 30000 }).catch(async error => {
    console.error('Registration state:', await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return { active: r?.active?.scriptURL, waiting: r?.waiting?.scriptURL, installing: r?.installing?.state,
        status: document.querySelector('[data-school-offline-status]')?.textContent };
    }));
    throw error;
  });
  await page.locator('[data-school-offline-action="update"]').waitFor({ state: 'hidden' });
  // Inspect the real worker protocol, without a product status or test hook.
  await waitForOfflineCondition(page, async () => {
    const worker = navigator.serviceWorker.controller;
    if (!worker || worker.state !== 'activated') return false;
    const manifest = await (await fetch('/offline-shell/manifest.json')).json();
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const finish = value => { clearTimeout(timer); channel.port1.close(); channel.port2.close(); resolve(value); };
      const timer = setTimeout(() => finish(false), 2000);
      channel.port1.onmessage = event => finish(navigator.serviceWorker.controller === worker && event.data.protocol === 1
        && event.data.cacheId === 'myscolai-shell' && event.data.cacheVersion === manifest.version && event.data.ready === true);
      worker.postMessage({ type: 'NAJM_PWA_STATUS', protocol: 1, cacheId: 'myscolai-shell' }, [channel.port2]);
    });
  }).catch(async error => {
    console.error('After activation:', await page.evaluate(async () => ({
      controller: navigator.serviceWorker.controller?.state,
      status: document.querySelector('[data-school-offline-status]')?.textContent,
      caches: await caches.keys(),
    })));
    throw error;
  });
  assert.equal(await page.locator('[data-school-offline-status]').count(), 0, 'Preparation must be silent');
  assert(await page.evaluate(() => !!JSON.parse(localStorage.getItem('school.offline-shell.v1'))?.accountId));
  const initialPins = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('school.shell.pin:')).length);
  await page.evaluate(async () => {
    const { version } = await (await fetch('/offline-shell/manifest.json')).json();
    const key = 'school.shell.preparation-budget:' + version;
    const budget = JSON.parse(localStorage.getItem(key));
    if (!budget?.cohort) throw new Error('Preparation cohort is missing');
    localStorage.setItem(key, JSON.stringify({ ...budget, attempts: 3 }));
  });
  const peer = await context.newPage();
  await peer.goto(origin + 'login');
  await peer.waitForFunction(count => Object.keys(localStorage).filter(key => key.startsWith('school.shell.pin:')).length > count, initialPins);
  // A byte-identical staged update at a new public worker URL exercises the
  // consent client in a tab whose School preparation budget is exhausted.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.register('/sw.js?exhausted-budget-proof=1');
    if (!registration.waiting) await new Promise((resolve, reject) => {
      const worker = registration.installing;
      if (!worker) return reject(new Error('Expected a new worker'));
      const check = () => {
        if (worker.state === 'installed') resolve();
        if (worker.state === 'redundant') reject(new Error('Staged lifecycle worker failed'));
      };
      worker.addEventListener('statechange', check); check();
    });
  });
  await peer.locator('[data-school-offline-action="update"]').click({ timeout: 30000 });
  await peer.locator('[data-school-offline-action="update"]').waitFor({ state: 'hidden' });
  assert.equal(await peer.evaluate(async () => {
    const { version } = await (await fetch('/offline-shell/manifest.json')).json();
    return JSON.parse(localStorage.getItem('school.shell.preparation-budget:' + version)).attempts;
  }), 3, 'Connecting update handling must not spend/reset the exhausted budget');
  await page.close();
  page = peer;
  // The worker keeps Next's real sign-in redirect for a protected document.
  const probe = await context.newPage();
  await probe.goto(origin + 'students');
  assert.equal(new URL(probe.url()).pathname, '/login', 'A signed-out protected page must keep its sign-in redirect');
  // Signed in or not, the online app records the language it displays for the offline page.
  await waitForOfflineCondition(probe, recordedOfflineLanguage, await probe.evaluate(() => document.documentElement.lang));
  await probe.close();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const serverExited = once(server, 'exit'); server.kill(); await serverExited; server = null;
  await assert.rejects(fetch(origin + 'api/health/status'));
  assert.equal(await page.evaluate(() => navigator.onLine), true);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    const link = document.createElement('a'); link.href = '/home'; link.textContent = 'Offline lifecycle link'; document.body.append(link);
    document.addEventListener('click', event => { event.preventDefault(); }, { once: true });
  });
  await page.getByRole('link', { name: 'Offline lifecycle link', exact: true }).click();
  await page.getByRole('heading', { name: 'Home', exact: true }).waitFor();
  await page.getByText('School data is not available offline yet.', { exact: false }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: 'Home', exact: true }).waitFor();
  // Pages outside the shell get the branded offline page, not a browser error.
  for (const path of ['login', 'welcome', 'forgot-password', 'academic-year-migration', 'some/unlisted/page']) {
    assert.equal((await page.goto(origin + path)).status(), 503, path);
    await page.getByRole('heading', { name: 'MyScolAI is offline', exact: true }).waitFor();
    // Stacked, led by the shell's English: the language the app displayed last.
    assert.deepEqual(await page.locator('main > section').evaluateAll(sections => sections.map(section => section.lang)), ['en', 'fr', 'ar'], path);
  }
  assert.deepEqual(errors, []);
  await page.screenshot({ path: resolve(artifacts, 'offline-real-registration.png') });
  console.log('PASS actual Next login: explicit update consent, silent preparation, exhausted-budget peer still pins and activates updates, offline capture handler survives the limit, stopped-server /home launch/reload, real sign-in redirect kept, the displayed language recorded, branded page for unlisted documents led by the last displayed language. Synthetic display metadata only.');
} finally {
  await context?.close(); fixture?.kill(); server?.kill(); await log.close();
}
