// Opt-in local database acceptance. Uses an existing account; never seeds records.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, open } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { waitForOfflineCondition } from './wait-offline-condition.mjs';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(appRoot, '../..');
process.loadEnvFile(resolve(appRoot, '.env.local'));
await mkdir(resolve(root, '.cache'), { recursive: true });
const credentials = { email: process.env.OFFLINE_SESSION_EMAIL || process.env.ADMIN_EMAIL,
  password: process.env.OFFLINE_SESSION_PASSWORD || process.env.ADMIN_PASSWORD };
assert(credentials.email && credentials.password && credentials.password !== 'replace-before-any-shared-environment',
  'Set OFFLINE_SESSION_EMAIL and OFFLINE_SESSION_PASSWORD to an existing local account, or configure ADMIN_EMAIL/ADMIN_PASSWORD in .env.local. This test never seeds an account.');
const profile = await mkdtemp(resolve(root, '.cache/offline-review-session-'));
const socket = createServer();
await new Promise(done => socket.listen(0, '127.0.0.1', done));
const port = socket.address().port;
await new Promise(done => socket.close(() => done()));
const origin = `http://127.0.0.1:${port}/`;
const log = await open(resolve(root, '.cache/offline-session-next.log'), 'w');
const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
  cwd: appRoot, env: { ...process.env, NODE_ENV: 'production', NAJM_NEXT_DIST_DIR: process.env.NAJM_NEXT_DIST_DIR || '.next',
    NAJM_AUTH_INTERNAL_URL: origin + 'api/auth/session/recover', FRONTEND_URL: origin.slice(0, -1) }, stdio: ['ignore', log.fd, log.fd],
});
let context;
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(origin + 'api/health/status', { signal: AbortSignal.timeout(1000) })).ok) break; } catch {}
    if (attempt === 99) throw new Error('Production startup failed');
    await new Promise(done => setTimeout(done, 250));
  }
  context = await chromium.launchPersistentContext(profile, { headless: true });
  // Authenticate through REST before any application document is opened.
  const login = await context.request.post(origin + 'api/auth/login', {
    data: credentials,
  });
  assert.equal(login.status(), 200, 'Existing local admin must authenticate');
  const signedIn = await context.storageState();
  console.log('REST session cookie names:', signedIn.cookies.map(cookie => cookie.name).join(', '));
  await context.close();
  context = await chromium.launchPersistentContext(profile, { headless: true });
  // Restore the same live session, including any session-only cookie that a
  // headless browser intentionally discards on process exit.
  await context.addCookies(signedIn.cookies);
  const page = await context.newPage();
  let loginNavigations = 0;
  page.on('request', request => { if (request.isNavigationRequest() && new URL(request.url()).pathname === '/login') loginNavigations++; });
  await page.addInitScript(() => {
    window.__preparationNotices = [];
    window.__manifestAttempts = 0;
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (new URL(url, location.href).pathname === '/offline-shell/manifest.json'
        && ++window.__manifestAttempts === 1) return Promise.reject(new TypeError('Injected transient preparation outage'));
      return originalFetch(input, init);
    };
    new MutationObserver(() => {
      const text = document.querySelector('[data-school-offline-status]')?.textContent;
      if (text) window.__preparationNotices.push(text);
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  // A transient foreground preparation failure must recover without Retry UI.
  await page.goto(origin + 'home');
  await page.waitForFunction(() => !!JSON.parse(localStorage.getItem('school.offline-shell.v1') ?? 'null')?.accountId, null, { timeout: 30000 }).catch(async error => {
    console.log('Preparation failure:', { path: new URL(page.url()).pathname, loginNavigations,
      worker: await page.evaluate(() => navigator.serviceWorker.controller?.state), cookieNames: (await context.cookies()).map(cookie => cookie.name) });
    throw error;
  });
  await waitForOfflineCondition(page, async () => {
    const worker = navigator.serviceWorker.controller;
    if (!worker || worker.state !== 'activated') return false;
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const finish = value => { clearTimeout(timer); channel.port1.close(); channel.port2.close(); resolve(value); };
      const timer = setTimeout(() => finish(false), 3000);
      channel.port1.onmessage = event => finish(event.data.protocol === 1 && event.data.cacheId === 'myscolai-shell' && event.data.ready === true);
      worker.postMessage({ type: 'NAJM_PWA_STATUS', protocol: 1, cacheId: 'myscolai-shell' }, [channel.port2]);
    });
  }, null, { timeout: 45000 });
  await page.waitForFunction(() => Object.keys(localStorage).some(key => key.startsWith('school.shell.pin:')), null, { timeout: 30000 });
  await page.waitForFunction(() => window.__manifestAttempts >= 2, null, { timeout: 30000 });
  assert.equal(loginNavigations, 0, 'Already signed-in launch must never visit /login');
  assert.deepEqual(await page.evaluate(() => window.__preparationNotices), []);
  // Signed-in preparation also stores the role (sidebar layout) and the API-served sidebar logos.
  const logoUrls = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('school.offline-shell.v1'));
    if (typeof stored.role !== 'string') throw new Error('Prepared display metadata has no role');
    const slots = stored.ui.branding?.slots ?? {};
    return ['sidebarLogoExpanded', 'sidebarLogoCollapsed'].map(slot => slots[slot]).filter(Boolean).map(path => new URL(path, location.href).href);
  });
  assert(logoUrls.length, 'The school resolves no sidebar logo to store');
  await waitForOfflineCondition(page, async urls => {
    const cache = await caches.open('school-offline-branding');
    return (await Promise.all(urls.map(url => cache.match(url)))).every(Boolean);
  }, logoUrls);
  const stopped = once(server, 'exit'); server.kill(); await stopped;
  await assert.rejects(fetch(origin + 'api/health/status'));
  await page.reload();
  await page.locator('meta[name="school-shell-version"]').waitFor({ state: 'attached' });
  await page.locator('main > section').waitFor();
  const sidebar = await page.evaluate(async () => ({
    icons: document.querySelectorAll('a svg').length,
    logos: await Promise.all([...document.querySelectorAll('img')].filter(image => image.getClientRects().length && image.getAttribute('src')?.startsWith('blob:'))
      .map(async image => { await image.decode().catch(() => undefined); return image.naturalWidth; })),
  }));
  assert(sidebar.icons > 0, 'The stopped-server shell sidebar must show feature icons');
  assert(sidebar.logos.length && sidebar.logos.every(Boolean), 'The stopped-server shell must show the stored sidebar logo');
  await context.close();
  context = await chromium.launchPersistentContext(profile, { headless: true });
  const reopened = await context.newPage();
  await reopened.goto(origin + 'home');
  await reopened.locator('meta[name="school-shell-version"]').waitFor({ state: 'attached' });
  await reopened.locator('main > section').waitFor();
  await reopened.screenshot({ path: resolve(root, '.cache/offline-review-existing-session.png') });
  console.log('PASS existing authenticated profile, direct /home, zero login navigation, zero preparation notices, automatic transient retry, stored role and sidebar logos, stopped-server reload with icons and logo, fresh-process reopen. No school-record mutations.');
} finally {
  await context?.close();
  if (server.exitCode === null) server.kill();
  await log.close();
}
