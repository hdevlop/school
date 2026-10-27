// Opt-in production-browser rehearsal of SCHOOL_OFFLINE=off and back, against
// the marked history fixture restarted on one origin. No domain mutations.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { waitForOfflineCondition } from './wait-offline-condition.mjs';
import { createOfflineProfile } from './offline-profile.mjs';
import { fixtureClientHeaders, startOfflineReadFixture, inspectReadReplica, root } from './offline-read-fixture.mjs';
import { createOfflineBrowserErrorAudit } from './offline-browser-errors.mjs';
import { recordedOfflineLanguage } from './offline-language.mjs';

/** Both scopes downloaded and readable for the cached account. */
async function prepared() {
  const identity = JSON.parse(localStorage.getItem('school.offline-account.v1') ?? 'null');
  if (!identity?.accountId) return false;
  return new Promise(resolve => {
    const request = indexedDB.open(`school-read-v1:${identity.installationId}:${identity.accountId}`);
    request.onupgradeneeded = () => request.transaction.abort();
    request.onerror = () => resolve(false);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('metadata')) { db.close(); resolve(false); return; }
      const tx = db.transaction('metadata');
      const all = tx.objectStore('metadata').getAll();
      const access = tx.objectStore('metadata').get('access');
      tx.oncomplete = () => { db.close(); resolve(access.result?.status === 'available'
        && all.result.some(value => value?.ready && value.context?.scope?.kind === 'year')
        && all.result.some(value => value?.ready && value.context?.scope?.kind === 'shared')); };
    };
  });
}

/** The staged worker of this build is active and holds its complete shell. Firefox
 * can leave the document uncontrolled; the stopped-server navigation proves control. */
async function shellWorker() {
  const registration = await navigator.serviceWorker.getRegistration();
  const worker = registration?.active;
  if (!worker || worker.state !== 'activated') return false;
  const manifest = await (await fetch('/offline-shell/manifest.json', { cache: 'no-store' })).json();
  const status = await new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 3000);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
    worker.postMessage({ type: 'NAJM_PWA_STATUS', protocol: 1, cacheId: 'myscolai-shell' }, [channel.port2]);
  });
  return status?.ready === true && status.cacheVersion === manifest.version;
}

/** The worker without the shell has taken over and its activation dropped every shell cache. */
async function shellRemoved() {
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration?.active?.state !== 'activated' || registration.waiting || registration.installing) return false;
  if (!navigator.serviceWorker.controller) return false;
  return !(await caches.keys()).some(key => key.startsWith('najm-pwa:myscolai-shell:'));
}

/** Serializable registration state for a failed wait. */
async function workerState() {
  const registration = await navigator.serviceWorker.getRegistration();
  const script = worker => worker && { state: worker.state, url: worker.scriptURL };
  return { path: location.pathname, controller: script(navigator.serviceWorker.controller), installing: script(registration?.installing),
    waiting: script(registration?.waiting), active: script(registration?.active), caches: await caches.keys() };
}

/** The stored access row has this status. Opens only an existing replica. */
async function accessIs(expected) {
  const identity = JSON.parse(localStorage.getItem('school.offline-account.v1') ?? 'null');
  if (!identity?.accountId) return false;
  return new Promise(resolve => {
    const request = indexedDB.open(`school-read-v1:${identity.installationId}:${identity.accountId}`);
    request.onupgradeneeded = () => request.transaction.abort();
    request.onerror = () => resolve(false);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('metadata');
      const access = tx.objectStore('metadata').get('access');
      tx.oncomplete = () => { db.close(); resolve(access.result?.status === expected); };
    };
  });
}

for (const engineName of (process.env.OFFLINE_BROWSERS ?? 'chromium').split(',')) {
  assert(['chromium', 'firefox', 'webkit'].includes(engineName));
  const secure = engineName === 'webkit';
  let fixture = await startOfflineReadFixture(`switch-${engineName}-1`, { secure });
  let starts = 1;
  const { origin, port, browserOptions } = fixture;
  const restart = async env => {
    await fixture.close();
    fixture = await startOfflineReadFixture(`switch-${engineName}-${++starts}`, { secure, port, env });
    assert.equal(fixture.origin, origin);
  };
  let context;
  try {
    const engine = { chromium, firefox, webkit }[engineName];
    const profile = await createOfflineProfile(resolve(root, '.cache'), 'offline-switch-', engineName);
    const clientHeaders = fixtureClientHeaders();
    const launch = async () => {
      context = await engine.launchPersistentContext(profile, { headless: true, extraHTTPHeaders: clientHeaders, ...browserOptions });
      await audit.attach(context);
      const page = context.pages()[0] ?? await context.newPage();
      page.on('console', message => { if (message.type() === 'error') console.error('Browser:', message.text()); });
      page.on('response', response => { if (response.url().includes('/api/offline/')) console.log('Download HTTP', response.status(), new URL(response.url()).pathname); });
      return page;
    };
    const audit = createOfflineBrowserErrorAudit(engineName, origin);
    let page = await launch();
    const login = await context.request.post(origin + 'api/auth/login', {
      data: { email: 'admin@history.example.test', password: process.env.SCHOOL_HISTORY_ADMIN_PASSWORD },
    });
    assert.equal(login.status(), 200);

    // 1. On: preparation downloads both scopes and the staged shell controls the app.
    await page.goto(origin + 'home');
    await waitForOfflineCondition(page, prepared, null, { timeout: 60_000 });
    await waitForOfflineCondition(page, shellWorker, null, { timeout: 45_000 });
    const before = await page.evaluate(inspectReadReplica);
    const student = before.records.find(record => record.value?.path === '/students')?.value.body.data[0];
    assert(student?.name, 'Fixture must have downloaded students');
    await fixture.stop();
    await page.goto(origin + 'students');
    await page.getByText(student.name, { exact: true }).first().waitFor();
    console.log(`${engineName}: on: stopped-server Students list from the shell`);

    // 2. Off: one online visit replaces the worker without asking and locks the copies, keeping them.
    await restart({ SCHOOL_OFFLINE: 'off' });
    await page.goto(origin + 'home');
    await waitForOfflineCondition(page, shellRemoved, null, { timeout: 45_000 }).catch(async error => {
      console.log('Worker diagnostic:', await page.evaluate(workerState).catch(failure => failure.message));
      throw error;
    });
    await waitForOfflineCondition(page, accessIs, 'locked', { timeout: 30_000 }).catch(async error => {
      console.log('Access diagnostic:', (await page.evaluate(inspectReadReplica))?.access);
      throw error;
    });
    const locked = await page.evaluate(inspectReadReplica);
    assert.equal(locked.records.length, before.records.length, 'Turning offline use off must keep downloaded data');
    assert.equal(await page.locator('[data-school-offline-status]').count(), 0, 'No update notice for the replacement worker');
    const displayed = await page.evaluate(() => document.documentElement.lang);
    await waitForOfflineCondition(page, recordedOfflineLanguage, displayed);
    await fixture.stop();
    await page.goto(origin + 'students');
    // The worker without the shell uses the same single English fallback.
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(await page.getByRole('heading').count(), 1);
    assert.equal(await page.locator('meta[name="school-shell-version"]').count(), 0, 'The shell must not answer while turned off');
    assert.equal(await page.getByText(student.name, { exact: true }).count(), 0);
    console.log(`${engineName}: off: worker replaced on the next online visit, shell caches dropped, data kept but locked, offline page instead of the shell`);

    // 3. On again: the staged worker installs silently behind the open tab.
    // Closing all controlled tabs activates it naturally; access and downloads return.
    await restart({});
    await page.goto(origin + 'home');
    // It installs in the background behind the worker that controls this tab.
    await waitForOfflineCondition(page, async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state === 'installed', null, { timeout: 60_000 });
    assert.equal(await page.locator('[data-school-offline-status]').count(), 0, 'Staged updates must stay silent');
    await page.close();
    page = await context.newPage();
    await page.goto(origin + 'home');
    await waitForOfflineCondition(page, shellWorker, null, { timeout: 45_000 }).catch(async error => {
      console.log('Worker diagnostic:', await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return { controller: navigator.serviceWorker.controller?.state ?? null, installing: registration?.installing?.state ?? null,
          waiting: registration?.waiting?.state ?? null, active: registration?.active?.state ?? null, caches: await caches.keys() };
      }).catch(failure => failure.message));
      throw error;
    });
    await waitForOfflineCondition(page, prepared, null, { timeout: 60_000 }).catch(async error => {
      const state = await page.evaluate(inspectReadReplica);
      console.log('Access diagnostic:', state?.access, state?.runtimes?.map(runtime => runtime.context?.scope));
      throw error;
    });
    await fixture.stop();
    await page.goto(origin + 'students');
    await page.getByText(student.name, { exact: true }).first().waitFor();
    assert.deepEqual(audit.errors, []);
    console.log(`${engineName}: PASS turned off: replacement worker without the shell on the next online visit, no update consent, shell caches dropped, downloaded data kept and locked, English offline page; turned on: staged shell installed silently, naturally activated after closing the app tab, fresh grant and downloads, stopped-server Students list`);
  } finally {
    try { await context?.close(); } finally { await fixture.close(); }
  }
}
