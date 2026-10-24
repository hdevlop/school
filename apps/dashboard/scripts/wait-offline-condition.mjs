// In this Playwright version waitForFunction treats an async predicate's
// Promise as truthy before it resolves. Evaluate/await each check explicitly.
export async function waitForOfflineCondition(page, predicate, arg, { timeout = 30000, polling = 100 } = {}) {
  const deadline = Date.now() + timeout;
  do {
    const result = await page.evaluate(predicate, arg);
    if (result) return result;
    if (Date.now() >= deadline) break;
    await new Promise(resolve => setTimeout(resolve, polling));
  } while (Date.now() < deadline);
  throw new Error(`Offline condition did not become true within ${timeout} ms`);
}
