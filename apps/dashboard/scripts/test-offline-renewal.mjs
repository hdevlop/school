// Real production-runtime event wiring against the marked fixture. Own temporary auth records only.
// Browser timers accelerate; Date stays near real server time so JWT/lease clocks are not fabricated.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { startOfflineReadFixture, inspectReadReplica, fixtureClientHeaders, root } from './offline-read-fixture.mjs';
import { createOfflineProfile } from './offline-profile.mjs';
import { createOfflineBrowserErrorAudit } from './offline-browser-errors.mjs';

const minute = 60_000;
const duration = 8 * 60 * minute;
for (const engineName of (process.env.OFFLINE_BROWSERS ?? 'chromium').split(',')) {
  assert(['chromium', 'firefox', 'webkit'].includes(engineName));
  const fixture = await startOfflineReadFixture('renewal-' + engineName, { secure: engineName === 'webkit' });
  const { origin, browserOptions } = fixture;
  const audit = createOfflineBrowserErrorAudit(engineName, origin);
  const fixtureId = 'offline-renewal-' + crypto.randomUUID();
  let context;
  let page;
  const grants = [];
  let refreshes = 0;
  let grantFailures = 0;
  const wait = async (predicate, label) => {
    const end = Date.now() + 60_000;
    do {
      if (await predicate()) return;
      if (Date.now() >= end) throw new Error('Renewal condition did not arrive: ' + label);
      await new Promise(done => setTimeout(done, 100));
    } while (true);
  };
  const committed = async after => {
    let state;
    await wait(async () => {
      state = await page.evaluate(inspectReadReplica);
      return state?.access?.status === 'available' && state.access.entitlement?.issuedAt > after
        && state.access.entitlement?.issuedAt === state.presentation?.grant.issuedAt
        && state.runtimes.some(row => row.context.scope.kind === 'year')
        && state.runtimes.some(row => row.context.scope.kind === 'shared');
    }, 'fresh server grant committed with matching presentation');
    const grant = state.access.entitlement;
    assert.equal(grant.validUntil - grant.issuedAt, duration);
    assert(grants.some(value => value.issuedAt === grant.issuedAt && value.validUntil === grant.validUntil),
      'Persisted access must be an actual server response');
    return grant;
  };
  try {
    const profile = await createOfflineProfile(resolve(root, '.cache'), 'offline-renewal-', engineName);
    context = await { chromium, firefox, webkit }[engineName].launchPersistentContext(profile, {
      // Keep injected HTTP challenges visible to Playwright routing in every engine.
      // Worker/cold-start acceptance runs separately with the real worker enabled.
      headless: true, serviceWorkers: 'block', viewport: { width: 1700, height: 1000 }, extraHTTPHeaders: fixtureClientHeaders(), ...browserOptions,
    });
    await audit.attach(context);
    const login = await context.request.post(origin + 'api/auth/login', {
      data: { email: 'admin@history.example.test', password: process.env.SCHOOL_HISTORY_ADMIN_PASSWORD },
    });
    assert.equal(login.status(), 200);
    page = await context.newPage();
    await page.clock.install();
    await page.clock.setFixedTime(Date.now());
    page.on('response', async response => {
      const path = new URL(response.url()).pathname;
      if (path === '/api/auth/refresh' && response.ok()) refreshes++;
      if (path === '/api/offline/grant') {
        if (response.ok()) grants.push(await response.json());
        else grantFailures++;
      }
    });
    await page.goto(origin + 'home');
    let grant = await committed(0);
    // Let startup's coalesced refresh finish before attributing a later grant to a trigger.
    await new Promise(done => setTimeout(done, 1000));
    grant = (await page.evaluate(inspectReadReplica)).access.entitlement;
    const identity = crypto.randomUUID();
    await page.evaluate(value => { window.offlineRenewalDocument = value; }, identity);

    // A token refresh cannot explain this authorization: all refresh attempts are refused.
    const denyRefresh = route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Fixture transient refresh failure"}' });
    await page.route('**/api/auth/refresh', denyRefresh);
    const beforeRefreshes = refreshes;
    await page.clock.fastForward(15 * minute);
    grant = await committed(grant.issuedAt);
    assert.equal(refreshes, beforeRefreshes);
    await page.unroute('**/api/auth/refresh', denyRefresh);
    console.log(`${engineName}: actual 15-minute timer obtains fresh server authorization without tokenRefresh`);

    // A single ordinary read challenges the real client's token. Its successful refresh
    // must trigger a grant immediately, without advancing to another interval or remount.
    let challenged = false;
    await page.route('**/api/students', async route => {
      if (!challenged) {
        challenged = true;
        await route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Fixture token challenge"}' });
      } else await route.continue();
    });
    const beforeTokenGrant = grant.issuedAt;
    await page.locator('a[href="/students"]:visible').first().click();
    await wait(() => Promise.resolve(refreshes > beforeRefreshes), 'real successful token refresh');
    grant = await committed(beforeTokenGrant);
    assert(challenged);
    assert.equal(await page.evaluate(() => window.offlineRenewalDocument), identity, 'Navigation must preserve the mounted runtime');
    console.log(`${engineName}: real successful tokenRefresh immediately renews the grant in the same document`);

    const denyGrant = route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Fixture transient authorization failure"}' });
    await page.route('**/api/offline/grant', denyGrant);
    const beforeFailure = grantFailures;
    const originalExpiry = grant.validUntil;
    await context.setOffline(true); await context.setOffline(false);
    await wait(() => Promise.resolve(grantFailures > beforeFailure), 'failed reconnect authorization');
    const failed = await page.evaluate(inspectReadReplica);
    assert.equal(failed.access.entitlement.validUntil, originalExpiry);
    assert.equal(failed.presentation.grant.validUntil, originalExpiry);
    await page.unroute('**/api/offline/grant', denyGrant);
    await context.setOffline(true); await context.setOffline(false);
    grant = await committed(grant.issuedAt);
    assert.equal(new URL(page.url()).pathname, '/students');
    assert.deepEqual(audit.errors, []);
    console.log(`${engineName}: PASS production timer, tokenRefresh, failed renewal without expiry extension and reconnect recovery`);

    // This account deliberately lacks read:offline. Its one migration-token refresh
    // must settle rather than feeding tokenRefresh back into unbounded refreshes.
    await audit.close(context); context = undefined;
    const password = crypto.randomUUID();
    const { hash } = await import('bcryptjs');
    const encoded = await hash(password, 4);
    await fixture.sql`insert into roles(id,name) values(${fixtureId},${fixtureId})`;
    await fixture.sql`insert into role_permissions(role_id,permission_id) select ${fixtureId},id from permissions where name = 'read:students'`;
    await fixture.sql`insert into users(id,name,email,password,status,role_id) values(${fixtureId},'Meryem El Amrani',${fixtureId + '@history.example.test'},${encoded},'active',${fixtureId})`;
    const ungrantedProfile = await createOfflineProfile(resolve(root, '.cache'), 'offline-renewal-ungranted-', engineName);
    context = await { chromium, firefox, webkit }[engineName].launchPersistentContext(ungrantedProfile, { headless: true, serviceWorkers: 'block', extraHTTPHeaders: fixtureClientHeaders(), ...browserOptions });
    await audit.attach(context);
    assert.equal((await context.request.post(origin + 'api/auth/login', { data: { email: fixtureId + '@history.example.test', password } })).status(), 200);
    page = await context.newPage();
    let ungrantedRefreshes = 0;
    let refusedGrants = 0;
    page.on('response', response => {
      const path = new URL(response.url()).pathname;
      if (path === '/api/auth/refresh' && response.ok()) ungrantedRefreshes++;
      if (path === '/api/offline/grant' && response.status() === 403) refusedGrants++;
    });
    await page.goto(origin + 'home');
    await wait(() => Promise.resolve(refusedGrants > 0 && ungrantedRefreshes > 0), 'ungranted role refresh and refusal');
    await new Promise(done => setTimeout(done, 2000));
    assert(ungrantedRefreshes <= 3 && refusedGrants <= 3, 'Unsupported roles must not loop through tokenRefresh and grant refusal');
    assert(!(await page.evaluate(inspectReadReplica))?.access?.entitlement);
    assert.deepEqual(audit.errors, []);
    console.log(`${engineName}: unsupported role settles after bounded token refresh; no offline entitlement created`);
  } catch (error) {
    if (page) {
      await page.screenshot({ path: resolve(root, `.cache/offline-renewal-${engineName}-failure.png`) }).catch(() => undefined);
      const state = await page.evaluate(inspectReadReplica).catch(() => null);
      console.error('Renewal diagnostic:', { path: page.url(), grants: grants.length, refreshes, grantFailures,
        status: state?.access.status, reason: state?.access.reason, errors: audit.errors });
    }
    throw error;
  } finally {
    try {
      await context?.close();
      await fixture.sql`delete from users where id = ${fixtureId}`;
      await fixture.sql`delete from role_permissions where role_id = ${fixtureId}`;
      await fixture.sql`delete from roles where id = ${fixtureId}`;
    } finally { await fixture.close(); }
  }
}
