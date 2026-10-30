// Browser verification with mocked academic/student data. No school record writes.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const origin = process.env.BIRTHPLACE_UI_ORIGIN || 'http://localhost:3102';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Use the local app');
assert(process.env.SCHOOL_ADMIN_EMAIL && process.env.SCHOOL_ADMIN_PASSWORD, 'Local admin credentials required');
const browser = await chromium.launch({ headless: true });
try {
  console.log('Checking local login and mocked student form');
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  await context.addCookies([{ name: 'school-ui-language', value: 'en', url: origin }]);
  const login = await context.request.post(`${origin}/api/auth/login`, { data: { email: process.env.SCHOOL_ADMIN_EMAIL, password: process.env.SCHOOL_ADMIN_PASSWORD }, timeout: 30_000 });
  assert.equal(login.status(), 200, 'Local admin login');
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(90_000);
  const year = { id: 'birthplace-ui-year', label: '2026-2027', status: 'open', provenance: 'verified', instructionStartsOn: '2026-09-01', instructionEndsOn: '2027-06-30', reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31', paymentCloseoutOn: '2027-08-31' };
  let recordWrites = 0;
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()) && !path.startsWith('/api/auth/')) {
      if (/^\/api\/(students|parents|fees|payments)(\/|$)/.test(path)) recordWrites++;
      return route.abort();
    }
    const mock = path === '/api/academic-years' ? { activeAcademicYearId: year.id, years: [year] }
      : path === '/api/settings/public' ? { currentAcademicYear: year.label, businessDate: '2026-10-29' }
      : path === '/api/classes' ? [{ id: 'c', name: 'CE1', academicYear: year.label, sections: [{ id: 's', name: 'A' }] }]
      : path === '/api/students' || path === '/api/fee-types' ? [] : undefined;
    if (mock !== undefined) return route.fulfill({ json: { success: true, data: mock } });
    return route.continue();
  });
  await page.goto(`${origin}/students`);
  await page.getByRole('button', { name: 'Create Student', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  const picker = dialog.getByRole('combobox', { name: 'Birthplace', exact: true });
  await picker.waitFor();
  assert.equal(await dialog.getByLabel('Birthplace (Latin script)', { exact: true }).count(), 0);
  assert.equal(await dialog.getByLabel('Birthplace (Arabic)', { exact: true }).count(), 0);
  await dialog.getByText('Use Latin - Arabic, e.g. Casablanca - الدار البيضاء.', { exact: true }).waitFor();
  await picker.click();
  await page.getByPlaceholder('Search in Arabic or Latin script', { exact: true }).fill('Casablanca');
  await page.getByRole('option').filter({ hasText: /^Casablanca / }).click();
  assert.equal((await picker.textContent()).trim(), 'Casablanca - الدار البيضاء');
  assert(!(await picker.textContent()).includes('Préfecture'));
  await picker.click();
  await page.getByPlaceholder('Search in Arabic or Latin script', { exact: true }).fill('Madrid - مدريد');
  await page.getByRole('option', { name: 'Use "Madrid - مدريد"', exact: true }).click();
  assert.equal((await picker.textContent()).trim(), 'Madrid - مدريد');
  await picker.click();
  await page.getByPlaceholder('Search in Arabic or Latin script', { exact: true }).fill('فاس');
  await page.getByRole('option').filter({ hasText: /^Fès / }).click();
  assert.equal((await picker.textContent()).trim(), 'Fès - فاس');
  await picker.click();
  await page.getByRole('option', { name: 'Clear birthplace', exact: true }).click();
  assert.equal((await picker.textContent()).trim(), 'Search in Arabic or Latin script');
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await picker.isVisible(), 'Single birthplace field remains available on mobile');
  assert.equal(recordWrites, 0);
  console.log('PASS single birthplace field, bilingual catalog/manual entries, clearing, mobile form, zero school record writes');
} finally { await browser.close(); }
