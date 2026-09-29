'use client'

import { useQuery } from '@tanstack/react-query';
import {
  getWidgetsApi,
  getStudentsByGenderApi,
  getFinanceKpisApi,
  getFinanceTrendApi,
  getFinanceAgingApi,
  getFinanceOverdueApi,
  getFinanceExpenseBreakdownApi,
  getFinanceCollectionByClassApi,
  getFinanceAgingDetailApi,
  getStudentAttendanceMonthlyApi,
  getStaffAttendanceMonthlyApi,
} from '@/services/dashboardApi';
import { useActiveAcademicYear } from '@/features/Settings/hooks/useSettings';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';

/**
 * The year a finance read names: the one passed in, else the viewed year,
 * else the active one. `isOtherYear` marks a year other than the active one,
 * whose cards name the year. "This month" and "today" figures come from the
 * server only for the year that holds today; for any other year they are null.
 */
export const useDashboardYear = (academicYear?: string) => {
  const { viewingYear, isResolving } = useViewingAcademicYear();
  const { academicYear: activeYear, isAcademicYearLoading } = useActiveAcademicYear();
  const year = academicYear ?? viewingYear ?? activeYear;
  return {
    year,
    activeYear,
    viewingYear,
    isOtherYear: !!year && !!activeYear && year !== activeYear,
    isReady: !isAcademicYearLoading && !isResolving,
  };
};

// School-wide counts and attendance cover the viewed year; each request sends
// the year its key names.
const useViewedYear = () => {
  const { viewingYear, isResolving } = useViewingAcademicYear();
  return { viewingYear, isReady: !isResolving };
};

export const useDashboardWidgets = (enabled = true) => {
  const { viewingYear, isReady } = useViewedYear();
  return useQuery({
    queryKey: ['dashboard', 'widgets', viewingYear ?? null],
    queryFn: () => withAcademicYear(viewingYear, getWidgetsApi),
    enabled: enabled && isReady,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useStudentsByGender = (enabled = true) => {
  const { viewingYear, isReady } = useViewedYear();
  return useQuery({
    queryKey: ['dashboard', 'students-by-gender', viewingYear ?? null],
    queryFn: () => withAcademicYear(viewingYear, getStudentsByGenderApi),
    enabled: enabled && isReady,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

const FINANCE_STALE = 2 * 60 * 1000;

export const useFinanceKpis = (academicYear?: string) => {
  const { year, isReady } = useDashboardYear(academicYear);
  return useQuery({
    queryKey: ['dashboard', 'finance', 'kpis', year],
    queryFn: () => withAcademicYear(year, getFinanceKpisApi),
    enabled: isReady,
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useFinanceTrend = (academicYear?: string) => {
  const { year, isReady } = useDashboardYear(academicYear);
  return useQuery({
    queryKey: ['dashboard', 'finance', 'trend', year],
    queryFn: () => withAcademicYear(year, getFinanceTrendApi),
    enabled: isReady,
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useFinanceAging = () => {
  const { viewingYear, isReady } = useViewedYear();
  return useQuery({
    queryKey: ['dashboard', 'finance', 'aging', viewingYear ?? null],
    queryFn: () => withAcademicYear(viewingYear, getFinanceAgingApi),
    enabled: isReady,
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useFinanceOverdue = (limit = 20) => {
  const { viewingYear, isReady } = useViewedYear();
  return useQuery({
    queryKey: ['dashboard', 'finance', 'overdue', limit, viewingYear ?? null],
    queryFn: () => withAcademicYear(viewingYear, () => getFinanceOverdueApi(limit)),
    enabled: isReady,
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useFinanceExpenseBreakdown = (academicYear?: string) => {
  const { year, isReady } = useDashboardYear(academicYear);
  return useQuery({
    queryKey: ['dashboard', 'finance', 'expense-breakdown', year],
    queryFn: () => withAcademicYear(year, getFinanceExpenseBreakdownApi),
    enabled: isReady,
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useFinanceCollectionByClass = (academicYear?: string) => {
  const { year, isReady } = useDashboardYear(academicYear);
  return useQuery({
    queryKey: ['dashboard', 'finance', 'collection-by-class', year],
    queryFn: () => withAcademicYear(year, getFinanceCollectionByClassApi),
    enabled: isReady,
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useStudentAttendanceMonthly = () => {
  const { viewingYear, isReady } = useViewedYear();
  return useQuery({
    queryKey: ['dashboard', 'attendance', 'students-monthly', viewingYear ?? null],
    queryFn: () => withAcademicYear(viewingYear, getStudentAttendanceMonthlyApi),
    enabled: isReady,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useStaffAttendanceMonthly = () => {
  const { viewingYear, isReady } = useViewedYear();
  return useQuery({
    queryKey: ['dashboard', 'attendance', 'staff-monthly', viewingYear ?? null],
    queryFn: () => withAcademicYear(viewingYear, getStaffAttendanceMonthlyApi),
    enabled: isReady,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useFinanceAgingDetail = () => {
  const { viewingYear, isReady } = useViewedYear();
  return useQuery({
    queryKey: ['dashboard', 'finance', 'aging-detail', viewingYear ?? null],
    queryFn: () => withAcademicYear(viewingYear, getFinanceAgingDetailApi),
    enabled: isReady,
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};
