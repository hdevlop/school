'use client'

import { useQuery } from '@tanstack/react-query';
import { getFloorManagerDashboardOverviewApi } from '@/services/dashboardApi';

// Registers and absences change through the morning, so the overview
// refreshes each minute like the teacher's.
const OVERVIEW_REFRESH = 60 * 1000;

export const useFloorManagerOverview = () =>
  useQuery({
    queryKey: ['dashboard', 'floor-manager', 'overview'],
    queryFn: getFloorManagerDashboardOverviewApi,
    staleTime: OVERVIEW_REFRESH,
    refetchInterval: OVERVIEW_REFRESH,
    refetchOnWindowFocus: true,
    select: (response) => response.data,
  });
