'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActiveCyclesApi } from '@/services/cycleApi';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { coversWholeSchool } from '../utils/staffAssignments';

/**
 * Whether a staff member's assignments amount to the whole school: a school-wide
 * job title with none, or an accountant following every active cycle. Without the
 * cycle list (no `read:cycles`, or it failed) an accountant's cycles are listed as they are.
 */
export function useCoversWholeSchool() {
  const { can } = useViewerRole();
  const { data } = useQuery({
    queryKey: ['cycles-active'],
    queryFn: getActiveCyclesApi,
    enabled: can('read:cycles'),
    staleTime: 5 * 60_000,
  });
  const activeCycleIds = useMemo(
    () => (Array.isArray(data?.data) ? data.data.map((cycle) => cycle.id) : undefined),
    [data],
  );
  return useCallback((staff) => coversWholeSchool(staff, activeCycleIds), [activeCycleIds]);
}
