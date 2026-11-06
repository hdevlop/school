'use client';

import type { QueryKey } from '@tanstack/react-query';
import { useEntityQuery } from 'najm-kit/query';
import { selectedYearLabel, useYearSelectionStore } from '../store/yearSelectionStore';
import { withAcademicYear, yearOfKey, yearScopedKey, type YearScope } from '../utils/yearScope';

/**
 * The tab's year scope: its account and the concrete year its reads use, or
 * `override` when a read names its own year (a form's target year, or the
 * active year for current-class names).
 */
export function useAcademicYearScope(override?: string): YearScope & { ready: boolean } {
  const accountId = useYearSelectionStore((state) => state.accountId);
  const selected = useYearSelectionStore(selectedYearLabel);
  const academicYear = override ?? selected;
  return { accountScope: accountId ?? 'anonymous', academicYear, ready: !!academicYear };
}

/** What a year-scoped read asks for. A feature exports the ones its pages open with, for the warm-up. */
export type YearScopedRead = {
  /** The entity cache namespace; mutations invalidating `[resource]` reach every year. */
  resource: string;
  /** Filters and ids after the year, part of the key. */
  parts?: readonly unknown[];
  /** Calls the API; its request carries the key's year, whatever the tab shows later. */
  fetch: () => Promise<any>;
};

type YearScopedQueryOptions = YearScopedRead & {
  enabled?: boolean;
  /** A year the read names itself instead of the tab's selection. */
  academicYear?: string;
};

/**
 * The cache key and query function of a year-scoped read. The page's hook and
 * the warm-up both build their query here, so a warmed answer lands under
 * the key the page then reads.
 */
export function yearScopedQueryOptions({ resource, parts = [], fetch }: YearScopedRead, scope: YearScope) {
  return {
    queryKey: yearScopedKey(resource, scope, ...parts),
    queryFn: ({ queryKey }: { queryKey: QueryKey }) => withAcademicYear(yearOfKey(queryKey), fetch),
  };
}

/**
 * A year-scoped read. The key and the request share one year, taken from the
 * key itself when the request starts: refetching a cached query asks for its
 * own year, not the one the page shows now, and a late response can only land
 * under the key it was asked for. Reads wait until the selection is ready.
 */
export function useYearScopedQuery({ enabled = true, academicYear, ...read }: YearScopedQueryOptions) {
  const scope = useAcademicYearScope(academicYear);
  const query = useEntityQuery<any>({
    ...yearScopedQueryOptions(read, scope),
    enabled: enabled && scope.ready,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  return { query, scope };
}

/** A year-scoped list, in the shape `useEntityCRUD` lists return. */
export function useYearScopedList(options: YearScopedQueryOptions) {
  const { query, scope } = useYearScopedQuery(options);
  const waiting = options.enabled !== false && !scope.ready;
  return {
    data: query.data?.data ?? [],
    isLoading: waiting || query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    academicYear: scope.academicYear,
  };
}

/** A year-scoped record, in the shape `useEntityCRUD` details return. */
export function useYearScopedDetail(options: YearScopedQueryOptions) {
  const { query, scope } = useYearScopedQuery(options);
  const waiting = options.enabled !== false && !scope.ready;
  return {
    data: query.data?.data ?? null,
    isLoading: waiting || query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    academicYear: scope.academicYear,
  };
}
