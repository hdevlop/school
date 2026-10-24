'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NajmAppProvider } from 'najm-next/app/client';
import { defineNajmTanStackQuery } from 'najm-next/query/tanstack';
import { NSidebar, NSidebarProvider, type LinkComponentType } from 'najm-kit';
import { NThemeImage } from 'najm-theme/react';
import { useTranslation } from 'najm-i18n/react';
import { schoolI18n } from '@sms/contracts/locales';
import { BOOTSTRAP_KEY, readBootstrap, routeForPath, type ShellBootstrap } from './bootstrap';
import { auth } from './auth';
import { schoolApp } from '@/najm.config';
import { usePathname } from './navigation';
import { connectShellUpdates } from './updates';
import StudentProfile from '@/features/Students/components/StudentProfile';
import { useYearSelectionStore } from '@/features/AcademicYears/store/yearSelectionStore';
import { installUnavailableTransport } from './transport';
import { createShellNavItems, navLabel } from './shellNavigation';
import { withCachedBranding } from './branding';

installUnavailableTransport();
const query = defineNajmTanStackQuery({ queries: { networkMode: 'always', retry: false } });
const tableDefaults = { mobileList: true };

const LocalLink: LinkComponentType = props => <a {...props} />;

function App({ bootstrap }: { bootstrap: ShellBootstrap }) {
  const path = usePathname();
  const [updateReady, setUpdateReady] = useState(false);
  const [updateAction, setUpdateAction] = useState<(() => Promise<void>) | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [reachable, setReachable] = useState(false);
  const { t, language } = useTranslation();
  // Online HTML gets these attributes from its server layout. The neutral
  // entry must seed them from the same active provider language at startup.
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = schoolI18n.direction(language);
  }, [language]);
  useEffect(() => {
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest('a');
      if (event.defaultPrevented || !anchor || anchor.dataset.online !== undefined || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || anchor.target || anchor.download) return;
      const url = new URL(anchor.href);
      if (url.origin !== location.origin || !routeForPath(bootstrap.routes, url.pathname)) return;
      event.preventDefault();
      history.pushState(null, '', url.pathname + url.search + url.hash);
      dispatchEvent(new Event('school-offline-navigation'));
    };
    document.addEventListener('click', navigate);
    return () => document.removeEventListener('click', navigate);
  }, [bootstrap.routes]);
  useEffect(() => {
    const store = useYearSelectionStore.getState();
    store.initialize({ accountId: bootstrap.accountId, canChooseYear: false, entryLabel: null });
    store.setActiveLabel(bootstrap.academicYear);
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const version = document.querySelector('meta[name="school-shell-version"]')?.getAttribute('content');
    if (version) void connectShellUpdates(version, () => false, setUpdateReady).then(updates => {
      if (cancelled) { updates.dispose(); return; }
      dispose = updates.dispose;
      setUpdateAction(() => async () => {
        setUpdating(true); setBlocked(false);
        try { const result = await updates.activate(); setBlocked(!result.activated); if (result.activated) setUpdateReady(false); }
        catch { setBlocked(true); }
        finally { setUpdating(false); }
      });
    }).catch(() => undefined);
    const check = async () => {
      // Avoid unnecessary probes when the browser already reports a definite
      // disconnection. An associated Wi-Fi connection still gets a real probe.
      if (!navigator.onLine) { if (!cancelled) setReachable(false); return; }
      try {
        const response = await fetch('/api/health/status', { cache: 'no-store', signal: AbortSignal.timeout(3000) });
        if (!cancelled) setReachable(response.ok && (response.headers.get('content-type') ?? '').includes('json'));
      } catch { if (!cancelled) setReachable(false); }
    };
    void check(); const timer = setInterval(() => { void check(); }, 30_000);
    return () => { cancelled = true; dispose?.(); clearInterval(timer); };
  }, [bootstrap.accountId, bootstrap.academicYear]);
  const route = routeForPath(bootstrap.routes, path);
  const navItems = useMemo(() => createShellNavItems(t, bootstrap.role, bootstrap.routes), [t, bootstrap.role, bootstrap.routes]);
  const appName = bootstrap.ui.app?.appName ?? 'MyScolAI';
  return <NSidebarProvider><div className="flex h-dvh bg-background text-foreground">
    <NSidebar linkComponent={LocalLink} navItems={navItems} activePath={route?.href ?? path}
      classNames={{ sidebarHeader: 'h-24 min-h-24 border-b-0' }}
      // The online sidebar's branding slots, served from the stored copies.
      logo={({ collapsed, isMobile }) => {
        const expanded = isMobile || !collapsed;
        return <div className="flex w-full min-w-0 items-center justify-center">
          <NThemeImage slot={expanded ? 'sidebarLogoExpanded' : 'sidebarLogoCollapsed'} alt={appName}
            className={expanded ? 'h-20 w-20 min-w-20 object-contain' : 'h-12 w-12 min-w-12 object-contain'}
            placeholder={<span className="font-semibold">{appName}</span>} />
        </div>;
      }} />
    <main className="min-w-0 flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between gap-4"><h1 className="text-xl font-semibold">{navLabel(navItems, route?.href) ?? route?.label ?? t('offlineShell.title')}</h1>
        <a data-online className="rounded-md border px-3 py-2 text-sm" href={location.href}>{t('offlineShell.retry')}</a></div>
      {reachable && <p>{t('offlineShell.onlineAvailable')}</p>}
      {updateReady && <button type="button" disabled={updating} onClick={() => { void updateAction?.(); }}>{t('offlineShell.update')}</button>}
      {blocked && <p>{t('offlineShell.updateBlocked')}</p>}
      <section className="mt-6 rounded-lg border bg-card p-6"><p>{t(route ? 'offlineShell.noData' : 'offlineShell.unavailable')}</p></section>
      {bootstrap.academicYear && route?.href === '/students' && /^\/students\/[^/]+$/.test(path) && <StudentProfile studentId={decodeURIComponent(path.split('/')[2])} />}
    </main>
  </div></NSidebarProvider>;
}

function Boot() {
  const load = () => { try { return readBootstrap(localStorage); } catch { return null; } };
  const [bootstrap, setBootstrap] = useState(load);
  const prepared = !!bootstrap;
  useEffect(() => {
    if (prepared || !('serviceWorker' in navigator)) return;
    let stopped = false;
    let dispose: (() => void) | undefined;
    const version = document.querySelector('meta[name="school-shell-version"]')?.getAttribute('content');
    if (version) void connectShellUpdates(version, () => false, () => undefined).then(updates => {
      if (stopped) updates.dispose(); else dispose = updates.dispose;
    }).catch(() => undefined);
    return () => { stopped = true; dispose?.(); };
  }, [prepared]);
  const language = navigator.language.split('-')[0];
  useEffect(() => {
    if (!bootstrap) {
      document.documentElement.lang = language in schoolI18n.translations ? language : 'en';
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [bootstrap, language]);
  useEffect(() => {
    const check = () => { try { setBootstrap(readBootstrap(localStorage)); } catch { setBootstrap(null); } };
    const timer = setInterval(check, 30_000);
    addEventListener('storage', check);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(timer); removeEventListener('storage', check); document.removeEventListener('visibilitychange', check); };
  }, []);
  // Stored sidebar logos replace API image paths the worker cannot serve. Read
  // them before mounting the provider, which takes its branding once.
  const brandingSource = JSON.stringify(bootstrap?.ui.branding ?? null);
  const [branding, setBranding] = useState<ShellBootstrap['ui']['branding'] | null>(null);
  useEffect(() => {
    const value = JSON.parse(brandingSource) as ShellBootstrap['ui']['branding'] | null;
    if (!value) return;
    let cancelled = false;
    const fallback = new Promise<typeof value>(resolve => setTimeout(() => resolve(value), 2000));
    void Promise.race([withCachedBranding(value).catch(() => value), fallback]).then(resolved => { if (!cancelled) setBranding(resolved); });
    return () => { cancelled = true; };
  }, [brandingSource]);
  if (!bootstrap) {
    const messages = schoolI18n.translations[language as keyof typeof schoolI18n.translations] ?? schoolI18n.translations.en;
    return <main><h1>MyScolAI</h1><p>{messages.offlineShell.prepare}</p><a href="/login">{messages.offlineShell.signIn}</a></main>;
  }
  if (bootstrap.ui.branding && !branding) return null;
  const persist = (field: 'language' | 'theme' | 'timeZone', value: string) => {
    const current = readBootstrap(localStorage);
    if (current) {
      document.cookie = `${schoolApp.preferences.cookieNames[field]}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
      localStorage.setItem(BOOTSTRAP_KEY, JSON.stringify({ ...current, ui: { ...current.ui, preferences: { ...current.ui.preferences, [field]: value } } }));
    }
  };
  return <NajmAppProvider authClient={auth.client} query={query} snapshot={{ ...bootstrap.ui, ...(branding ? { branding } : {}), session: null }} i18n={schoolI18n} tableDefaults={tableDefaults} location={false} formDevTools={false} uiRuntime={{
    onLanguageChange: value => persist('language', value), onThemeChange: value => persist('theme', value), onTimeZoneChange: value => persist('timeZone', value),
  }}><App bootstrap={bootstrap} /></NajmAppProvider>;
}

createRoot(document.getElementById('root')!).render(<Boot />);
