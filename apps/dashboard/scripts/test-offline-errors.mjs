// Negative control for browser acceptance: native diagnostics must not hide real JS failures.
import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';
import { createOfflineBrowserErrorAudit } from './offline-browser-errors.mjs';

for (const engineName of (process.env.OFFLINE_BROWSERS ?? 'chromium').split(',')) {
  assert(['chromium', 'firefox', 'webkit'].includes(engineName));
  const browser = await { chromium, firefox, webkit }[engineName].launch({ headless: true });
  try {
    const context = await browser.newContext();
    const origin = 'https://127.0.0.1:1/';
    const audit = createOfflineBrowserErrorAudit(engineName, origin);
    await audit.attach(context);
    const page = await context.newPage();
    await page.goto('data:text/html,<!doctype html><title>Offline error audit negative control</title>');
    await page.evaluate(() => {
      setTimeout(() => { throw new Error('Expected audit exception'); }, 0);
      Promise.reject(new TypeError('Expected audit rejection'));
      // Even the exact native-diagnostic text is a failure when JS actually rejects it.
      Promise.reject(new Error('Fetch API cannot load https://127.0.0.1:1/api/offline/grant due to access control checks.'));
    });
    const end = Date.now() + 10_000;
    const hasException = () => audit.errors.some(error => ['error', 'pageerror'].includes(error.kind) && error.message.includes('Expected audit exception'));
    while (!hasException()
      || audit.errors.filter(error => error.kind === 'unhandledrejection').length < 2) {
      assert(Date.now() < end, 'Browser error/rejection events must reach the audit: ' + JSON.stringify(audit.errors));
      await new Promise(done => setTimeout(done, 50));
    }
    assert(hasException());
    assert(audit.errors.some(error => error.kind === 'unhandledrejection' && error.message === 'Expected audit rejection'));
    assert(audit.errors.some(error => error.kind === 'unhandledrejection' && error.message.startsWith('Fetch API cannot load https:')));
    // A navigation excuses only the native stopped-context diagnostic, never a thrown lookalike.
    await page.goto('data:text/html,<!doctype html><title>Offline error audit navigation control</title>');
    await page.evaluate(() => { setTimeout(() => { throw Object.assign(new Error('Context is stopped'), { name: 'Cache API operation failed' }); }, 0); });
    const lookalike = () => audit.errors.some(error => error.kind === 'pageerror' && error.message === 'Context is stopped');
    while (!lookalike()) {
      assert(Date.now() < end, 'A stopped-context lookalike after navigation must reach the audit: ' + JSON.stringify(audit.errors));
      await new Promise(done => setTimeout(done, 50));
    }
    console.log(`${engineName}: PASS error audit detects real uncaught exceptions and unhandled rejections, including native-diagnostic lookalikes`);
  } finally { await browser.close(); }
}
