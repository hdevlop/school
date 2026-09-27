'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from 'najm-auth/client/react';
import { canUseOtherAcademicYears } from '@sms/contracts/academic-years';
import { useActiveAcademicYear } from '@/features/Settings/hooks/useSettings';
import { useYearSelectionStore } from '../store/yearSelectionStore';
import { readViewingYear, VIEWING_YEAR_PARAM } from '../utils/viewingYear';

function currentEntryLabel() {
  return readViewingYear(new URLSearchParams(window.location.search));
}

/**
 * The signed-in part: follows the school's active year, restores this
 * account's selection and applies legacy `?academicYear=` links. Mounted only
 * with an account, since the active year comes from signed-in settings.
 */
function SignedInSelection({ accountId, canChooseYear }: { accountId: string; canChooseYear: boolean }) {
  const { academicYear: activeLabel, isAcademicYearLoading } = useActiveAcademicYear();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const entryLabel = readViewingYear(searchParams);
  const status = useYearSelectionStore((state) => state.status);
  const ownerAccountId = useYearSelectionStore((state) => state.accountId);

  useEffect(() => {
    useYearSelectionStore.getState().setActiveLabel(isAcademicYearLoading ? undefined : activeLabel);
  }, [activeLabel, isAcademicYearLoading]);

  useEffect(() => {
    useYearSelectionStore.getState().initialize({ accountId, canChooseYear, entryLabel: currentEntryLabel() });
  }, [accountId, canChooseYear]);

  // A legacy link carrying `?academicYear=` selects that year for this tab,
  // then the parameter is removed so the address is never a second owner.
  useEffect(() => {
    if (!entryLabel || status !== 'ready' || ownerAccountId !== accountId) return;
    useYearSelectionStore.getState().applyEntryLink(entryLabel, canChooseYear);
    const rest = new URLSearchParams(searchParams.toString());
    rest.delete(VIEWING_YEAR_PARAM);
    const query = rest.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}${window.location.hash}`, { scroll: false });
  }, [entryLabel, status, ownerAccountId, accountId, canChooseYear, searchParams, pathname, router]);

  return null;
}

/**
 * Keeps the tab's viewing-year selection in step with the signed-in account.
 * A different (or no) account first drops the previous one's cached protected
 * data; remembered choices stay under each account's own storage key. Mounted
 * once at the root, above the pages and the dialog host; renders nothing.
 */
function SelectionOwner() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const account = user as { id?: string; role?: string } | null;
  const accountId = account?.id ?? null;
  const queryClient = useQueryClient();
  const previousAccountId = useRef<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    const previous = previousAccountId.current;
    previousAccountId.current = accountId;
    if (previous && previous !== accountId) queryClient.clear();
    if (!accountId) useYearSelectionStore.getState().clear();
  }, [isAuthLoading, accountId, queryClient]);

  if (isAuthLoading || !accountId) return null;
  return <SignedInSelection accountId={accountId} canChooseYear={canUseOtherAcademicYears(account?.role)} />;
}

export function AcademicYearSelectionOwner() {
  return (
    <Suspense fallback={null}>
      <SelectionOwner />
    </Suspense>
  );
}
