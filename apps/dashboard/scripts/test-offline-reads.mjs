// Opt-in production-browser proof against the existing marked history fixture.
// No domain mutations, credential resets or main-database migration.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { waitForOfflineCondition } from './wait-offline-condition.mjs';
import { createOfflineProfile } from './offline-profile.mjs';
import { fixtureClientHeaders, startOfflineReadFixture, inspectReadReplica, root } from './offline-read-fixture.mjs';
import { createOfflineBrowserErrorAudit } from './offline-browser-errors.mjs';

for (const engineName of (process.env.OFFLINE_BROWSERS ?? 'chromium').split(',')) {
  assert(['chromium', 'firefox', 'webkit'].includes(engineName));
  const fixture = await startOfflineReadFixture('reads-' + engineName, { secure: engineName === 'webkit' });
  const { origin, browserOptions } = fixture;
  let context;
  try {
    const engine = { chromium, firefox, webkit }[engineName];
    const profile = await createOfflineProfile(resolve(root, '.cache'), 'offline-reads-', engineName);
    const clientHeaders = fixtureClientHeaders();
    context = await engine.launchPersistentContext(profile, { headless: true, extraHTTPHeaders: clientHeaders, ...browserOptions });
    const audit = createOfflineBrowserErrorAudit(engineName, origin);
    await audit.attach(context);
    const login = await context.request.post(origin + 'api/auth/login', {
      data: { email: 'admin@history.example.test', password: process.env.SCHOOL_HISTORY_ADMIN_PASSWORD },
    });
    assert.equal(login.status(), 200);
    const page = await context.newPage();
    page.on('console', message => { if (message.type() === 'error') console.error('Browser:', message.text()); });
    let loginNavigations = 0;
    let detailNavigations = 0;
    const notices = [];
    page.on('request', request => {
      if (!request.isNavigationRequest()) return;
      if (new URL(request.url()).pathname === '/login') loginNavigations++;
      if (/^\/students\/[^/]+$/.test(new URL(request.url()).pathname)) detailNavigations++;
    });
    page.on('response', response => { if (response.url().includes('/api/offline/')) console.log('Download HTTP', response.status(), new URL(response.url()).pathname); });
    await page.goto(origin + 'home');
    console.log(`${engineName}: existing session opened at /home`);
    await waitForOfflineCondition(page, async () => {
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
          tx.oncomplete = () => { db.close(); resolve(all.result.some(value => value?.ready && value.context?.scope?.kind === 'year')
            && all.result.some(value => value?.ready && value.context?.scope?.kind === 'shared')); };
        };
      });
    }, null, { timeout: 60_000 }).catch(async error => {
      const state = await page.evaluate(inspectReadReplica);
      console.log('Preparation diagnostic:', { path: new URL(page.url()).pathname, account: state?.identity?.accountId,
        access: state?.access?.status, reason: state?.access?.reason, runtimes: state?.runtimes?.length,
        records: state?.records?.length, errors: audit.errors });
      throw error;
    });
    const active = await page.evaluate(inspectReadReplica);
    assert.equal(active.access.status, 'available');
    assert.equal(active.access.entitlement.validUntil - active.access.entitlement.issuedAt, 8 * 60 * 60 * 1000);
    assert.equal(await page.evaluate(() => localStorage.getItem('school.offline-shell.v1')), null, 'Temporary display metadata must be removed');
    console.log(`${engineName}: server grant and complete active-year/shared snapshots`);
    await page.goto(origin + 'students?academicYear=2025-2026');
    await waitForOfflineCondition(page, async () => {
      const identity = JSON.parse(localStorage.getItem('school.offline-account.v1'));
      return new Promise(resolve => {
        const request = indexedDB.open(`school-read-v1:${identity.installationId}:${identity.accountId}`);
        request.onupgradeneeded = () => request.transaction.abort();
        request.onerror = () => resolve(false);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('metadata');
          const result = tx.objectStore('metadata').get('runtime:year:2025-2026');
          tx.oncomplete = () => { db.close(); resolve(result.result?.ready === true); };
        };
      });
    }, null, { timeout: 60_000 });
    const prepared = await page.evaluate(inspectReadReplica);
    const list = prepared.records.find(record => record.scope === 'year:2025-2026' && record.value?.path === '/students');
    assert(list?.value.body.data.length, 'Fixture must have historical students');
    const student = list.value.body.data.find(row => row.id === 'history-student-02') ?? list.value.body.data[0];
    const detail = prepared.records.find(record => record.scope === 'year:2025-2026' && record.value?.path === '/students/' + student.id);
    assert(detail, 'Unvisited detail must be in the downloaded snapshot');
    await waitForOfflineCondition(page, async () => {
      const worker = navigator.serviceWorker.controller;
      if (!worker || worker.state !== 'activated') return false;
      const manifest = await (await fetch('/offline-shell/manifest.json', { cache: 'no-store' })).json();
      const status = await new Promise(resolve => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => resolve(null), 3000);
        channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
        worker.postMessage({ type: 'NAJM_PWA_STATUS', protocol: 1, cacheId: 'myscolai-shell' }, [channel.port2]);
      });
      return status?.ready === true && status.protocol === 1 && status.cacheVersion === manifest.version;
    }, null, { timeout: 45_000 }).catch(async error => {
      console.log('Worker diagnostic:', await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        const ask = worker => worker && new Promise(resolve => {
          const channel = new MessageChannel();
          const timer = setTimeout(() => resolve('no answer'), 3000);
          channel.port1.onmessage = event => { clearTimeout(timer); resolve(event.data); };
          worker.postMessage({ type: 'NAJM_PWA_STATUS', protocol: 1, cacheId: 'myscolai-shell' }, [channel.port2]);
        });
        return { path: location.pathname, controller: navigator.serviceWorker.controller?.state ?? null,
          installing: registration?.installing?.state ?? null, waiting: registration?.waiting?.state ?? null,
          active: registration?.active?.state ?? null, manifest: (await (await fetch('/offline-shell/manifest.json', { cache: 'no-store' })).json()).version,
          activeStatus: await ask(registration?.active), waitingStatus: await ask(registration?.waiting), caches: await caches.keys() };
      }).catch(failure => failure.message), { errors: audit.errors });
      throw error;
    });
    assert.equal(loginNavigations, 0);
    assert.equal(detailNavigations, 0);
    notices.push(...await page.locator('[data-school-offline-status]').allTextContents());
    assert.deepEqual(notices, []);
    await fixture.stop();
    await assert.rejects(fixture.probe());
    await page.reload();
    await page.locator('meta[name="school-shell-version"]').waitFor({ state: 'attached' });
    await page.getByText(student.name, { exact: true }).first().waitFor();
    assert.equal(await page.evaluate(() => navigator.onLine), true);
    console.log(`${engineName}: historical list survives stopped-server reload`);
    await page.goto(origin + 'students/' + student.id);
    await page.getByRole('heading', { name: student.name, exact: true }).first().waitFor();
    await page.getByText(detail.value.body.data.class.name, { exact: true }).first().waitFor();
    await page.getByRole('button', { name: /change class or section/i }).waitFor();
    await page.screenshot({ path: resolve(root, `.cache/offline-reads-${engineName}-detail.png`) });
    const summary = await page.locator('[data-school-offline-summary]').textContent();
    assert(summary?.length, 'Unavailable summaries must be explicit, never fabricated zero metrics');
    const panels = page.getByRole('tab');
    if (await panels.count() > 1) {
      await panels.nth(1).click();
      await page.locator('[role="tabpanel"] p[role="status"]').waitFor();
      await panels.first().click();
    }
    await page.getByRole('button', { name: /back to students|retour aux élèves/i }).click();
    await page.getByText(student.name, { exact: true }).first().waitFor();
    await page.screenshot({ path: resolve(root, `.cache/offline-reads-${engineName}.png`) });
    await audit.close(context);
    context = await engine.launchPersistentContext(profile, { headless: true, extraHTTPHeaders: clientHeaders, ...browserOptions });
    await audit.attach(context);
    const reopened = await context.newPage();
    await reopened.goto(origin + 'students/' + student.id);
    await reopened.getByRole('heading', { name: student.name, exact: true }).first().waitFor();
    // Simulate losing one required projection without manufacturing a successful empty response.
    await reopened.evaluate(async ({ studentId }) => {
      const identity = JSON.parse(localStorage.getItem('school.offline-account.v1'));
      await new Promise((resolve, reject) => {
        const request = indexedDB.open(`school-read-v1:${identity.installationId}:${identity.accountId}`);
        request.onupgradeneeded = () => request.transaction.abort();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('records', 'readwrite');
          const store = tx.objectStore('records');
          const all = store.getAll();
          all.onsuccess = () => all.result.filter(row => row.value?.path === '/students/' + studentId + '/parents')
            .forEach(row => store.delete([row.scope, row.entity, row.id]));
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
      });
    }, { studentId: student.id });
    await reopened.reload();
    await reopened.locator('main > p[role="status"]').waitFor();
    assert.equal(await reopened.getByRole('heading', { name: student.name, exact: true }).count(), 0,
      'Missing required parent coverage must keep the real profile unmounted');
    assert.deepEqual(audit.errors, []);
    console.log(`${engineName}: PASS silent restored-session preparation, two-year downloads, unchanged list/detail/Overview, unvisited detail, public coverage adapters, Back, stopped-server reload/reopen and missing-parent coverage refusal; no domain writes`);
  } finally {
    try { await context?.close(); } finally { await fixture.close(); }
  }
}
