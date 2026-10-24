// Regression for an existing inline-fallback worker and a genuinely stopped
// server. The shutdown proof uses a connected browser, without offline emulation.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { createOfflineProfile } from './offline-profile.mjs';
import { waitForOfflineCondition } from './wait-offline-condition.mjs';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const artifacts = resolve(appRoot, '../../.cache');
await mkdir(artifacts, { recursive: true });
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
    const engine = ({ chromium, firefox, webkit })[name];
    const profile = await createOfflineProfile(artifacts, `offline-startup-${name}-`, name);
    context = await engine.launchPersistentContext(profile, { headless: true });
    let page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(origin + 'fixture.html');
    await page.evaluate(async () => {
      localStorage.setItem('school.offline-shell.v1', JSON.stringify({ version: 1, accountId: 'startup-fixture',
        expiresAt: Date.now() + 3600000, routes: [{ href: '/home', label: 'Home' }, { href: '/students', label: 'Students' }],
        ui: { app: { appName: 'MyScolAI' }, preferences: { language: 'en', theme: 'light', timeZone: 'Africa/Casablanca' }, appearance: { designConfig: {} }, branding: {} },
      }));
      const registration = await navigator.serviceWorker.register('/sw-legacy.js');
      // A deployed legacy worker finished activating long ago. `ready` resolves
      // while it is still activating, and a reload then leaves WebKit's
      // clients.claim() pending, so wait for the state real devices start from.
      await Promise.race([navigator.serviceWorker.ready.then(() => new Promise(resolve => {
        const worker = registration.active;
        const check = () => { if (worker.state === 'activated') resolve(); };
        worker.addEventListener('statechange', check);
        check();
      })), new Promise((_, reject) => setTimeout(() => reject(new Error('Legacy worker not activated')), 15000))]);
    });
    await page.reload();
    await waitForOfflineCondition(page, async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated');
    if (name === 'chromium') {
      // Firefox's context offline emulation does not disconnect worker fetches.
      // The later actual process shutdown exercises every engine without it.
      await context.setOffline(true);
      await page.goto(origin + 'home');
      await page.getByRole('heading', { name: 'MyScolAI is offline', exact: true }).waitFor();
      await context.setOffline(false);
      await page.goto(origin + 'fixture.html');
    }
    // Reopen the online application before preparing the first shell upgrade.
    await context.close();
    context = await engine.launchPersistentContext(profile, { headless: true });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(origin + 'fixture.html');
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      if (!registration.waiting) await new Promise((resolve, reject) => {
        const worker = registration.installing;
        if (!worker) return reject(new Error('New worker did not install'));
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') resolve();
          if (worker.state === 'redundant') reject(new Error('Shell precache failed'));
        });
      });
      if (!registration.waiting) throw new Error('Expected a staged worker behind the legacy client');
      for (const name of ['pinned', 'crashed', 'old-1', 'old-2', 'keep-1', 'keep-2']) await caches.open('najm-pwa:myscolai-shell:startup-' + name);
      await caches.open('najm-pwa:myscolai-shell:startup-staging:install:proof');
      localStorage.setItem('school.shell.pin:simulated-suspended-tab', 'startup-pinned');
      // Its tab never takes the lock, as after a crash: the pin is reclaimable.
      localStorage.setItem('school.shell.pin:simulated-crashed-tab', 'startup-crashed');
    });
    // An old fallback has no update-consent client. Closing all old application
    // windows lets the browser activate normally, without deleting stored work.
    await context.close();
    context = await engine.launchPersistentContext(profile, { headless: true });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(20000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + 'fixture.html');
    await waitForOfflineCondition(page, async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration?.active?.state === 'activated' && new URL(registration.active.scriptURL).pathname === '/sw.js';
    });
    // Firefox can leave the first fixture document uncontrolled after a
    // restart. Prove the active worker's complete assets before shutdown,
    // then require the new offline navigation to receive that worker's control.
    await waitForOfflineCondition(page, async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const worker = registration?.active;
      const manifest = await (await fetch('/offline-shell/manifest.json', { cache: 'no-store' })).json();
      if (!worker || worker.state !== 'activated' || !worker.scriptURL.endsWith('/sw.js')) return false;
      return new Promise(resolve => {
        const channel = new MessageChannel();
        const finish = value => { clearTimeout(timer); channel.port1.close(); channel.port2.close(); resolve(value); };
        const timer = setTimeout(() => finish(false), 2000);
        channel.port1.onmessage = event => finish(registration.active === worker && event.data.protocol === 1
          && event.data.cacheId === 'myscolai-shell' && event.data.cacheVersion === manifest.version && event.data.ready === true);
        worker.postMessage({ type: 'NAJM_PWA_STATUS', protocol: 1, cacheId: 'myscolai-shell' }, [channel.port2]);
      });
    }, null, { timeout: 30000 }).catch(async error => {
      console.error('Startup controller diagnostics:', await page.evaluate(async () => {
        const worker = navigator.serviceWorker.controller;
        const registration = await navigator.serviceWorker.getRegistration();
        const status = worker && await new Promise(resolve => {
          const channel = new MessageChannel();
          const timer = setTimeout(() => { channel.port1.close(); resolve('no-reply'); }, 2000);
          channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
          worker.postMessage({ type: 'NAJM_PWA_STATUS', protocol: 1, cacheId: 'myscolai-shell' }, [channel.port2]);
        });
        return { controller: worker?.scriptURL, state: worker?.state, active: registration?.active?.scriptURL,
          activeState: registration?.active?.state, same: worker === registration?.active, status, caches: await caches.keys() };
      }));
      throw error;
    });
    // A suspended tab is still running and keeps its pin's lock.
    const suspended = await context.newPage();
    await suspended.goto(origin + 'fixture.html');
    await suspended.evaluate(() => new Promise(granted => {
      navigator.locks.request('school.shell.pin:simulated-suspended-tab', () => { granted(); return new Promise(() => {}); });
    }));
    child.kill();
    await exited;
    await assert.rejects(fetch(origin + 'api/health/status'), 'The server must actually be stopped');
    assert.equal(await page.evaluate(() => navigator.onLine), true, 'The browser still has network connectivity');
    await page.goto(origin + 'home');
    await page.getByRole('heading', { name: 'Home', exact: true }).waitFor();
    await waitForOfflineCondition(page, async () => {
      const worker = navigator.serviceWorker.controller;
      const registration = await navigator.serviceWorker.getRegistration();
      if (!worker || worker !== registration?.active || worker.state !== 'activated') return false;
      const version = document.querySelector('meta[name="school-shell-version"]')?.content;
      return new Promise(resolve => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 2000);
        channel.port1.onmessage = event => {
          clearTimeout(timer); channel.port1.close();
          resolve(navigator.serviceWorker.controller === worker && event.data.protocol === 1
            && event.data.cacheId === 'myscolai-shell' && event.data.cacheVersion === version && event.data.ready === true);
        };
        worker.postMessage({ type: 'NAJM_PWA_STATUS', protocol: 1, cacheId: 'myscolai-shell' }, [channel.port2]);
      });
    });
    await page.getByText('School data is not available offline yet.', { exact: false }).waitFor();
    let remaining = [];
    for (let attempt = 0; attempt < 100; attempt++) {
      remaining = await page.evaluate(() => caches.keys());
      if (!remaining.some(name => /:startup-(old-[12]|crashed)$/.test(name))) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert(!remaining.some(name => /:startup-old-[12]$/.test(name)), 'Natural-activation startup must prune old unpinned caches');
    assert(!remaining.includes('najm-pwa:myscolai-shell:startup-crashed'), 'A pin whose tab no longer holds its lock must be reclaimed');
    assert.equal(await page.evaluate(() => localStorage.getItem('school.shell.pin:simulated-crashed-tab')), null, 'The crashed tab pin must be removed');
    for (const name of ['startup-pinned', 'startup-keep-1', 'startup-keep-2', 'startup-staging:install:proof']) {
      assert(remaining.includes('najm-pwa:myscolai-shell:' + name), 'Protected cache removed: ' + name);
    }
    await suspended.close();
    await page.reload();
    await page.getByRole('heading', { name: 'Home', exact: true }).waitFor();
    await page.getByRole('link', { name: 'Students', exact: true }).click();
    await page.getByRole('heading', { name: 'Students', exact: true }).waitFor();
    for (const path of ['/reports', '/aging', '/settings', '/preferences', '/transport', '/drivers', '/visit-requests', '/attendance/teachers']) {
      await page.goto(new URL(path, origin).href);
      await page.getByText('This page is not available offline.', { exact: true }).waitFor();
      assert.equal(await page.locator('meta[name="school-shell-version"]').count(), 1, path + ' must use the cached app');
    }
    assert.deepEqual(errors, []);
    await page.screenshot({ path: resolve(artifacts, `offline-stopped-server-${name}.png`) });
    console.log(`${name}: PASS natural legacy activation, startup cache pruning with live-pin/recent/staging retention and crashed-pin reclamation, actual stopped-server /home launch/reload/navigation and eight unavailable routes with navigator.onLine=true`);
  } finally {
    await context?.close();
    if (child.exitCode === null) child.kill();
  }
}
