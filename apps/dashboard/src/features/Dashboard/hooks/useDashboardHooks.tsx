'use client'

import { useQuery } from '@tanstack/react-query';
import {
  getWidgetsApi,
  getStudentsByGenderApi,
  getFinanceKpisApi,
  getFinanceTrendApi,
  getFinanceAgingApi,
  getFinanceOverdueApi,
  getFinanceRecentPaymentsApi,
  getFinanceExpenseBreakdownApi,
  getFinanceCollectionByClassApi,
  getFinanceAgingDetailApi,
  getStudentAttendanceMonthlyApi,
  getStaffAttendanceMonthlyApi,
} from '@/services/dashboardApi';
import { getCurrentAcademicYear } from '@/lib/academicYear';

export const useDashboardWidgets = (enabled = true) => {
  return useQuery({
    queryKey: ['dashboard', 'widgets'],
    queryFn: getWidgetsApi,
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useStudentsByGender = (enabled = true) => {
  return useQuery({
    queryKey: ['dashboard', 'students-by-gender'],
    queryFn: getStudentsByGenderApi,
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

const FINANCE_STALE = 2 * 60 * 1000;

export const useFinanceKpis = (academicYear?: string) => {
  const year = academicYear ?? getCurrentAcademicYear();
  return useQuery({
    queryKey: ['dashboard', 'finance', 'kpis', year],
    queryFn: () => getFinanceKpisApi(year),
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useFinanceTrend = (academicYear?: string) => {
  const year = academicYear ?? getCurrentAcademicYear();
  return useQuery({
    queryKey: ['dashboard', 'finance', 'trend', year],
    queryFn: () => getFinanceTrendApi(year),
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useFinanceAging = () => {
  return useQuery({
    queryKey: ['dashboard', 'finance', 'aging'],
    queryFn: getFinanceAgingApi,
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useFinanceOverdue = (limit = 20) => {
  return useQuery({
    queryKey: ['dashboard', 'finance', 'overdue', limit],
    queryFn: () => getFinanceOverdueApi(limit),
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useFinanceRecentPayments = (limit = 10) => {
  return useQuery({
    queryKey: ['dashboard', 'finance', 'recent-payments', limit],
    queryFn: () => getFinanceRecentPaymentsApi(limit),
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useFinanceExpenseBreakdown = (academicYear?: string) => {
  const year = academicYear ?? getCurrentAcademicYear();
  return useQuery({
    queryKey: ['dashboard', 'finance', 'expense-breakdown', year],
    queryFn: () => getFinanceExpenseBreakdownApi(year),
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useFinanceCollectionByClass = (academicYear?: string) => {
  const year = academicYear ?? getCurrentAcademicYear();
  return useQuery({
    queryKey: ['dashboard', 'finance', 'collection-by-class', year],
    queryFn: () => getFinanceCollectionByClassApi(year),
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useStudentAttendanceMonthly = () => {
  return useQuery({
    queryKey: ['dashboard', 'attendance', 'students-monthly'],
    queryFn: getStudentAttendanceMonthlyApi,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useStaffAttendanceMonthly = () => {
  return useQuery({
    queryKey: ['dashboard', 'attendance', 'staff-monthly'],
    queryFn: getStaffAttendanceMonthlyApi,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};

export const useTeacherAttendanceMonthly = useStaffAttendanceMonthly;

export const useFinanceAgingDetail = () => {
  return useQuery({
    queryKey: ['dashboard', 'finance', 'aging-detail'],
    queryFn: getFinanceAgingDetailApi,
    staleTime: FINANCE_STALE,
    refetchOnWindowFocus: false,
    select: (response) => response?.data,
  });
};
