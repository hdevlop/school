// Local browser acceptance. Only a role's order is saved, then restored in finally.
// Permission and visibility drafts are discarded without saving.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { resolveAdminSeedCredentials } from '../../../packages/seed/src/scripts/admin/adminSeedConfig.ts';

const origin = process.env.SIDEBAR_UI_ORIGIN || 'http://localhost:3102';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Use the local app');
const credentials = process.env.SCHOOL_ADMIN_EMAIL && process.env.SCHOOL_ADMIN_PASSWORD
  ? { email: process.env.SCHOOL_ADMIN_EMAIL, password: process.env.SCHOOL_ADMIN_PASSWORD }
  : resolveAdminSeedCredentials(process.env);
const artifactDir = resolve('.cache/sidebar-ui');
await mkdir(artifactDir, { recursive: true });
console.log('Launching Playwright Chromium');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
let page;
let baseline;
let roleId;
let token;
let mayHaveSaved = false;
const errors = [];
const failures = [];
const results = [];
const pass = name => { results.push(name); console.log(`PASS ${name}`); };
const unwrap = body => body.data ?? body;
const row = id => page.locator(`[data-sidebar-layout-item="${id}"]`);
const panel = () => page.getByRole('tabpanel', { name: 'Sidebar', exact: true });
const rootList = () => panel().locator('ol').first();
const rootIds = () => rootList().locator(':scope > li').evaluateAll(items => items.map(item => item.dataset.sidebarLayoutItem));
const permissionIds = snapshot => snapshot.permissions.map(permission => permission.id).sort();
async function api(path, method = 'GET', data) {
  const response = await context.request.fetch(`${origin}/api${path}`, {
    method, headers: { Authorization: `Bearer ${token}` }, ...(data === undefined ? {} : { data }), timeout: 60_000,
  });
  const body = await response.json();
  assert(response.ok(), `${method} ${path}: HTTP ${response.status()} ${body.message ?? ''}`);
  return unwrap(body);
}
async function discard() {
  const button = page.getByRole('button', { name: 'Discard', exact: true });
  if (await button.isEnabled()) await button.click();
}
async function openReview() {
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Review changes', exact: true });
  await dialog.waitFor();
  return dialog;
}
async function noOverflow(label) {
  const overflow = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth,
    panels: [...document.querySelectorAll('[role="tabpanel"]')].filter(el => el.getBoundingClientRect().width).map(el => ({ client: el.clientWidth, scroll: el.scrollWidth })) }));
  assert(overflow.document <= overflow.viewport + 1, `${label}: page horizontal overflow ${JSON.stringify(overflow)}`);
  assert(overflow.panels.every(el => el.scroll <= el.client + 1), `${label}: sidebar editor horizontal overflow ${JSON.stringify(overflow)}`);
}

try {
  await context.addCookies([{ name: 'school-ui-language', value: 'en', url: origin }]);
  console.log('Signing in to the local app');
  const login = await context.request.post(`${origin}/api/auth/login`, { data: credentials, timeout: 120_000 });
  assert.equal(login.status(), 200, 'Local admin login');
  const signedIn = unwrap(await login.json());
  token = signedIn.accessToken ?? signedIn.tokens?.accessToken;
  assert(token, 'Admin access token');
  const roles = await api('/roles');
  const target = roles.find(role => role.name === 'floor_manager');
  assert(target, 'Existing Monitor role');
  roleId = target.id;
  baseline = await api(`/admin/access/roles/${roleId}`);
  console.log('Opening Roles and permissions');

  page = await context.newPage();
  page.setDefaultTimeout(25_000);
  page.setDefaultNavigationTimeout(120_000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 500) failures.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  page.on('dialog', dialog => dialog.accept());
  await page.goto(`${origin}/roles`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Roles', exact: true }).getByRole('button', { name: 'Monitor', exact: true }).click();
  await page.getByRole('heading', { name: 'Monitor', exact: true }).waitFor();
  await page.getByRole('tab', { name: 'Sidebar', exact: true }).click();
  await row('/students').waitFor();
  await noOverflow('desktop');
  await page.screenshot({ path: resolve(artifactDir, 'desktop.png'), animations: 'disabled' });
  pass('desktop Sidebar tab, grouped rows, visibility controls and no horizontal overflow');

  const originalOrder = await rootIds();
  const first = rootList().locator(':scope > li').first();
  await first.locator(':scope > div').first().getByRole('button', { name: /^Move .+ down$/ }).click();
  assert.equal((await rootIds())[1], originalOrder[0]);
  await discard();
  assert.deepEqual(await rootIds(), originalOrder);
  pass('up/down reordering and Discard restore the original order');

  const attendanceChildren = row('attendance').locator('ol').first().locator(':scope > li');
  const childrenBefore = await attendanceChildren.evaluateAll(items => items.map(item => item.dataset.sidebarLayoutItem));
  await attendanceChildren.first().locator(':scope > div').first().getByRole('button', { name: /^Move .+ down$/ }).click();
  assert.equal((await attendanceChildren.evaluateAll(items => items.map(item => item.dataset.sidebarLayoutItem)))[1], childrenBefore[0]);
  assert.deepEqual(await rootIds(), originalOrder);
  await discard();
  pass('child reordering stays inside its group');

  await row('/students').getByRole('button', { name: 'Reorder Students', exact: true }).scrollIntoViewIfNeeded();
  const studentsHandle = row('/students').getByRole('button', { name: 'Reorder Students', exact: true });
  const parentsHandle = row('/parents').getByRole('button', { name: 'Reorder Parents', exact: true });
  const start = await studentsHandle.boundingBox();
  const end = await parentsHandle.boundingBox();
  assert(start && end);
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2 + 10, start.y + start.height / 2, { steps: 3 });
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2 + 8, { steps: 12 });
  await page.mouse.up();
  assert.notDeepEqual(await rootIds(), originalOrder, 'Pointer drag changes the order');
  await discard();
  pass('pointer dragging reorders pages');

  let editableVisibility;
  for (const id of ['/students', '/parents', '/teachers']) {
    const checkbox = row(id).getByRole('checkbox');
    if (await checkbox.isEnabled()) { editableVisibility = checkbox; break; }
  }
  assert(editableVisibility, 'Monitor has an allowed page with editable visibility');
  const shown = await editableVisibility.isChecked();
  await editableVisibility.click();
  assert.equal(await editableVisibility.isChecked(), !shown);
  const visibilityReview = await openReview();
  await visibilityReview.getByText(shown ? 'Hide from sidebar' : 'Show in sidebar', { exact: true }).waitFor();
  await visibilityReview.getByRole('button', { name: 'Cancel', exact: true }).click();
  await discard();
  assert.equal(await editableVisibility.isChecked(), shown);
  assert.deepEqual(permissionIds(await api(`/admin/access/roles/${roleId}`)), permissionIds(baseline));
  pass('visibility toggle, review, Cancel and Discard preserve saved permissions');

  const denied = row('/staff').getByRole('checkbox');
  if (await denied.count()) assert(await denied.isDisabled(), 'Pages without View access cannot be enabled');
  const firstForSave = rootList().locator(':scope > li').first();
  await firstForSave.locator(':scope > div').first().getByRole('button', { name: /^Move .+ down$/ }).click();
  const changedOrder = await rootIds();
  const review = await openReview();
  await review.getByText('Sidebar order updated', { exact: true }).waitFor();
  await page.screenshot({ path: resolve(artifactDir, 'review-desktop.png'), animations: 'disabled' });
  const savedResponse = page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname === `/api/admin/access/roles/${roleId}`);
  mayHaveSaved = true;
  await review.getByRole('button', { name: 'Apply changes', exact: true }).click();
  const response = await savedResponse;
  assert.equal(response.status(), 200, 'Saving the reordered layout');
  await review.waitFor({ state: 'hidden' });
  const saved = await api(`/admin/access/roles/${roleId}`);
  assert.deepEqual(permissionIds(saved), permissionIds(baseline), 'Order-only saves preserve permission and visibility grants');
  assert(saved.sidebarOrder.length > 0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Roles', exact: true }).getByRole('button', { name: 'Monitor', exact: true }).click();
  await page.getByRole('heading', { name: 'Monitor', exact: true }).waitFor();
  await page.getByRole('tab', { name: 'Sidebar', exact: true }).click();
  await row('/students').waitFor();
  assert.deepEqual(await rootIds(), changedOrder, 'Saved order survives reload');
  pass('order saves through the real API, survives reload and preserves all grants');

  const reset = panel().getByRole('button', { name: 'Reset order', exact: true });
  await reset.click();
  assert.equal((await rootIds())[0], '/dashboard');
  await discard();
  assert.deepEqual(await rootIds(), changedOrder);
  pass('Reset order restores defaults without saving, and Discard restores the saved layout');

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await row('/students').scrollIntoViewIfNeeded();
    await noOverflow(`mobile ${width}`);
    assert(await row('/students').getByRole('checkbox').isVisible());
    assert(await row('/students').getByRole('button', { name: 'Reorder Students', exact: true }).isVisible());
    await page.screenshot({ path: resolve(artifactDir, `mobile-${width}.png`), animations: 'disabled' });
    const studentRow = row('/students');
    const move = studentRow.locator(':scope > div').first().getByRole('button', { name: /^Move .+ down$/ });
    await move.click();
    const mobileReview = await openReview();
    await noOverflow(`mobile dialog ${width}`);
    await page.screenshot({ path: resolve(artifactDir, `review-mobile-${width}.png`), animations: 'disabled' });
    await mobileReview.getByRole('button', { name: 'Cancel', exact: true }).click();
    await discard();
  }
  pass('390px and 320px mobile layouts, arrow controls and review dialog');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('navigation', { name: 'Roles', exact: true }).getByRole('button', { name: /^admin(?:\s|$)/i }).click();
  await page.getByRole('heading', { name: /^admin$/i }).waitFor();
  await page.getByRole('tab', { name: 'Sidebar', exact: true }).click();
  await row('/students').waitFor();
  assert(await row('/students').getByRole('checkbox').isDisabled());
  assert(await row('/students').getByRole('button', { name: 'Move Students down', exact: true }).isEnabled());
  pass('Admin access stays protected while menu ordering remains available');
  await page.route('**/api/navigation/sidebar', route => route.fulfill({ json: { success: true, data: { order: ['/students', '/dashboard'] } } }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  const dashboardLink = page.getByRole('link', { name: 'Dashboard', exact: true });
  const studentsLink = page.getByRole('link', { name: 'Students', exact: true });
  await studentsLink.waitFor();
  await page.waitForFunction(() => {
    const links = [...document.querySelectorAll('a[href="/students"], a[href="/dashboard"]')];
    return links.findIndex(link => link.getAttribute('href') === '/students') < links.findIndex(link => link.getAttribute('href') === '/dashboard');
  });
  assert((await studentsLink.boundingBox()).y < (await dashboardLink.boundingBox()).y);
  pass('the application sidebar renders the role order returned by its own-role endpoint');
  assert.deepEqual(errors, [], 'Browser runtime errors');
  assert.deepEqual(failures, [], 'Server errors during browser interactions');
} catch (error) {
  if (page) {
    await page.screenshot({ path: resolve(artifactDir, 'failure.png'), animations: 'disabled' }).catch(() => {});
    await writeFile(resolve(artifactDir, 'failure.txt'), `${error.stack}\n\n${await page.locator('body').innerText().catch(() => '')}`);
  }
  throw error;
} finally {
  try {
    if (mayHaveSaved && baseline && roleId) {
      const current = await api(`/admin/access/roles/${roleId}`);
      assert.deepEqual(permissionIds(current), permissionIds(baseline), 'Refuse to restore over concurrently changed grants');
      await api(`/admin/access/roles/${roleId}`, 'PUT', {
        permissionIds: current.permissions.filter(permission => !permission.name.startsWith('sidebar:')).map(permission => permission.id),
        expectedPermissionIds: current.permissions.map(permission => permission.id),
        sidebarOrder: baseline.sidebarOrder ?? [], expectedSidebarOrder: current.sidebarOrder ?? [],
      });
      const restored = await api(`/admin/access/roles/${roleId}`);
      assert.deepEqual(restored.sidebarOrder, baseline.sidebarOrder ?? []);
      assert.deepEqual(permissionIds(restored), permissionIds(baseline));
      pass('original role order and all grants restored');
    }
    await writeFile(resolve(artifactDir, 'results.json'), JSON.stringify({ results, errors, serverErrors: failures }, null, 2));
  } finally { await browser.close(); }
}
