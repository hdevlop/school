/** Keep WebKit's native fetch console diagnostics separate from JavaScript errors.
 * Actual error/unhandledrejection events still fail, including one with the same text.
 */
export function createOfflineBrowserErrorAudit(engine, origin) {
  const errors = [];
  const diagnostics = [];
  const failed = new Set();
  const failedResources = [];
  const closing = new WeakSet();
  // When each page last began or committed a navigation, which stops the previous document.
  const navigated = new WeakMap();
  const stopping = page => closing.has(page.context()) || Date.now() - (navigated.get(page) ?? -Infinity) < 5000;
  const prefix = 'Fetch API cannot load ';
  const suffix = ' due to access control checks.';
  const observe = page => {
    page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigated.set(page, Date.now()); });
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigated.set(page, Date.now()); });
    page.on('pageerror', error => {
      const line = error.stack?.split('\n')[0] ?? '';
      if (engine === 'webkit' && error.name === 'Fetch API cannot load https' && line.startsWith(prefix + origin) && line.endsWith(suffix)) {
        const url = line.slice(prefix.length, -suffix.length);
        diagnostics.push({ kind: 'fetch', url, message: line });
        console.error('Native WebKit fetch diagnostic:', line);
      } else if (engine === 'webkit' && !error.stack && error.name === 'Cannot load https'
        && error.message.startsWith('/' + new URL(origin).host + '/images/student_') && error.message.endsWith('.')) {
        const url = 'https:/' + error.message.slice(0, -1);
        diagnostics.push({ kind: 'fetch', url, message: 'Cannot load ' + url });
      } else if (engine === 'webkit' && !error.stack && error.name === 'FetchEvent.respondWith received an error'
        && error.message === 'TypeError: Load failed') {
        diagnostics.push({ kind: 'worker-resource', message: error.name + ': ' + error.message });
      } else if (engine === 'webkit' && !error.stack && error.name === 'Cache API operation failed'
        && error.message === 'Context is stopped' && stopping(page)) {
        // A Cache API call of a document that a close or navigation stopped.
        diagnostics.push({ kind: 'closing-context', message: error.name + ': ' + error.message });
      } else errors.push({ kind: 'pageerror', name: error.name, message: error.message, stack: error.stack });
    });
  };
  return { get errors() {
    // A matching real failed request is required; an arbitrary exception is not excused.
    const unmatched = diagnostics.filter(item => item.kind === 'fetch' && !failed.has(item.url));
    if (diagnostics.filter(item => item.kind === 'worker-resource').length > failedResources.length)
      unmatched.push({ message: 'Unmatched worker resource failures' });
    return [...errors, ...unmatched.map(item => ({ kind: 'unmatched-fetch-diagnostic', message: item.message }))];
  }, diagnostics, async close(context) {
    if (!context) return;
    closing.add(context); await context.close();
  }, async attach(context) {
    await context.exposeBinding('schoolRecordBrowserError', (_source, error) => { errors.push(error); });
    await context.addInitScript(() => {
      const report = error => { void window.schoolRecordBrowserError(error).catch(() => undefined); };
      addEventListener('unhandledrejection', event => report({ kind: 'unhandledrejection',
        message: String(event.reason?.message ?? event.reason) }));
      addEventListener('error', event => {
        // Resource-load events have no Error object. Real uncaught JS exceptions do.
        if (event.error) report({ kind: 'error', message: event.message });
      });
    });
    context.on('page', observe);
    context.on('requestfailed', request => {
      failed.add(request.url());
      const url = new URL(request.url());
      if (url.origin === new URL(origin).origin && request.method() === 'GET'
        && (url.pathname.startsWith('/images/') || url.pathname === '/favicon.ico')) failedResources.push(request.url());
    });
    for (const page of context.pages()) observe(page);
  } };
}
