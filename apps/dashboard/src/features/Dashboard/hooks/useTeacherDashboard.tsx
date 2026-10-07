'use client'

import { useQuery } from '@tanstack/react-query';
import { getTeacherDashboardOverviewApi } from '@/services/dashboardApi';

// Lesson states ("starts in 25 min", in progress, completed) are computed on
// the school's clock by the server, so the overview refreshes each minute.
const OVERVIEW_REFRESH = 60 * 1000;

// Without a teacher id, the signed-in teacher's own page. `enabled` lets a
// screen shared with other roles ask only when a teacher is signed in.
export const useTeacherOverview = (teacherId?: string, enabled = true) =>
  useQuery({
    queryKey: ['dashboard', 'teacher', teacherId ?? 'self', 'overview'],
    queryFn: () => getTeacherDashboardOverviewApi(teacherId),
    enabled,
    staleTime: OVERVIEW_REFRESH,
    refetchInterval: OVERVIEW_REFRESH,
    refetchOnWindowFocus: true,
    select: (response) => response.data,
  });
