// Production-browser acceptance against the marked local fixture, never the main school.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, open, readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { chromium } from 'playwright';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(appRoot, '../..');
process.loadEnvFile(resolve(appRoot, '.env.local'));
const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
assert(rawUrl && process.env.SCHOOL_HISTORY_ADMIN_PASSWORD, 'History fixture credentials are required');
const target = new URL(rawUrl);
assert(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  && target.pathname === '/school_history_test', 'Expected local school_history_test');
const db = postgres(rawUrl, { max: 1 });
try {
  const [fixture] = await db`select current_database() as database,
    (select id from school_history_fixture_marker) as marker,
    to_regclass('public.exam_planning')::text as planning`;
  assert.equal(fixture.database, 'school_history_test');
  assert.equal(fixture.marker, 'academic-history-alerts-v1');
  assert.equal(fixture.planning, 'exam_planning', 'Apply the existing migrations to the guarded fixture first');
} finally { await db.end(); }

await mkdir(resolve(root, '.cache'), { recursive: true });
const profile = await mkdtemp(resolve(root, '.cache/planning-json-browser-'));
const socket = createServer();
await new Promise(done => socket.listen(0, '127.0.0.1', done));
const port = socket.address().port;
await new Promise(done => socket.close(done));
const origin = `http://127.0.0.1:${port}`;
const log = await open(resolve(root, '.cache/planning-json-next.log'), 'w');
const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
  cwd: appRoot, windowsHide: true,
  env: { ...process.env, NODE_ENV: 'production', DB_URL: rawUrl,
    NAJM_NEXT_DIST_DIR: process.env.NAJM_NEXT_DIST_DIR || '.next',
    NAJM_AUTH_INTERNAL_URL: `${origin}/api/auth/session/recover`, FRONTEND_URL: origin },
  stdio: ['ignore', log.fd, log.fd],
});
const year = '2026-2027';
const headers = { 'X-Academic-Year': year };
let context;
let classId;
let token;
let page;
let baseline;
const extraClasses = [];

async function api(path, method = 'GET', data, scope = year) {
  const response = await context.request.fetch(`${origin}/api${path}`, {
    method, headers: { ...headers, 'X-Academic-Year': scope, Authorization: `Bearer ${token}` }, ...(data === undefined ? {} : { data }),
  });
  return { status: response.status(), body: await response.json() };
}
async function plans() {
  const response = await api('/exam-planning');
  assert.equal(response.status, 200);
  return response.body.data;
}
async function ownPlan() { return (await plans()).find(cls => cls.id === classId); }
async function downloadJson() {
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const download = await waiting;
  assert.equal(download.suggestedFilename(), `exam-planning-${year}.json`);
  const path = await download.path();
  return JSON.parse(await readFile(path, 'utf8'));
}

try {
  for (let attempt = 0; attempt < 120; attempt++) {
    try { if ((await fetch(`${origin}/api/health/status`, { signal: AbortSignal.timeout(1000) })).ok) break; } catch {}
    if (server.exitCode !== null || attempt === 119) throw new Error('Production startup failed; inspect .cache/planning-json-next.log');
    await new Promise(done => setTimeout(done, 250));
  }
  context = await chromium.launchPersistentContext(profile, { headless: true, viewport: { width: 1440, height: 1000 }, locale: 'en-US', serviceWorkers: 'block' });
  await context.addCookies([{ name: 'school-ui-language', value: 'en', url: origin }]);
  const login = await context.request.post(`${origin}/api/auth/login`, {
    data: { email: 'admin@history.example.test', password: process.env.SCHOOL_HISTORY_ADMIN_PASSWORD },
  });
  assert.equal(login.status(), 200, 'Fixture admin login');
  const signedIn = await login.json();
  token = signedIn.data?.accessToken ?? signedIn.accessToken;
  assert(token, 'Fixture admin access token');
  baseline = await plans();
  assert(baseline.every(cls => Object.keys(cls.months).length === 0), 'Clear acceptance requires an empty planning fixture; existing planning must not be erased');

  const className = `JSON ${Date.now()}`;
  const created = await api('/classes', 'POST', { name: className, level: 'Middle' });
  assert.equal(created.status, 200);
  classId = created.body.data.id;
  const entry = { id: 'arabic', date: '2026-11-09', subject: 'اللغة العربية', lessons: ['الجملة الاسمية'] };
  const december = { ...entry, id: 'december', date: '2026-12-01', subject: 'Français', lessons: ['Les accords'] };
  for (const [month, entries] of [['2026-11', [entry]], ['2026-12', [december]], ['2027-01', [{ ...entry, id: 'january', date: '2027-01-04' }]]]) {
    assert.equal((await api(`/exam-planning/${classId}`, 'PUT', { month, entries })).status, 200);
  }

  page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/exam-planning`);
  await page.getByRole('button', { name: 'Export JSON', exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector('button[aria-label="Export JSON"]')?.disabled);
  await page.getByRole('button', { name: className, exact: true }).click();
  await page.locator('#planning-lessons').waitFor();

  const exported = await downloadJson();
  assert.equal(exported.format, 'school-exam-planning');
  assert.equal(exported.version, 1);
  assert.equal(exported.schoolYear, year);
  assert(!Number.isNaN(Date.parse(exported.exportedAt)));
  assert(exported.classes.every(cls => !('id' in cls)), 'Exports identify classes by name without database IDs');
  const exportedClass = exported.classes.find(cls => cls.name === className);
  assert.deepEqual(exportedClass, { name: className, visible: true, months: { '2026-11': [entry], '2026-12': [december], '2027-01': [{ ...entry, id: 'january', date: '2027-01-04' }] } });
  const savedExportedClass = { ...exportedClass, id: classId };
  assert.equal(exported.classes.length, baseline.length + 1, 'Export covers the whole catalog, independent of class/date filters');
  console.log('PASS JSON download includes the full year, Arabic/French lessons and visibility');

  // Unsaved editor changes must not be lost through either JSON action.
  await page.locator('#planning-lessons').fill('Unsaved lesson');
  assert(await page.getByRole('button', { name: 'Export JSON', exact: true }).isDisabled());
  assert(await page.getByRole('button', { name: 'Import JSON', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await page.locator('#planning-lessons').inputValue(), entry.lessons[0]);

  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Import JSON', exact: true });
  await sheet.waitFor();
  const fileInput = sheet.locator('input[type="file"]');
  const importButton = sheet.getByRole('button', { name: 'Import JSON', exact: true });
  let importRequests = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/exam-planning/import' && request.method() === 'PUT') importRequests++; });
  const upload = async value => fileInput.setInputFiles({ name: 'planning.json', mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) });
  const changedEntry = { ...entry, lessons: ['الجملة الاسمية', 'Révision importée'] };
  const document = { ...exported, classes: [{ ...exportedClass, months: { '2026-11': [changedEntry], '2027-01': [] } }] };

  for (const [value, message] of [
    ['{broken', 'Invalid planning JSON. Check the format, version, dates, subjects and lessons.'],
    [{ ...document, version: 99 }, 'Invalid planning JSON. Check the format, version, dates, subjects and lessons.'],
    [{ ...document, schoolYear: '2025-2026', classes: [{ ...exportedClass, months: {} }] }, 'This file belongs to another school year. Select that year before importing.'],
    [{ ...document, classes: [{ ...exportedClass, name: 'Unknown class' }] }, 'Some classes in this file do not exist in the selected school year.'],
    [{ ...document, classes: [{ ...exportedClass, months: { '2026-11': [{ ...entry, date: '2026-11-31' }] } }] }, 'Invalid planning JSON. Check the format, version, dates, subjects and lessons.'],
    [' '.repeat(5 * 1024 * 1024 + 1), 'The JSON file must be 5 MB or smaller.'],
  ]) {
    await upload(value);
    await sheet.getByRole('alert').filter({ hasText: message }).waitFor();
    assert(await importButton.isDisabled());
  }
  assert.equal(importRequests, 0, 'Invalid files must make no write requests');
  assert.deepEqual(await ownPlan(), savedExportedClass, 'Validation failures preserve saved planning');
  console.log('PASS invalid JSON, version, year, class, date and size are refused without writes');

  await upload({ ...document, classes: document.classes.map(cls => ({ ...cls, id: 'another-machine-class' })) });
  await sheet.getByText('1 classes · 2 months · 1 exams', { exact: true }).waitFor();
  const failImport = route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Injected test outage' }) });
  await page.route('**/api/exam-planning/import', failImport);
  await importButton.click();
  await sheet.getByRole('alert').filter({ hasText: 'The planning could not be imported. Try again.' }).waitFor();
  assert.deepEqual(await ownPlan(), savedExportedClass, 'A failed request must preserve saved planning');
  await page.unroute('**/api/exam-planning/import', failImport);
  importRequests = 0;
  const importResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/exam-planning/import' && response.request().method() === 'PUT');
  await importButton.click();
  assert.equal((await importResponse).status(), 200);
  await sheet.waitFor({ state: 'hidden' });
  assert.equal(importRequests, 1, 'The whole import uses one request');
  await page.reload();
  await page.getByRole('button', { name: className, exact: true }).click();
  await page.waitForFunction(value => document.querySelector('#planning-lessons')?.value === value, changedEntry.lessons.join('\n'));
  assert.deepEqual((await ownPlan()).months, { '2026-11': [changedEntry], '2026-12': [december], '2027-01': [] });
  assert.deepEqual((await plans()).filter(cls => cls.id !== classId), baseline);
  await page.screenshot({ path: resolve(root, '.cache/planning-json-imported.png'), fullPage: true });
  console.log('PASS preview, failed-import retry, atomic import, reload persistence, empty-month clearing and preservation of omitted months/classes');

  // Server validation still applies when a caller bypasses the file picker.
  for (const [bad, status] of [
    [{ ...document, version: 2 }, 400],
    [{ ...document, schoolYear: '2025-2026', classes: [{ ...exportedClass, months: {} }] }, 400],
    [{ ...document, classes: [document.classes[0], { ...exportedClass, name: 'Unknown class', months: {} }] }, 404],
    [{ ...document, classes: [document.classes[0], { ...exportedClass, name: ` ${className.toLowerCase()} `, months: {} }] }, 400],
  ]) assert.equal((await api('/exam-planning/import', 'PUT', { document: bad })).status, status);
  const unsigned = await fetch(`${origin}/api/exam-planning/import`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ document }) });
  assert.equal(unsigned.status, 401);
  assert.deepEqual((await ownPlan()).months, { '2026-11': [changedEntry], '2026-12': [december], '2027-01': [] });
  console.log('PASS REST schema/year/class validation, unauthenticated refusal and no partial writes');

  // Visibility is restored from the file, while exports continue to include hidden classes.
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await upload({ ...document, classes: [{ ...document.classes[0], visible: false }] });
  await sheet.getByText('1 classes · 2 months · 1 exams', { exact: true }).waitFor();
  await importButton.click();
  await sheet.waitFor({ state: 'hidden' });
  assert.equal(await page.getByRole('button', { name: className, exact: true }).count(), 0);
  const hidden = (await downloadJson()).classes.find(cls => cls.name === className);
  assert.equal(hidden.visible, false);
  assert.deepEqual(hidden.months['2026-12'], [december]);
  console.log('PASS restored visibility and export of hidden classes with no entries in the current view');

  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await upload({ ...document, classes: [{ ...document.classes[0], visible: true }] });
  await sheet.getByText('1 classes · 2 months · 1 exams', { exact: true }).waitFor();
  await importButton.click();
  await sheet.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: className, exact: true }).click();

  await page.screenshot({ path: resolve(root, '.cache/planning-json-desktop.png'), fullPage: true });
  await page.waitForFunction(() => !document.querySelector('[data-sonner-toast]'), null, { timeout: 12000 });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await sheet.waitFor();
    await page.waitForFunction(() => {
      const element = document.querySelector('[role="dialog"]');
      if (!element) return false;
      const box = element.getBoundingClientRect();
      return box.x >= -1 && box.x + box.width <= innerWidth + 1;
    }, null, { timeout: 5000 });
    const box = await sheet.boundingBox();
    assert(box && box.x >= -1 && box.x + box.width <= width + 1, `Import sheet fully visible at ${width}px`);
    assert(await sheet.getByText('Import planning for the selected school year. Included months replace their saved entries, including empty months. Class visibility is restored; other months and classes stay unchanged.', { exact: true }).isVisible(), 'Import replacement instructions stay visible on mobile');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No page overflow at ${width}px`);
    assert(await sheet.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `No import sheet overflow at ${width}px`);
    await page.screenshot({ path: resolve(root, `.cache/planning-json-mobile-${width}.png`), fullPage: true });
    await sheet.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('PASS 320/390px import sheet, no horizontal overflow and no browser runtime errors');

  // Add test-owned hidden and other-year plans to prove clearing has the correct scope.
  for (const [name, scope, month, visible] of [
    [`Hidden JSON ${Date.now()}`, year, '2027-02', false],
    [`Past JSON ${Date.now()}`, '2025-2026', '2025-11', true],
  ]) {
    const created = await api('/classes', 'POST', { name, level: 'Middle' }, scope);
    assert.equal(created.status, 200);
    const id = created.body.data.id;
    extraClasses.push({ id, scope });
    assert.equal((await api('/exam-planning/import', 'PUT', { document: { ...document, schoolYear: scope,
      classes: [{ id, name, visible, months: { [month]: [{ ...entry, date: `${month}-09` }] } }] } }, scope)).status, 200);
  }
  const pastBefore = (await api('/exam-planning', 'GET', undefined, '2025-2026')).body.data;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await page.getByRole('button', { name: className, exact: true }).click();
  await page.locator('#planning-lessons').fill('Unsaved clear test');
  let clearRequests = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/exam-planning' && request.method() === 'DELETE') clearRequests++; });
  const clearButton = page.getByRole('button', { name: 'Clear all', exact: true });
  await clearButton.click();
  const confirmation = page.getByRole('dialog', { name: 'Clear all planning?', exact: true });
  await confirmation.waitFor();
  assert((await confirmation.textContent()).includes(year), 'Confirmation names the selected year');
  assert.equal(clearRequests, 0, 'Opening the dialog must not clear planning');
  await page.setViewportSize({ width: 320, height: 900 });
  await page.waitForFunction(() => {
    const box = document.querySelector('[role="dialog"]')?.getBoundingClientRect();
    return box && box.x >= -1 && box.x + box.width <= innerWidth + 1;
  });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Clear confirmation fits mobile');
  await page.screenshot({ path: resolve(root, '.cache/planning-clear-confirmation.png'), fullPage: true });
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  await confirmation.waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.equal(clearRequests, 0);
  assert.equal(await page.locator('#planning-lessons').inputValue(), 'Unsaved clear test', 'Cancel preserves drafts');
  const beforeClear = await plans();

  await clearButton.click();
  const failClear = route => route.request().method() === 'DELETE'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Injected test outage' }) }) : route.continue();
  await page.route('**/api/exam-planning', failClear);
  await confirmation.getByRole('button', { name: 'Clear all', exact: true }).click();
  await confirmation.getByRole('alert').filter({ hasText: 'The planning could not be cleared. Try again.' }).waitFor();
  assert.deepEqual(await plans(), beforeClear, 'Failed clear preserves saved planning');
  assert.equal(await page.locator('#planning-lessons').inputValue(), 'Unsaved clear test', 'Failed clear preserves drafts');
  await page.unroute('**/api/exam-planning', failClear);
  clearRequests = 0;
  const clearResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/exam-planning' && response.request().method() === 'DELETE');
  await confirmation.getByRole('button', { name: 'Clear all', exact: true }).click();
  assert.equal((await clearResponse).status(), 200);
  await confirmation.waitFor({ state: 'hidden' });
  assert.equal(clearRequests, 1, 'Confirm sends exactly one clear request');
  const afterClear = await plans();
  assert.deepEqual(afterClear, beforeClear.map(cls => ({ ...cls, months: {} })), 'All visible/hidden class months clear without changing classes or visibility');
  assert.deepEqual((await api('/exam-planning', 'GET', undefined, '2025-2026')).body.data, pastBefore, 'Other-year planning survives');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('[data-exam-planning]') && !document.querySelector('#planning-lessons'));
  assert(await clearButton.isDisabled(), 'Empty planning cannot be cleared again');
  const unsignedClear = await fetch(`${origin}/api/exam-planning`, { method: 'DELETE', headers });
  assert.equal(unsignedClear.status, 401);
  console.log('PASS clear confirmation/cancel, failed-clear retry, draft removal, all visible/hidden months, other-year preservation and reload');
} catch (error) {
  if (page) await page.screenshot({ path: resolve(root, '.cache/planning-json-failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  try {
    if (classId && context && token) {
      for (const extra of extraClasses) assert.equal((await api(`/classes/${extra.id}`, 'DELETE', undefined, extra.scope)).status, 200, 'Remove each extra test-owned class');
      assert.equal((await api(`/classes/${classId}`, 'DELETE')).status, 200, 'Remove the test-owned class');
      assert.deepEqual(await plans(), baseline, 'Fixture planning restored after cleanup');
      console.log('PASS fixture cleanup; no main-school records were changed');
    }
  } finally {
    await context?.close();
    if (server.exitCode === null) { const stopped = once(server, 'exit'); server.kill(); await stopped; }
    await log.close();
  }
}
