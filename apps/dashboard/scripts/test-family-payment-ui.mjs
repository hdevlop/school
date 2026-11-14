// Browser check of the family payment: a real parent and real fees are read
// from the local app, but the payment itself is intercepted and answered with
// a mock receipt, and every other write is blocked. No school record changes.
//
//   SCHOOL_ADMIN_EMAIL=... SCHOOL_ADMIN_PASSWORD=... FAMILY_UI_PARENT_ID=... \
//     node apps/dashboard/scripts/test-family-payment-ui.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const origin = process.env.FAMILY_UI_ORIGIN || 'http://localhost:3102';
const parentId = process.env.FAMILY_UI_PARENT_ID;
const shots = process.env.FAMILY_UI_SCREENSHOTS || join(process.cwd(), '.cache', 'family-payment-ui');
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Use the local app');
assert(process.env.SCHOOL_ADMIN_EMAIL && process.env.SCHOOL_ADMIN_PASSWORD, 'Local admin credentials required');
assert(parentId, 'FAMILY_UI_PARENT_ID: a parent with at least two children who owe fees this year');
await mkdir(shots, { recursive: true });

const MOCK_ID = 'mock-family-receipt';
const MOCK_NUMBER = 'RCP-MOCK-FAMILY';
const browser = await chromium.launch({ headless: true });
const blockedWrites = [];
let sentPayload = null;
let mockReceipt = null;

const step = (text) => console.log(`- ${text}`);

try {
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  await context.addCookies([{ name: 'school-ui-language', value: 'en', url: origin }]);
  const login = await context.request.post(`${origin}/api/auth/login`, {
    data: { email: process.env.SCHOOL_ADMIN_EMAIL, password: process.env.SCHOOL_ADMIN_PASSWORD }, timeout: 30_000,
  });
  assert.equal(login.status(), 200, 'Local admin login');
  step('signed in');

  const childrenResponse = await context.request.get(`${origin}/api/parents/${parentId}/children`, { timeout: 30_000 });
  assert.equal(childrenResponse.status(), 200, 'Parent children read');
  const children = (await childrenResponse.json()).data;
  assert(children.length > 1, 'The parent has several children');
  const nameOf = new Map(children.map((child) => [child.id, child]));
  step(`parent has ${children.length} children`);

  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    if (method === 'POST' && path === '/api/payments/family') {
      sentPayload = request.postDataJSON();
      const payments = sentPayload.children.map((child, index) => {
        const amount = child.allocations.reduce((sum, line) => sum + Math.round(line.amount * 100), 0) / 100;
        const student = nameOf.get(child.studentId);
        return {
          id: `mock-payment-${index + 1}`, studentId: child.studentId, amount: amount.toFixed(2), status: 'completed',
          receiptNumber: `${MOCK_NUMBER}-${index + 1}`, familyReceiptId: MOCK_ID, familyReceiptNumber: MOCK_NUMBER,
          paymentDate: sentPayload.paymentDate, paymentMethod: sentPayload.paymentMethod,
          student: { id: child.studentId, name: student?.name ?? child.studentId, studentCode: student?.studentCode ?? '' },
          receiptItems: [{ feeType: 'Mensualité', feeTypeLabels: null, academicYear: '2026-2027', schedule: 'monthly',
            dueDates: ['2026-11-01'], amount: amount.toFixed(2), remainingAmount: '0' }],
        };
      });
      const total = payments.reduce((sum, payment) => sum + Math.round(Number(payment.amount) * 100), 0) / 100;
      mockReceipt = { id: MOCK_ID, receiptNumber: MOCK_NUMBER, parentId, parent: { id: parentId, name: 'Mock payer' },
        amount: total.toFixed(2), status: 'completed', paymentDate: sentPayload.paymentDate,
        paymentMethod: sentPayload.paymentMethod, payments };
      return route.fulfill({ json: { success: true, message: 'Payment recorded', data: mockReceipt } });
    }
    if (method === 'GET' && path === `/api/payments/family/${MOCK_ID}`) {
      return route.fulfill({ json: { success: true, data: mockReceipt } });
    }
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && !path.startsWith('/api/auth/')) {
      blockedWrites.push(`${method} ${path}`);
      return route.abort();
    }
    return route.continue();
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(120_000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  // 1. From the parent's profile.
  await page.goto(`${origin}/parents/${parentId}`);
  const open = page.getByRole('button', { name: 'Family payment', exact: true });
  await open.waitFor();
  step('parent profile shows "Family payment"');
  await open.click();

  const dialog = page.getByRole('dialog');
  await dialog.getByText(`children: ${children.length}`, { exact: false }).waitFor();
  for (const child of children) await dialog.getByRole('button', { name: new RegExp(child.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().waitFor();
  step('dialog lists every child');

  const allDue = dialog.getByRole('button', { name: /Everything due, all children/ });
  await allDue.waitFor();
  // Enabled once every child's fees have loaded and something is due.
  for (let tries = 0; tries < 60 && !(await allDue.isEnabled()); tries++) await page.waitForTimeout(500);
  assert(await allDue.isEnabled(), 'Something is due for the family');
  const allDueLabel = (await allDue.textContent()).trim();
  await allDue.click();
  step(`clicked "${allDueLabel}"`);
  await dialog.getByText(/Selected: \d+/).first().waitFor();
  // The register's own "Selected: N" counts lines; the children show an amount.
  const selectedLabels = (await dialog.getByText(/^Selected: /).allTextContents())
    .filter((label) => !/^Selected: \d+$/.test(label.trim()));
  step(`children with a selection: ${selectedLabels.length} (${selectedLabels.join(' / ')})`);
  await page.screenshot({ path: join(shots, '1-family-dialog.png'), fullPage: false });

  const record = dialog.getByRole('button', { name: 'Record Payment', exact: true });
  for (let tries = 0; tries < 20 && !(await record.isEnabled()); tries++) await page.waitForTimeout(250);
  await record.click();

  const prompt = page.getByText(`Receipt No. ${MOCK_NUMBER}`, { exact: true });
  await prompt.waitFor();
  assert(sentPayload, 'The family payment was sent');
  assert.equal(sentPayload.parentId, parentId);
  assert.equal(typeof sentPayload.idempotencyKey, 'string');
  assert(!('amount' in sentPayload), 'No single amount: each child pays its own lines');
  const childOrder = children.map((child) => child.id);
  const sentIds = sentPayload.children.map((child) => child.studentId);
  assert.deepEqual(sentIds, childOrder.filter((id) => sentIds.includes(id)), 'Children in the order shown');
  assert(sentIds.length >= 2, 'At least two children paid');
  for (const child of sentPayload.children) {
    assert(child.allocations.length > 0);
    for (const line of child.allocations) assert(line.feeId && line.number > 0 && line.amount > 0, JSON.stringify(line));
  }
  assert.equal(selectedLabels.length, sentIds.length, 'Every paid child showed what was selected for them');
  await page.getByText(`Children paid: ${sentIds.length}`, { exact: true }).waitFor();
  step(`sent one family payment: ${sentIds.length} children, total ${mockReceipt.amount}`);
  await page.screenshot({ path: join(shots, '2-recorded-prompt.png') });

  // 2. The printed receipt, from the prompt.
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Print receipt', exact: true }).click();
  const popup = await popupPromise;
  await popup.waitForFunction((number) => document.body?.innerText.includes(number), MOCK_NUMBER, { timeout: 30_000 });
  const html = await popup.content();
  assert(html.includes('Mock payer'), 'Receipt names the payer');
  for (const payment of mockReceipt.payments) assert(html.includes(payment.student.name), `Receipt names ${payment.student.name}`);
  assert.equal((html.match(/class="subtotal"/g) || []).length, mockReceipt.payments.length, 'One subtotal per child');
  await popup.screenshot({ path: join(shots, '3-family-receipt.png'), fullPage: true });
  step('printed one receipt with the payer, each child and a subtotal per child');
  await popup.close();

  // 3. From one child's fees page.
  const firstChild = children[0];
  await page.goto(`${origin}/students/${firstChild.id}/fees`);
  const strip = page.getByRole('button', { name: 'Pay for the family', exact: true });
  await strip.waitFor({ timeout: 60_000 });
  for (const sibling of children.slice(1)) await page.getByText(sibling.name, { exact: false }).first().waitFor();
  step('child fees page names the siblings and offers "Pay for the family"');
  await page.screenshot({ path: join(shots, '4-student-fees-strip.png') });
  await strip.click();
  await page.getByRole('dialog').getByText(`children: ${children.length}`, { exact: false }).waitFor();
  step('"Pay for the family" opens the same family payment');
  await page.screenshot({ path: join(shots, '5-family-dialog-from-child.png') });

  // 4. Phone width: the columns stack.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(shots, '6-family-dialog-phone.png') });

  const financeWrites = blockedWrites.filter((write) => /\/api\/(payments|fees|installments|student-credits|students|parents)(\/|$)/.test(write));
  assert.deepEqual(financeWrites, [], 'No school record write left the browser');
  assert.deepEqual(pageErrors, [], 'No uncaught page errors');
  step(`no school record writes (${blockedWrites.length} other non-read requests blocked)`);
  console.log(`\nPASS - screenshots in ${shots}`);
} finally {
  await browser.close();
}
