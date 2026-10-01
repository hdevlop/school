'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from 'najm-auth/client/react';
import { canUseOtherAcademicYears } from '@sms/contracts/academic-years';
import { useActiveAcademicYear } from '@/features/Settings/hooks/useSettings';
import { getAcademicYearsApi } from '@/services/academicYearApi';
import { selectedYearLabel, useYearSelectionStore } from '../store/yearSelectionStore';
import { dateWithinYear } from '../utils/viewingYear';

/** Whether the signed-in role may open school years other than the active one. */
export function useCanUseOtherAcademicYears() {
  const { user } = useAuth();
  return canUseOtherAcademicYears((user as { role?: string } | null)?.role);
}

/**
 * The year this tab works in, from its selection (`yearSelectionStore`): the
 * selected year, or the active year in active mode. Every request sends it as
 * `X-Academic-Year`. While the selection or the active year is still loading,
 * `isResolving` holds reads back so no list renders another year's data first.
 */
export function useViewingAcademicYear() {
  const { academicYear: activeYear } = useActiveAcademicYear();
  const label = useYearSelectionStore(selectedYearLabel);
  const isExplicit = useYearSelectionStore((state) => state.selection.mode === 'explicit');
  return { activeYear, viewingYear: label, isExplicit, isResolving: !label };
}

/**
 * A React key for a year-scoped screen: changing the viewing year remounts it,
 * so filters, dialogs and picked dates of the previous year do not carry over.
 */
export function useViewingYearKey() {
  const { viewingYear, isResolving } = useViewingAcademicYear();
  return isResolving ? 'resolving' : `year:${viewingYear}`;
}

/**
 * Switches this tab to another viewing year; undefined returns to the active
 * year. The page's own address filters are dropped, since they may name
 * records of the previous year. It never changes the school's active year.
 */
export function useSetViewingYear() {
  const router = useRouter();
  const pathname = usePathname();
  const select = useYearSelectionStore((state) => state.select);
  return useCallback((year: string | undefined) => {
    select(year);
    if (window.location.search) router.replace(pathname, { scroll: false });
  }, [select, router, pathname]);
}

/** The years the signed-in role may view. */
export function useAcademicYearOptions() {
  return useQuery({
    queryKey: ['academic-years'],
    queryFn: getAcademicYearsApi,
    staleTime: 5 * 60 * 1000,
  });
}

/** The viewed year's calendar; undefined before it loads. */
export function useViewingYearCalendar() {
  const { viewingYear } = useViewingAcademicYear();
  const { data } = useAcademicYearOptions();
  return data?.years.find((year) => year.label === viewingYear);
}

/**
 * Date state for a date-driven screen. The returned date is kept inside the
 * viewed year: picking a day outside it, or viewing another year, lands on
 * that year's nearest teaching day.
 */
export function useViewingYearDate(initial: string | (() => string)) {
  const year = useViewingYearCalendar();
  const [picked, setPicked] = useState(initial);
  return [dateWithinYear(picked, year), setPicked] as const;
}
