'use client';
import { useMemo, useSyncExternalStore } from 'react';
const EVENT = 'school-offline-navigation';
const listen = (listener: () => void) => { addEventListener('popstate', listener); addEventListener(EVENT, listener); return () => { removeEventListener('popstate', listener); removeEventListener(EVENT, listener); }; };
function navigate(href: string, replace = false) {
  const target = new URL(href, location.href);
  if (target.origin !== location.origin) throw new Error('External navigation requires a document link');
  history[replace ? 'replaceState' : 'pushState'](null, '', target.href);
  dispatchEvent(new Event(EVENT));
}
export function usePathname() { return useSyncExternalStore(listen, () => location.pathname, () => '/'); }
export function useSearchParams() { const search = useSyncExternalStore(listen, () => location.search, () => ''); return useMemo(() => new URLSearchParams(search), [search]); }
export function useParams() { const path = usePathname(); const match = /^\/(?:students|parents|teachers)\/([^/]+)/.exec(path); return match ? { id: decodeURIComponent(match[1]) } : {}; }
const router = { push: (href: string) => navigate(href), replace: (href: string) => navigate(href, true), back: () => history.back(), forward: () => history.forward(), refresh: () => dispatchEvent(new Event(EVENT)), prefetch: async () => undefined };
export function useRouter() { return router; }
export function redirect(href: string): never { navigate(href, true); throw new Error('Offline route redirected'); }
export function notFound(): never { throw new Error('Offline route not found'); }
