'use client';

import { useQuery } from '@tanstack/react-query';
import { getSecretaryDashboardOverviewApi } from '@/services/dashboardApi';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';

const OVERVIEW_REFRESH = 60 * 1000;

export const useSecretaryOverview = () => {
  const { viewingYear, isResolving } = useViewingAcademicYear();
  const query = useQuery({
    queryKey: ['dashboard', 'secretary', 'overview', viewingYear ?? null],
    queryFn: () => withAcademicYear(viewingYear, getSecretaryDashboardOverviewApi),
    enabled: !isResolving,
    staleTime: OVERVIEW_REFRESH,
    refetchInterval: OVERVIEW_REFRESH,
    refetchOnWindowFocus: true,
    select: (response) => response.data,
  });
  return isResolving ? { ...query, isLoading: true } : query;
};
