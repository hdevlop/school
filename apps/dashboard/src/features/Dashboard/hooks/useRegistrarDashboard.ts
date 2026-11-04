'use client';

import { useQuery } from '@tanstack/react-query';
import { getRegistrarDashboardOverviewApi } from '@/services/dashboardApi';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';

const OVERVIEW_REFRESH = 60 * 1000;

export const useRegistrarOverview = () => {
  const { viewingYear, isResolving } = useViewingAcademicYear();
  const query = useQuery({
    queryKey: ['dashboard', 'registrar', 'overview', viewingYear ?? null],
    queryFn: () => withAcademicYear(viewingYear, getRegistrarDashboardOverviewApi),
    enabled: !isResolving,
    staleTime: OVERVIEW_REFRESH,
    refetchInterval: OVERVIEW_REFRESH,
    refetchOnWindowFocus: true,
    select: (response) => response.data,
  });
  return isResolving ? { ...query, isLoading: true } : query;
};
