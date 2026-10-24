'use client';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'najm-i18n/react';
import type { NavItem } from 'najm-kit';
import type { SchoolUiSnapshot } from '@/najm.server';
import { auth } from '@/najm.auth';
import { createSidebarItems } from '@/shared/schoolNavigation';
import { isShellPath, SHELL_PREPARATION_DURATION_MS, type ShellBootstrap, type ShellRoute } from './bootstrap';
import { connectOfflineRuntime, renewOffline } from './runtime';

export function OfflineRuntime({ snapshot }: { snapshot: SchoolUiSnapshot }) {
  const client = useQueryClient();
  const { t, language } = useTranslation();
  const source = useRef<() => ShellBootstrap | null>(() => null);
  useEffect(() => {
    source.current = () => {
      const user = auth.client.getState().user;
      if (!user) return null;
      const routes: ShellRoute[] = [];
      const visit = (items: NavItem[]) => items.forEach(item => {
        if (item.href && isShellPath(item.href)) routes.push({ href: item.href, label: String(item.label) });
        if (item.children) visit(item.children);
      });
      visit(createSidebarItems(t, { role: user.role, can: permission => auth.client.can(permission) }));
      if (routes.length) routes.unshift({ href: '/home', label: t('mobileHome.title') });
      return { version: 1, accountId: user.id, role: user.role ?? undefined, routes,
        expiresAt: Date.now() + SHELL_PREPARATION_DURATION_MS, academicYear: snapshot.settings.activeAcademicYear ?? undefined,
        ui: { app: snapshot.app, preferences: { ...snapshot.preferences, language }, appearance: snapshot.appearance, branding: snapshot.branding } };
    };
    // Renewal downloads only missing or stale coverage, including a language not downloaded yet.
    void renewOffline();
  }, [snapshot, t, language]);
  useEffect(() => {
    return connectOfflineRuntime(client, () => source.current());
  }, [client]);
  return null;
}
