'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PrefetchKind } from 'next/dist/client/components/router-reducer/router-reducer-types';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useAuth, usePermissions } from 'najm-auth/client/react';
import type { NavItem } from 'najm-kit';
import { useAcademicYearScope } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { useAcademicYearOptions, useViewingYearCalendar } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { datedRosterDay, dateWithinYear } from '@/features/AcademicYears/utils/viewingYear';
import { useSchoolToday } from '@/hooks/useSchoolFormat';
import { isSchoolWideRole } from '@/shared/pageAccess';
import { navHrefs, warmupPages } from './warmupPages';

// After the page on screen has had nothing loading for this long, the warm-up
// starts; between two warmed pages it waits for a shorter quiet spell, so a
// page the user opens meanwhile is read first.
const FIRST_QUIET_MS = 1500;
const NEXT_QUIET_MS = 300;

// One finished or running warm-up per account, year and page list for the
// life of the tab. A run cut short (the shell unmounting) may start again;
// what it already read is fresh and is not asked for twice.
const started = new Set<string>();

const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Resolves once nothing the page on screen shows is loading or saving, and
 * has not been for `quietMs`, then waits for the browser to be idle. The
 * warm-up's own reads have no page watching them, so they do not count.
 */
async function whenQuiet(client: QueryClient, stopped: () => boolean, quietMs: number) {
  let quietSince: number | undefined;
  while (!stopped()) {
    const busy = document.readyState !== 'complete' || client.isFetching({ type: 'active' }) > 0 || client.isMutating() > 0;
    const now = performance.now();
    if (busy) quietSince = undefined;
    else if (quietSince === undefined) quietSince = now;
    else if (now - quietSince >= quietMs) break;
    await pause(200);
  }
  // Safari has no requestIdleCallback.
  await new Promise<void>((resolve) => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => resolve(), { timeout: 2000 });
    else setTimeout(resolve, 0);
  });
}

/**
 * Warms the pages this account uses most, so opening one shows its data at
 * once. After the page on screen has loaded, it fetches each page's code and
 * server part (`router.prefetch`) and its opening reads into the query cache,
 * one page after another. Nothing waits for it and nothing is shown: a page
 * opened later finds its answers in the cache and refreshes them as usual.
 * The cache keeps them for as long as it keeps any unwatched answer.
 */
export function PageWarmup({ navItems }: { navItems: readonly NavItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const client = useQueryClient();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { accountScope, academicYear, ready: yearReady } = useAcademicYearScope();
  const { isFetched: yearsFetched } = useAcademicYearOptions();
  const calendar = useViewingYearCalendar();
  const today = useSchoolToday();
  const currentPath = useRef(pathname);
  currentPath.current = pathname;

  const role = (user as { role?: string } | null)?.role;
  const canCreateStudents = role !== 'parent' && role !== 'student' && can('create:students');
  const canReadMassar = can('read:massar');
  // As the Massar page decides it: a school-wide role that manages Massar also reads its setup.
  const canManageMassar = isSchoolWideRole(role) && can('manage:massar');
  const pages = warmupPages(navHrefs(navItems)).join(' ');
  // The registers open on today, kept inside the viewed year; wait for the
  // year's calendar so the day matches the one they will ask for.
  const registerDate = dateWithinYear(today, calendar);
  const rosterDay = datedRosterDay(registerDate, academicYear, calendar);
  const ready = yearReady && yearsFetched && pages !== '';

  useEffect(() => {
    const run = [accountScope, academicYear, pages, registerDate, rosterDay, canCreateStudents, canReadMassar, canManageMassar].join('|');
    if (!ready || started.has(run)) return;
    started.add(run);
    let stopped = false;
    let finished = false;
    const isStopped = () => stopped;
    void (async () => {
      await whenQuiet(client, isStopped, FIRST_QUIET_MS);
      if (stopped) return;
      const { warmPageData } = await import('./pageReads');
      const context = { client, scope: { accountScope, academicYear }, registerDate, rosterDay, canCreateStudents, canReadMassar, canManageMassar };
      for (const href of pages.split(' ')) {
        if (stopped) return;
        if (href === currentPath.current) continue;
        router.prefetch(href, { kind: PrefetchKind.FULL });
        await warmPageData(href, context);
        await whenQuiet(client, isStopped, NEXT_QUIET_MS);
      }
      finished = true;
    })();
    return () => {
      stopped = true;
      if (!finished) started.delete(run);
    };
  }, [ready, client, router, accountScope, academicYear, pages, registerDate, rosterDay, canCreateStudents, canReadMassar, canManageMassar]);

  return null;
}
