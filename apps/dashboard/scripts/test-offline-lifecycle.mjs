// Opt-in browser proof. Only this runner's temporary records in the marked local fixture are mutated.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { chromium, firefox, webkit, request } from 'playwright';
import { startOfflineReadFixture, inspectReadReplica, removeFixtureStudents, fixtureClientHeaders, root } from './offline-read-fixture.mjs';
import { createOfflineProfile } from './offline-profile.mjs';
import { waitForOfflineCondition } from './wait-offline-condition.mjs';
import { createOfflineBrowserErrorAudit } from './offline-browser-errors.mjs';

for (const engineName of (process.env.OFFLINE_BROWSERS ?? 'chromium').split(',')) {
  assert(['chromium', 'firefox', 'webkit'].includes(engineName));
  const fixture = await startOfflineReadFixture(`lifecycle-${engineName}`, { secure: engineName === 'webkit' });
  const { origin, sql, browserOptions } = fixture;
  const audit = createOfflineBrowserErrorAudit(engineName, origin);
  const clientHeaders = fixtureClientHeaders();
  const admin = await request.newContext({ baseURL: origin, extraHTTPHeaders: clientHeaders, ...browserOptions });
  const suffix = crypto.randomUUID();
  const studentId = 'offline-lifecycle-student-' + suffix;
  const deletedId = 'offline-lifecycle-delete-' + suffix;
  const userId = 'offline-lifecycle-parent-' + suffix;
  const parentId = 'offline-lifecycle-parent-record-' + suffix;
  const password = crypto.randomUUID();
  const studentName = 'Yasmine El Amrani';
  const editedName = 'Yasmine El Amrani Updated';
  const remoteName = 'Yasmine El Amrani Reconnected';
  let context;
  let page;
  let accessToken;
  let createdRoleId;
  const headers = { 'X-Academic-Year': '2026-2027', 'X-Language': 'en' };
  const call = async (method, path, data) => {
    const response = await admin.fetch('api' + path, { method, headers: { ...headers, Authorization: 'Bearer ' + accessToken }, ...(data ? { data } : {}) });
    assert(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`);
    return response.json();
  };
  const waitState = async (page, predicate, label) => {
    const deadline = Date.now() + 60_000;
    // An online page whose session the server refuses navigates to /login meanwhile.
    const inspect = () => page.evaluate(inspectReadReplica).catch(error => {
      if (/Execution context was destroyed/.test(error.message)) return undefined;
      throw error;
    });
    let state;
    while (!predicate(state = await inspect())) {
      if (Date.now() >= deadline) throw new Error('Condition did not arrive: ' + label);
      await new Promise(done => setTimeout(done, 100));
    }
    console.log(`${engineName}: ${label}`);
    return state;
  };
  try {
    const login = await admin.post('api/auth/login', { data: { email: 'admin@history.example.test', password: process.env.SCHOOL_HISTORY_ADMIN_PASSWORD } });
    assert.equal(login.status(), 200);
    const session = await login.json();
    accessToken = session.data?.accessToken ?? session.accessToken;
    assert(accessToken, 'Fixture admin access token is required');
    const create = (id, name) => call('POST', '/students', { id, studentCode: id, name, gender: 'F',
      classId: 'history-class-2026', sectionId: 'history-section-2026-a', enrollmentDate: '2026-09-01', yearEnrolledOn: '2026-09-01' });
    await create(studentId, studentName); await create(deletedId, 'Sami El Idrissi');
    let [parentRole] = await sql`select id from roles where name = 'parent'`;
    if (!parentRole) {
      createdRoleId = 'offline-lifecycle-role-' + suffix;
      [parentRole] = await sql`insert into roles(id,name) values(${createdRoleId},'parent') returning id`;
      await sql`insert into role_permissions(role_id,permission_id) select ${createdRoleId},id from permissions where name in ('read:students','read:offline')`;
    }
    const roleId = parentRole.id;
    const permissions = await sql`select p.name from role_permissions rp join permissions p on p.id = rp.permission_id where rp.role_id = ${roleId}`;
    for (const name of ['read:students', 'read:offline']) assert(permissions.some(row => row.name === name), 'Fixture parent must already have ' + name);
    // Temporary credentials are fixture setup, never an invitation or a reset of an existing account.
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(password, 4);
    await sql`insert into users(id,name,email,password,status,role_id) values(${userId},'Meryem El Amrani',${userId + '@history.example.test'},${hash},'active',${roleId})`;
    await sql`insert into parents(id,user_id,name,cin,phone,relationship_type) values(${parentId},${userId},'Meryem El Amrani',${suffix},${suffix},'guardian')`;
    await sql`insert into student_parents(id,student_id,parent_id) values(${suffix},${studentId},${parentId})`;
    const engine = { chromium, firefox, webkit }[engineName];
    const profile = await createOfflineProfile(resolve(root, '.cache'), 'offline-lifecycle-', engineName);
    context = await engine.launchPersistentContext(profile, { headless: true, viewport: { width: 1700, height: 1000 }, extraHTTPHeaders: clientHeaders, ...browserOptions });
    await audit.attach(context);
    assert.equal((await context.request.post(origin + 'api/auth/login', { data: { email: 'admin@history.example.test', password: process.env.SCHOOL_HISTORY_ADMIN_PASSWORD } })).status(), 200);
    page = await context.newPage();
    await page.goto(origin + 'students');
    await waitState(page, state => state?.runtimes.some(row => row.context.scope.kind === 'year') && state?.runtimes.some(row => row.context.scope.kind === 'shared'), 'prepared real admin account');
    await waitForOfflineCondition(page, async () => {
      const worker = navigator.serviceWorker.controller;
      const registration = await navigator.serviceWorker.getRegistration();
      if (!worker || worker !== registration?.active) return false;
      const manifest = await (await fetch('/offline-shell/manifest.json', { cache: 'no-store' })).json();
      return new Promise(resolve => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 2000);
        channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data.ready === true && event.data.cacheVersion === manifest.version); };
        worker.postMessage({ type: 'NAJM_PWA_STATUS', protocol: 1, cacheId: 'myscolai-shell' }, [channel.port2]);
      });
    });
    await page.getByPlaceholder(/search by name/i).fill(studentName);
    const row = page.locator('[data-row-id="' + studentId + '"]');
    await row.waitFor();
    const edit = row.getByRole('button', { name: /^edit/i });
    if (await edit.count()) await edit.click();
    else { await row.getByLabel(/actions/i).click(); await page.getByRole('menuitem', { name: /edit/i }).click(); }
    await page.locator('#student-form input[name="name"]').fill(editedName);
    const saved = page.waitForResponse(response => response.url().endsWith('/api/students/' + studentId) && response.request().method() === 'PUT');
    await page.locator('button[form="student-form"]').click();
    assert.equal((await saved).status(), 200);
    await page.getByText(editedName, { exact: true }).first().waitFor();
    const waitProjection = async (expected, absentId) => {
      const deadline = Date.now() + 60_000;
      do {
        const state = await page.evaluate(inspectReadReplica);
        const students = state?.records.find(row => row.scope === 'year:2026-2027' && row.value?.path === '/students')?.value.body.data;
        if (state?.access?.selectionFence === state?.identity.fence
          && state?.presentation?.grant.issuedAt === state?.access?.entitlement?.issuedAt
          && students?.some(row => row.id === studentId && row.name === expected)
          && (!absentId || !students.some(row => row.id === absentId))) return state;
        if (Date.now() >= deadline) throw new Error('Authoritative replacement did not arrive: ' + expected);
        await new Promise(done => setTimeout(done, 100));
      } while (true);
    };
    await waitProjection(editedName);
    await context.setOffline(true); await page.reload();
    await page.getByText(editedName, { exact: true }).first().waitFor();
    console.log(`${engineName}: real online edit survives offline reload without reverting`);
    await call('PUT', '/students/' + studentId, { name: remoteName });
    await call('DELETE', '/students/' + deletedId);
    await context.setOffline(false);
    await waitProjection(remoteName, deletedId);
    await page.getByText(remoteName, { exact: true }).first().waitFor();
    await context.setOffline(true); await page.reload();
    await page.getByText(remoteName, { exact: true }).first().waitFor();
    const replacement = await page.evaluate(inspectReadReplica);
    assert(!replacement.records.some(row => row.value?.path === '/students/' + deletedId), 'Deleted detail must leave the replacement snapshot');
    console.log(`${engineName}: reconnect replaces changed/deleted list and detail projections`);
    await context.setOffline(false);
    const online = await context.newPage(); await online.goto(origin + 'home');
    await online.getByRole('button', { name: /log ?out|sign out/i }).click();
    await online.waitForURL('**/login');
    await waitForOfflineCondition(page, () => !JSON.parse(localStorage.getItem('school.offline-account.v1') ?? 'null')?.accountId);
    await page.getByText(remoteName, { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await page.getByText(remoteName, { exact: true }).count(), 0, 'Another tab logout must hide mounted private results');
    assert.equal((await context.request.post(origin + 'api/auth/login', { data: { email: userId + '@history.example.test', password } })).status(), 200);
    // Preparation ends with the shell manifest: going offline before it would cut that request.
    const shellPrepared = online.waitForEvent('requestfinished', { predicate: request => new URL(request.url()).pathname === '/offline-shell/manifest.json', timeout: 60_000 });
    await online.goto(origin + 'home');
    const deadline = Date.now() + 60_000;
    do {
      const state = await online.evaluate(inspectReadReplica);
      if (state?.identity.accountId === userId && state.runtimes.some(row => row.context.scope.kind === 'year')) break;
      if (Date.now() >= deadline) throw new Error('Restricted account was not prepared');
      await new Promise(done => setTimeout(done, 100));
    } while (true);
    await shellPrepared;
    await context.setOffline(true); await page.goto(origin + 'students');
    await page.getByText(remoteName, { exact: true }).first().waitFor();
    const restricted = await page.evaluate(inspectReadReplica);
    const allowed = restricted.records.find(row => row.value?.path === '/students').value.body.data;
    assert.deepEqual(allowed.map(row => row.id), [studentId]);
    assert.equal(await page.getByText('Salma Bennani', { exact: true }).count(), 0);
    console.log(`${engineName}: cross-tab logout/account switch exposes only the linked child`);
    await sql`update users set status = 'inactive' where id = ${userId}`;
    await context.setOffline(false);
    const locked = await waitState(page, state => state?.access.status === 'locked', 'fresh server refusal locks the cached account');
    assert(locked.records.length, 'Revocation must preserve retained records');
    await audit.close(context);
    await fixture.stop();
    await assert.rejects(fixture.probe());
    context = await engine.launchPersistentContext(profile, { headless: true, extraHTTPHeaders: clientHeaders, ...browserOptions });
    await audit.attach(context);
    page = await context.newPage();
    await page.goto(origin + 'students');
    await page.locator('meta[name="school-shell-version"]').waitFor({ state: 'attached' });
    await page.getByRole('link', { name: /sign in/i }).waitFor();
    assert.equal(await page.getByText(remoteName, { exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => navigator.onLine), true);
    assert.deepEqual(audit.errors, []);
    console.log(`${engineName}: PASS edit freshness, reconnect replacement/deletion, cross-tab logout, restricted account switch and revoked-access process restart with server stopped`);
  } catch (error) {
    console.error('Browser audit:', audit.errors);
    const failedPage = page ?? context?.pages().at(-1);
    if (failedPage) {
      await failedPage.screenshot({ path: resolve(root, `.cache/offline-lifecycle-${engineName}-failure.png`) }).catch(() => undefined);
      console.log('Browser diagnostic:', { path: new URL(failedPage.url()).pathname,
        buttons: await failedPage.getByRole('button').allTextContents().catch(() => []),
        rows: await failedPage.getByRole('row').count().catch(() => 0),
        menus: await failedPage.locator('[role="menu"]').allTextContents().catch(() => []),
        content: (await failedPage.locator('body').innerText().catch(() => '')).slice(0, 300) });
    }
    console.error('Lifecycle failure:', error); throw error;
  }
  finally {
    try {
      await context?.close();
      await sql`delete from parents where id = ${parentId}`;
      await sql`delete from users where id = ${userId}`;
      await removeFixtureStudents(sql, [studentId, deletedId]);
      if (createdRoleId) {
        await sql`delete from role_permissions where role_id = ${createdRoleId}`;
        await sql`delete from roles where id = ${createdRoleId}`;
      }
    } finally { await admin.dispose(); await fixture.close(); }
  }
}
