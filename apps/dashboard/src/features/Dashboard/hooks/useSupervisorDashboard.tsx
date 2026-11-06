'use client'

import { useQuery } from '@tanstack/react-query';
import { getSupervisorDashboardOverviewApi } from '@/services/dashboardApi';

// Registers and absences change through the morning, so the overview
// refreshes each minute like the monitor's.
const OVERVIEW_REFRESH = 60 * 1000;

export const useSupervisorOverview = () =>
  useQuery({
    queryKey: ['dashboard', 'supervisor', 'overview'],
    queryFn: getSupervisorDashboardOverviewApi,
    staleTime: OVERVIEW_REFRESH,
    refetchInterval: OVERVIEW_REFRESH,
    refetchOnWindowFocus: true,
    select: (response) => response.data,
  });
