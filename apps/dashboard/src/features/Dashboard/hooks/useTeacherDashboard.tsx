'use client'

import { useQuery } from '@tanstack/react-query';
import type { TeacherTrendRange } from '@sms/contracts/teacher-dashboard';
import {
  getTeacherAttendanceTrendApi,
  getTeacherDashboardOverviewApi,
} from '@/services/dashboardApi';

// Lesson states ("starts in 25 min", in progress, completed) are computed on
// the school's clock by the server, so the overview refreshes each minute.
const OVERVIEW_REFRESH = 60 * 1000;

export const useTeacherOverview = () =>
  useQuery({
    queryKey: ['dashboard', 'teacher', 'overview'],
    queryFn: getTeacherDashboardOverviewApi,
    staleTime: OVERVIEW_REFRESH,
    refetchInterval: OVERVIEW_REFRESH,
    refetchOnWindowFocus: true,
    select: (response) => response.data,
  });

export const useTeacherAttendanceTrend = (range: TeacherTrendRange) =>
  useQuery({
    queryKey: ['dashboard', 'teacher', 'attendance-trend', range],
    queryFn: () => getTeacherAttendanceTrendApi(range),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    select: (response) => response.data,
  });
