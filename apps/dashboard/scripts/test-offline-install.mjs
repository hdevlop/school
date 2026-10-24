// Exercise the actual staged worker with one absent asset and HTTP caching on.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { waitForOfflineCondition } from './wait-offline-condition.mjs';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const artifacts = resolve(appRoot, '../../.cache');
await mkdir(artifacts, { recursive: true });
const child = spawn('bun', ['scripts/offline-fixture.mjs'], { cwd: appRoot, env: { ...process.env, OFFLINE_MISSING_ASSET: '1' }, stdio: ['ignore', 'pipe', 'inherit'] });
let context;
try {
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Fixture startup timed out')); }, 15000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.stdout.once('data', chunk => { clearTimeout(timer); resolve(chunk.toString().trim()); });
  });
  const profile = await mkdtemp(resolve(artifacts, 'offline-install-'));
  let statsRead = 0;
  const readStats = async () => (await fetch(origin + 'install-stats?read=' + ++statsRead, { cache: 'no-store' })).json();
  context = await chromium.launchPersistentContext(profile, { headless: true });
  const start = async (page, version = 'broken-version', { navigate = true, timeoutMs = 15000, failPreparation = false } = {}) => {
    if (navigate) await page.goto(origin + 'fixture.html');
    await page.evaluate(async ({ version, timeoutMs, failPreparation }) => {
      const { prepareSchoolShell, registerSchoolShell } = await import('/preparation-proof.js');
      const abort = new AbortController();
      window.__preparation = { attempts: 0, done: false, result: null };
      void prepareSchoolShell(version, async () => {
        window.__preparation.attempts++;
        if (failPreparation) throw new Error('Injected preparation validation failure');
        await registerSchoolShell(navigator.serviceWorker, timeoutMs, abort.signal);
      }, abort.signal).then(result => { window.__preparation.result = result; window.__preparation.done = true; });
    }, { version, timeoutMs, failPreparation });
  };
  const first = await context.newPage();
  const second = await context.newPage();
  await Promise.all([start(first), start(second)]);
  await Promise.all([first, second].map(page => page.waitForFunction(() => window.__preparation.done, null, { timeout: 60000 })));
  const counts = await Promise.all([first, second].map(page => page.evaluate(() => window.__preparation.attempts)));
  assert.equal(counts.reduce((sum, value) => sum + value, 0), 3, 'Tabs must share the three-attempt budget');
  const initialStats = await readStats();
  assert.equal(initialStats.missingRequests, 3);
  assert(!await first.evaluate(async () => {
    const names = await caches.keys();
    for (const name of names) {
      const cache = await caches.open(name);
      if ((await cache.keys()).some(request => request.url.includes('.najm-pwa-manifest/'))) return true;
    }
    return false;
  }), 'Incomplete installation must not publish readiness');
  await first.evaluate(() => dispatchEvent(new Event('online')));
  // A newly opened peer must not bypass an exhausted budget.
  const third = await context.newPage(); await start(third);
  await third.waitForFunction(() => window.__preparation.done);
  assert.equal(await third.evaluate(() => window.__preparation.attempts), 0);
  assert.equal((await readStats()).missingRequests, 3);
  // A new School budget key and a fresh app opening may retry School's calls,
  // but the worker's own budget is keyed by the real shell version: it refuses
  // to download that failed version again for a day.
  const next = await context.newPage(); await start(next, 'new-version');
  await next.waitForFunction(() => window.__preparation.done, null, { timeout: 60000 });
  assert.equal(await next.evaluate(() => window.__preparation.attempts), 3);
  assert.equal((await readStats()).missingRequests, 3, 'The worker must not download the failed version again');
  await context.close();
  context = await chromium.launchPersistentContext(profile, { headless: true });
  const reopened = await context.newPage(); await start(reopened);
  await reopened.waitForFunction(() => window.__preparation.done, null, { timeout: 60000 });
  assert.equal(await reopened.evaluate(() => window.__preparation.attempts), 3, 'A fresh app opening may retry');
  const finalStats = await readStats();
  assert.equal(finalStats.missingRequests, 3, 'A fresh app opening must not refill the worker budget');
  console.log('PASS missing asset: three School attempts shared across tabs; reconnect/new peer cannot reset; a new School key and a fresh opening retry School calls while the worker downloads the failed version only three times. Transfer counters:', JSON.stringify({ cacheControl: process.env.OFFLINE_ASSET_CACHE_CONTROL ?? 'immutable', firstOpening: initialStats, allScenarios: finalStats }));
  await context.close();
  const control = options => fetch(origin + 'install-control', { method: 'POST', body: JSON.stringify(options) });
  await control({ missing: false, delayMs: 2000 });
  const slowProfile = await mkdtemp(resolve(artifacts, 'offline-slow-install-'));
  context = await chromium.launchPersistentContext(slowProfile, { headless: true });
  const slow = await context.newPage();
  await start(slow, 'slow-version', { timeoutMs: 500 });
  await waitForOfflineCondition(slow, async () => !!(await navigator.serviceWorker.getRegistration())?.installing);
  await new Promise(resolve => setTimeout(resolve, 750));
  assert.deepEqual(await slow.evaluate(() => ({ attempts: window.__preparation.attempts, done: window.__preparation.done })), { attempts: 1, done: false });
  await slow.waitForFunction(() => window.__preparation.done, null, { timeout: 15000 });
  assert.equal(await slow.evaluate(() => window.__preparation.result), true);
  console.log('PASS slow asset download: live install survives the watchdog and completes in one School attempt.');
  await context.close();
  await control({ mode: 'legacy', missing: true, delayMs: 0 });
  const olderProfile = await mkdtemp(resolve(artifacts, 'offline-older-worker-'));
  context = await chromium.launchPersistentContext(olderProfile, { headless: true });
  const older = await context.newPage();
  await older.goto(origin + 'fixture.html');
  await older.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  });
  await older.reload();
  await older.waitForFunction(() => !!navigator.serviceWorker.controller);
  await older.evaluate(() => { window.__oldWorker = navigator.serviceWorker.controller; });
  const beforeOlder = await readStats();
  await control({ mode: 'shell' });
  // Exhaust School's scheduler deterministically. Repeated register() on an
  // existing worker may be throttled and return the old active registration
  // without starting an install; it is not three guaranteed download attempts.
  await start(older, 'older-worker-upgrade', { navigate: false, failPreparation: true });
  await older.waitForFunction(() => window.__preparation.done, null, { timeout: 60000 });
  assert.equal(await older.evaluate(() => window.__preparation.attempts), 3);
  const afterSchool = await readStats();
  // A browser-scheduled check from the earlier navigation may already have
  // run too. School made no register() calls in this phase; record it rather
  // than assuming the UA waits for our explicit update() below.
  assert(afterSchool.missingRequests >= beforeOlder.missingRequests);
  // Deterministic proxy for a UA update check: the existing registration can
  // attempt installation without invoking School's preparation loop again.
  // Najm's worker budget caps all of them, browser-scheduled ones included.
  for (let attempt = 0; attempt < 5; attempt++) {
    await older.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); }).catch(() => {});
    await waitForOfflineCondition(older, async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return !registration?.installing && !registration?.waiting;
    });
  }
  const afterBrowser = await readStats();
  console.log('Older-worker counters:', JSON.stringify({ beforeOlder, afterSchool, afterBrowser }));
  assert.equal(afterBrowser.missingRequests - beforeOlder.missingRequests, 3, 'Browser update checks download a broken version three times');
  assert.equal(await older.evaluate(() => window.__preparation.attempts), 3);
  assert.equal(await older.evaluate(() => navigator.serviceWorker.controller === window.__oldWorker), true);
  console.log('PASS older-worker regression: three injected School preparation failures exhaust its budget; five registration.update() checks download the broken version exactly three times and retain the old worker.', JSON.stringify({ beforeOlder, afterSchool, afterBrowser }));
} finally {
  await context?.close(); child.kill();
}
