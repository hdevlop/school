'use client';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NajmAppProvider } from 'najm-next/app/client';
import { defineNajmTanStackQuery } from 'najm-next/query/tanstack';
import { NSidebar, NSidebarProvider, type LinkComponentType } from 'najm-kit';
import { NThemeImage } from 'najm-theme/react';
import { useTranslation } from 'najm-i18n/react';
import { schoolI18n } from '@sms/contracts/locales';
import { BOOTSTRAP_KEY, SHELL_BRANDING, readBootstrap, routeForPath, withPreferenceChoices, type ShellBootstrap, type ShellPreferences } from './bootstrap';
import { auth } from './auth';
import { schoolApp } from '@/najm.config';
import { configureShellParams, SHELL_NAVIGATION_EVENT, usePathname } from 'najm-offline/shell/navigation';
import { CachedAccountContext } from 'najm-offline/shell/auth';
import { withCachedBranding } from 'najm-offline/pwa';
import { UnpreparedDevice } from './UnpreparedDevice';
import { connectShellUpdates, rememberOfflineLanguage } from './updates';
import StudentProfile from '@/features/Students/components/StudentProfile';
import { StudentReadView } from './StudentReadView';
import { useYearSelectionStore } from '@/features/AcademicYears/store/yearSelectionStore';
import { canUseLegacyDisplay, readCachedPresentation, cachedExpiryDelay, pointerValue, updatePresentation, type CachedPresentation } from './access';
import { connectOfflineRuntime, installShellTransport, observeOffline, renewOffline } from './runtime';
import { useQueryClient } from '@tanstack/react-query';
import StudentsTable from '@/features/Students/components/StudentsTable';
import { RenderedActiveAcademicYearProvider } from '@/features/Settings/context/RenderedActiveAcademicYear';
import { AcademicYearSelectionOwner } from '@/features/AcademicYears/components/AcademicYearSelectionOwner';
import { createShellNavItems, navLabel } from './shellNavigation';
import { useOnlineRecovery } from './onlineRecovery';

installShellTransport();
// The shell has no route tree: profile pages read their id from the path.
configureShellParams(path => {
  const match = /^\/(?:students|parents|teachers)\/([^/]+)/.exec(path);
  return match ? { id: decodeURIComponent(match[1]) } : {};
});
const query = defineNajmTanStackQuery({ queries: { networkMode: 'always', retry: false } });
const tableDefaults = { mobileList: true };

const LocalLink: LinkComponentType = props => <a {...props} />;

function App({ bootstrap, privateAccess }: { bootstrap: ShellBootstrap; privateAccess: boolean }) {
  const client = useQueryClient();
  const source = useRef(bootstrap);
  useEffect(() => { source.current = bootstrap; }, [bootstrap]);
  // A layout effect, so the runtime connects before any query in this commit
  // subscribes (a passive effect): the shell refuses reads made without it.
  useLayoutEffect(() => connectOfflineRuntime(client, () => source.current, true), [client]);
  const path = usePathname();
  const { t, language } = useTranslation();
  // Online HTML gets these attributes from its server layout. The neutral
  // entry must seed them from the same active provider language at startup.
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = schoolI18n.direction(language);
    void rememberOfflineLanguage(language);
    // Downloads only when this language's copy is missing or stale.
    if (privateAccess) void renewOffline();
  }, [language, privateAccess]);
  useEffect(() => {
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest('a');
      if (event.defaultPrevented || !anchor || anchor.dataset.online !== undefined || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || anchor.target || anchor.download) return;
      const url = new URL(anchor.href);
      if (url.origin !== location.origin || !routeForPath(bootstrap.routes, url.pathname)) return;
      event.preventDefault();
      history.pushState(null, '', url.pathname + url.search + url.hash);
      dispatchEvent(new Event(SHELL_NAVIGATION_EVENT));
    };
    document.addEventListener('click', navigate);
    return () => document.removeEventListener('click', navigate);
  }, [bootstrap.routes]);
  useEffect(() => {
    if (!privateAccess) {
      const store = useYearSelectionStore.getState();
      store.initialize({ accountId: bootstrap.accountId, canChooseYear: false, entryLabel: undefined });
      store.setActiveLabel(bootstrap.academicYear);
    }
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const version = document.querySelector('meta[name="school-shell-version"]')?.getAttribute('content');
    if (version) void connectShellUpdates(version, () => false, () => undefined).then(updates => {
      if (cancelled) { updates.dispose(); return; }
      dispose = updates.dispose;
    }).catch(() => undefined);
    return () => { cancelled = true; dispose?.(); };
  }, [bootstrap.accountId, bootstrap.academicYear, bootstrap.role, privateAccess]);
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
      {(!privateAccess || route?.href !== '/students') && <section className="mt-6 rounded-lg border bg-card p-6"><p>{t(route ? 'offlineShell.noData' : 'offlineShell.unavailable')}</p></section>}
      {privateAccess && path === '/students' && <StudentsTable />}
      {bootstrap.academicYear && route?.href === '/students' && /^\/students\/[^/]+$/.test(path) && (privateAccess
        ? <StudentReadView studentId={decodeURIComponent(path.split('/')[2])} />
        : <StudentProfile studentId={decodeURIComponent(path.split('/')[2])} />)}
    </main>
  </div></NSidebarProvider>;
}

function Boot() {
  useOnlineRecovery();
  const hasReadAccount = () => { try { return !!JSON.parse(pointerValue() ?? 'null')?.accountId; } catch { return true; } };
  const load = () => { try { return hasReadAccount() ? null : readBootstrap(localStorage); } catch { return null; } };
  const [bootstrap, setBootstrap] = useState(load);
  const [presentation, setPresentation] = useState<CachedPresentation<ShellBootstrap> | null>(null);
  // Preferences chosen in this document win over a re-read or renewal that
  // captured older values before the choice was stored.
  const chosen = useRef<Partial<ShellPreferences>>({});
  const withChoices = <T extends ShellBootstrap | null>(value: T) => withPreferenceChoices(value, chosen.current);
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
    let stopped = false;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      const next = await readCachedPresentation();
      const legacyAllowed = !next && await canUseLegacyDisplay();
      if (stopped) return;
      setPresentation(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      setBootstrap(previous => {
        const value = withChoices(next?.bootstrap ?? (legacyAllowed ? readBootstrap(localStorage) : null));
        return JSON.stringify(previous) === JSON.stringify(value) ? previous : value;
      });
      clearTimeout(expiry);
      if (next) {
        const delay = await cachedExpiryDelay();
        if (!stopped) expiry = setTimeout(() => { void check(); }, Math.max(1, delay));
      }
    };
    const tick = () => { void check(); };
    const timer = setInterval(tick, 30_000);
    const unsubscribe = observeOffline(tick);
    addEventListener('storage', tick);
    document.addEventListener('visibilitychange', tick);
    void check();
    return () => { stopped = true; clearInterval(timer); clearTimeout(expiry); unsubscribe(); removeEventListener('storage', tick); document.removeEventListener('visibilitychange', tick); };
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
    void Promise.race([withCachedBranding(SHELL_BRANDING, value).catch(() => value), fallback]).then(resolved => { if (!cancelled) setBranding(resolved); });
    return () => { cancelled = true; };
  }, [brandingSource]);
  if (!bootstrap) {
    const messages = schoolI18n.translations[language as keyof typeof schoolI18n.translations] ?? schoolI18n.translations.en;
    return <UnpreparedDevice messages={messages.offlineShell} />;
  }
  if (bootstrap.ui.branding && !branding) return null;
  const persist = (field: 'language' | 'theme' | 'timeZone', value: string) => {
    document.cookie = `${schoolApp.preferences.cookieNames[field]}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    chosen.current = { ...chosen.current, [field]: value };
    // Renewal reads the shell's bootstrap, so it now enrolls the chosen value too.
    setBootstrap(previous => withChoices(previous));
    if (!presentation) {
      // A display-only shell keeps the choice in its prepared record for the next launch.
      try {
        const current = readBootstrap(localStorage);
        if (current) localStorage.setItem(BOOTSTRAP_KEY, JSON.stringify(withChoices(current)));
      } catch { /* Storage denial keeps the choice for this document only. */ }
      return;
    }
    void updatePresentation(presentation.grant.accountId, withChoices).catch(() => undefined);
  };
  return <CachedAccountContext.Provider value={presentation?.grant ?? null}><NajmAppProvider authClient={auth.client} query={query} snapshot={{ ...bootstrap.ui, ...(branding ? { branding } : {}), session: null }} i18n={schoolI18n} tableDefaults={tableDefaults} location={false} formDevTools={false} uiRuntime={{
    onLanguageChange: value => persist('language', value), onThemeChange: value => persist('theme', value), onTimeZoneChange: value => persist('timeZone', value),
  }}><RenderedActiveAcademicYearProvider value={bootstrap.academicYear}>{presentation && <AcademicYearSelectionOwner />}<App bootstrap={bootstrap} privateAccess={!!presentation} /></RenderedActiveAcademicYearProvider></NajmAppProvider></CachedAccountContext.Provider>;
}

createRoot(document.getElementById('root')!).render(<Boot />);
