import { useEffect } from 'react';
import { SHELL_NAVIGATION_EVENT } from 'najm-offline/shell/navigation';
import { hasGradeDrafts, shellUpdates } from './updates';

/** A network connection alone does not establish that School can serve this page. */
export async function isOnlinePageReady(url: string, signal: AbortSignal, request: typeof fetch = fetch): Promise<boolean> {
  try {
    const health = await request(new URL('/api/health/status', url), {
      cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]),
    });
    if (signal.aborted || !health.ok || !health.headers.get('content-type')?.includes('application/json')) return false;
    const response = await request(url, { cache: 'no-store', credentials: 'same-origin', signal });
    // Preserve real sign-in redirects and 4xx pages. A failed server, download,
    // captive portal or cached shell is not a reason to leave the offline view.
    if (response.status < 200 || response.status >= 500 || response.headers.has('content-disposition')
      || !response.headers.get('content-type')?.includes('text/html')
      || (response.url && new URL(response.url).origin !== new URL(url).origin)) return false;
    const html = await response.text();
    return !signal.aborted && !!html.trim() && !/<meta\b[^>]*\bname\s*=\s*["']school-shell-version["']/i.test(html);
  } catch { return false; }
}

function hasOpenWork() {
  if (hasGradeDrafts(sessionStorage)) return true;
  return [...document.querySelectorAll('form:not([role="search"]), [role="dialog"], [role="alertdialog"], input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="hidden"]), textarea, select, [contenteditable="true"]')]
    .some(element => element.getClientRects().length > 0 && !element.closest('[role="search"]')
      && (element.matches('form, [role="dialog"], [role="alertdialog"]')
        || (!element.matches(':disabled, [readonly]') && shellUpdates.isUpdateEdit(element))));
}

/** Only mounted in the neutral shell, including its unprepared-device screen. */
export function useOnlineRecovery() {
  useEffect(() => {
    let disposed = false;
    let navigating = false;
    let pending: AbortController | undefined;
    const cooldownKey = 'school.offline-return.v1';
    const canCheck = () => navigator.onLine && document.visibilityState !== 'hidden';
    const check = async () => {
      if (disposed || navigating || pending || !canCheck()) return;
      const url = location.href;
      try {
        if (hasOpenWork()) return;
        const last = JSON.parse(sessionStorage.getItem(cooldownKey) ?? 'null');
        // Bound retries across document reloads if a page becomes slow again
        // between this probe and the worker's subsequent navigation request.
        if (last?.url === url && Date.now() - last.at < 60_000) return;
      } catch { return; }
      const controller = new AbortController();
      pending = controller;
      try {
        const ready = await isOnlinePageReady(url, AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]));
        if (!ready || disposed || controller.signal.aborted || location.href !== url
          || !canCheck() || hasOpenWork()) return;
        sessionStorage.setItem(cooldownKey, JSON.stringify({ url, at: Date.now() }));
        navigating = true;
        location.reload();
      } catch { /* Keep the offline view and its manual retry available. */ }
      finally { pending = undefined; }
    };
    const wake = () => { void check(); };
    const offline = () => pending?.abort();
    const timer = setInterval(wake, 15_000);
    window.addEventListener('online', wake);
    window.addEventListener('offline', offline);
    window.addEventListener('focus', wake);
    window.addEventListener('popstate', wake);
    window.addEventListener(SHELL_NAVIGATION_EVENT, wake);
    document.addEventListener('visibilitychange', wake);
    wake();
    return () => {
      disposed = true; pending?.abort(); clearInterval(timer);
      window.removeEventListener('online', wake);
      window.removeEventListener('offline', offline);
      window.removeEventListener('focus', wake);
      window.removeEventListener('popstate', wake);
      window.removeEventListener(SHELL_NAVIGATION_EVENT, wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, []);
}
