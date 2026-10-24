// Real unchanged Students row -> Next router.push -> worker/neutral document fallback.
// Read-only domain acceptance against the marked fixture; the real server is stopped.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { startOfflineReadFixture, fixtureClientHeaders, inspectReadReplica, root } from './offline-read-fixture.mjs';
import { createOfflineProfile } from './offline-profile.mjs';
import { waitForOfflineCondition } from './wait-offline-condition.mjs';
import { createOfflineBrowserErrorAudit } from './offline-browser-errors.mjs';

for (const engineName of (process.env.OFFLINE_BROWSERS ?? 'chromium').split(',')) {
  assert(['chromium', 'firefox', 'webkit'].includes(engineName));
  const fixture = await startOfflineReadFixture('navigation-' + engineName, { secure: engineName === 'webkit' });
  const { origin, browserOptions } = fixture;
  let context;
  let page;
  let stopped = false;
  let failedRsc = 0;
  let detailDocuments = 0;
  try {
    const profile = await createOfflineProfile(resolve(root, '.cache'), 'offline-navigation-', engineName);
    context = await { chromium, firefox, webkit }[engineName].launchPersistentContext(profile, {
      headless: true, viewport: { width: 1700, height: 1000 }, extraHTTPHeaders: fixtureClientHeaders(), ...browserOptions,
    });
    const audit = createOfflineBrowserErrorAudit(engineName, origin);
    await audit.attach(context);
    assert.equal((await context.request.post(origin + 'api/auth/login', {
      data: { email: 'admin@history.example.test', password: process.env.SCHOOL_HISTORY_ADMIN_PASSWORD },
    })).status(), 200);
    page = await context.newPage();
    page.on('console', message => { if (message.type() === 'error') console.error('Browser:', message.text()); });
    page.on('requestfailed', request => {
      if (stopped && (request.headers()['rsc'] === '1' || new URL(request.url()).searchParams.has('_rsc'))) failedRsc++;
    });
    page.on('request', request => {
      if (request.isNavigationRequest() && /^\/students\/[^/]+$/.test(new URL(request.url()).pathname)) detailDocuments++;
    });
    await page.goto(origin + 'students');
    await waitForOfflineCondition(page, inspectReadReplicaReady, null, { timeout: 60000 });
    const prepared = await page.evaluate(inspectReadReplica);
    const students = prepared.records.find(row => row.value?.path === '/students')?.value.body.data;
    const student = students?.find(row => row.id === 'history-student-02') ?? students?.[0];
    assert(student);
    await page.getByPlaceholder(/search by name/i).fill(student.name);
    const row = page.locator('[data-row-id="' + student.id + '"]');
    await row.waitFor();
    await waitForOfflineCondition(page, async () => {
      const worker = navigator.serviceWorker.controller;
      const registration = await navigator.serviceWorker.getRegistration();
      if (!worker || registration?.active !== worker) return false;
      const manifest = await (await fetch('/offline-shell/manifest.json', { cache: 'no-store' })).json();
      return new Promise(resolve => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 2000);
        channel.port1.onmessage = event => {
          clearTimeout(timer); channel.port1.close();
          resolve(event.data.ready === true && event.data.protocol === 1 && event.data.cacheVersion === manifest.version);
        };
        worker.postMessage({ type: 'NAJM_PWA_STATUS', protocol: 1, cacheId: 'myscolai-shell' }, [channel.port2]);
      });
    });
    assert.equal(await page.locator('meta[name="school-shell-version"]').count(), 0, 'Must start in the actual online Next document');
    assert.equal(detailDocuments, 0, 'Detail must never have been visited online');
    await fixture.stop(); stopped = true;
    await assert.rejects(fixture.probe());
    assert.equal(await page.evaluate(() => navigator.onLine), true);
    const name = row.getByText(student.name, { exact: true }).first();
    assert(await name.evaluate(node => !node.closest('a')), 'Exercise the real row callback, not anchor interception');
    await name.click();
    await page.getByRole('heading', { name: student.name, exact: true }).first().waitFor({ timeout: 30000 });
    await page.locator('meta[name="school-shell-version"]').waitFor({ state: 'attached' });
    assert(failedRsc > 0, 'The real Next programmatic transition must have attempted RSC before native document fallback');
    assert(detailDocuments > 0, 'Next must reach the worker through document navigation');
    assert.equal(new URL(page.url()).pathname, '/students/' + student.id);
    await page.getByRole('button', { name: /back to students/i }).click();
    await page.getByText(student.name, { exact: true }).first().waitFor();
    // The profile's Back button pushes /students. Exercise browser history separately.
    await page.goBack();
    await page.getByRole('heading', { name: student.name, exact: true }).first().waitFor();
    await page.goForward();
    await page.getByText(student.name, { exact: true }).first().waitFor();
    await page.goBack();
    await page.getByRole('heading', { name: student.name, exact: true }).first().waitFor();
    await page.reload();
    await page.getByRole('heading', { name: student.name, exact: true }).first().waitFor();
    assert.deepEqual(audit.errors, []);
    console.log(`${engineName}: PASS unchanged online Students row action, failed RSC -> native document fallback, unvisited offline detail, Back/Forward/reload with navigator.onLine=true`);
  } catch (error) {
    if (page) {
      await page.screenshot({ path: resolve(root, `.cache/offline-navigation-${engineName}-failure.png`) }).catch(() => undefined);
      console.error('Navigation diagnostic:', { path: page.url(), stopped, failedRsc, detailDocuments });
    }
    throw error;
  } finally { try { await context?.close(); } finally { await fixture.close(); } }
}

async function inspectReadReplicaReady() {
  const identity = JSON.parse(localStorage.getItem('school.offline-account.v1') ?? 'null');
  if (!identity?.accountId) return false;
  const name = `school-read-v1:${identity.installationId}:${identity.accountId}`;
  if (!(await indexedDB.databases()).some(db => db.name === name)) return false;
  return new Promise(resolve => {
    const request = indexedDB.open(name);
    request.onupgradeneeded = () => request.transaction.abort();
    request.onerror = () => resolve(false);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('metadata');
      const all = tx.objectStore('metadata').getAll();
      tx.oncomplete = () => { db.close(); resolve(all.result.some(row => row?.ready && row.context.scope.kind === 'year')
        && all.result.some(row => row?.ready && row.context.scope.kind === 'shared')); };
    };
  });
}
