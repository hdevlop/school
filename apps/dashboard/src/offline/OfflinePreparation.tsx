'use client';

import { useEffect, useState } from 'react';
import { useAuth } from 'najm-auth/client/react';
import { useTranslation } from 'najm-i18n/react';
import { useQueryClient } from '@tanstack/react-query';
import { auth } from '@/najm.auth';
import { connectShellUpdates } from './updates';
import { connectPreparationLogout } from './preparationLifecycle';
import { registerSchoolShell, prepareSchoolShell } from './registration';
import { cacheShellBranding } from './branding';
import type { NavItem } from 'najm-kit';
import type { SchoolUiSnapshot } from '@/najm.server';
import { createSidebarItems } from '@/shared/schoolNavigation';
import { BOOTSTRAP_KEY, SHELL_PREPARATION_DURATION_MS, isShellPath, type ShellRoute } from './bootstrap';

export function OfflinePreparation({ snapshot }: { snapshot: SchoolUiSnapshot }) {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();
  const [updateReady, setUpdateReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [activate, setActivate] = useState<(() => Promise<void>) | null>(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    try { return connectPreparationLogout(auth.client, localStorage); } catch { return; }
  }, []);
  useEffect(() => {
    if (isLoading) return;
    const prepareDisplay = () => { try {
      // A missing user can be a transient refresh failure. Explicit logout
      // clears this UI-only stopgap via the auth event above.
      const currentUser = auth.client.getState().user;
      if (!currentUser || currentUser.id !== user?.id) return;
      const routes: ShellRoute[] = [];
      const visit = (items: NavItem[]) => items.forEach(item => {
        if (item.href && isShellPath(item.href)) routes.push({ href: item.href, label: String(item.label) });
        if (item.children) visit(item.children);
      });
      visit(createSidebarItems(t, { role: currentUser.role, can: permission => auth.client.can(permission) }));
      if (routes.length) routes.unshift({ href: '/home', label: t('mobileHome.title') });
      // Explicit projection: session, tokens and School settings never enter storage.
      // The role only selects the sidebar layout the shell draws for these routes.
      localStorage.setItem(BOOTSTRAP_KEY, JSON.stringify({ version: 1, accountId: currentUser.id, role: currentUser.role ?? undefined,
        expiresAt: Date.now() + SHELL_PREPARATION_DURATION_MS, routes, academicYear: snapshot.settings.activeAcademicYear ?? undefined,
        ui: { app: snapshot.app, preferences: snapshot.preferences, appearance: snapshot.appearance, branding: snapshot.branding },
      }));
    } catch { /* Storage denial leaves offline preparation unavailable. */ } };
    prepareDisplay();
    // Explicit successful-auth renewal, not incidental permission-hook identity.
    // This remains display metadata; Phase 1 must request a fresh server grant.
    auth.client.on('tokenRefresh', prepareDisplay);
    return () => auth.client.off('tokenRefresh', prepareDisplay);
  }, [user, isLoading, t, snapshot]);
  const signedIn = !!user;
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !signedIn || typeof caches === 'undefined') return;
    // Silent and optional: without a stored logo the shell shows the app name.
    void cacheShellBranding(snapshot.branding).catch(() => undefined);
  }, [signedIn, snapshot.branding]);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    const abort = new AbortController();
    let dispose: (() => void) | undefined;
    const runningVersion = process.env.NEXT_PUBLIC_SCHOOL_SHELL_VERSION;
    if (!runningVersion) return;
    // Every online tab participates in consent/pinning once a worker is active,
    // even if installation failed or this opening exhausted its retry budget.
    void connectShellUpdates(runningVersion, () => queryClient.isMutating() > 0, value => { if (!cancelled) setUpdateReady(value); }).then(updates => {
      if (cancelled) { updates.dispose(); return; }
      dispose = updates.dispose;
      setActivate(() => async () => {
        setUpdating(true); setBlocked(false);
        try { const result = await updates.activate(); setBlocked(!result.activated); if (result.activated) setUpdateReady(false); }
        catch { setBlocked(true); }
        finally { setUpdating(false); }
      });
    }).catch(() => { /* No active worker/storage yet; preparation stays silent. */ });
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest('a');
      if (navigator.onLine || !anchor || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || anchor.target || anchor.download) return;
      const url = new URL(anchor.href);
      if (url.origin === location.origin && isShellPath(url.pathname)) {
        event.preventDefault(); event.stopImmediatePropagation(); location.assign(url.href);
      }
    };
    document.addEventListener('click', navigate, true);
    void prepareSchoolShell(runningVersion, async () => {
      await registerSchoolShell(navigator.serviceWorker, 30000, abort.signal);
      if (cancelled) return;
      const response = await fetch('/offline-shell/manifest.json', { cache: 'no-store', signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10000)]) });
      if (!response.ok) throw new Error('Offline application manifest is unavailable.');
      await response.json();
    }, abort.signal);
    return () => { cancelled = true; abort.abort(); dispose?.(); document.removeEventListener('click', navigate, true); };
  }, [queryClient]);
  return updateReady || blocked ? <aside data-school-offline-status className="fixed bottom-2 end-2 z-40 max-w-sm rounded-md border bg-background px-3 py-2 text-xs" aria-live="polite">
    {updateReady && <button data-school-offline-action="update" type="button" disabled={updating} className="ms-3 underline" onClick={() => { void activate?.(); }}>{t('offlineShell.update')}</button>}
    {blocked && <p>{t('offlineShell.updateBlocked')}</p>}
  </aside> : null;
}
