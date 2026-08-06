'use client';

import { useQuery } from '@tanstack/react-query';
import { getUpcomingAssessmentsApi } from '@/services/assessmentApi';
import { getAttendanceByStudentApi } from '@/services/attendanceApi';
import { getEventsApi } from '@/services/eventApi';
import { getFeesByStudentApi } from '@/services/feeApi';
import { getGradesByStudentApi } from '@/services/gradeApi';
import { getParentByIdApi, getParentChildrenApi } from '@/services/parentApi';

const responseData = <T,>(response: any, fallback: T): T =>
  response?.data ?? fallback;

const safely = async <T,>(request: Promise<any>, fallback: T): Promise<T> => {
  try {
    return responseData<T>(await request, fallback);
  } catch {
    return fallback;
  }
};

const safelyCollection = async (
  request: Promise<any>,
  nestedKey?: string,
): Promise<any[]> => {
  try {
    const payload = responseData<any>(await request, []);
    if (Array.isArray(payload)) return payload;
    if (nestedKey && Array.isArray(payload?.[nestedKey])) return payload[nestedKey];
    return [];
  } catch {
    return [];
  }
};

export interface ParentChildDashboardData {
  child: any;
  attendance: any[];
  grades: any[];
  fees: any[];
}

export function useParentDashboard(parentId: string) {
  const familyQuery = useQuery({
    queryKey: ['parents', parentId, 'dashboard-family'],
    queryFn: async () => {
      const [parent, children] = await Promise.all([
        getParentByIdApi(parentId),
        getParentChildrenApi(parentId),
      ]);

      return {
        parent: responseData(parent, null),
        children: responseData<any[]>(children, []),
      };
    },
    enabled: Boolean(parentId),
    staleTime: 30_000,
  });

  const children = familyQuery.data?.children ?? [];
  const childIds = children.map((child: any) => child.id).filter(Boolean);

  const childDataQuery = useQuery({
    queryKey: ['parents', parentId, 'dashboard-children', childIds],
    queryFn: () =>
      Promise.all(
        children.map(async (child: any): Promise<ParentChildDashboardData> => {
          const [attendance, grades, fees] = await Promise.all([
            safelyCollection(getAttendanceByStudentApi(child.id)),
            safelyCollection(getGradesByStudentApi(child.id)),
            safelyCollection(getFeesByStudentApi(child.id), 'fees'),
          ]);

          return { child, attendance, grades, fees };
        }),
      ),
    enabled: familyQuery.isSuccess && children.length > 0,
    staleTime: 30_000,
  });

  const schoolQuery = useQuery({
    queryKey: ['parents', 'dashboard-school-items'],
    queryFn: async () => {
      const [assessments, events] = await Promise.all([
        safely<any[]>(getUpcomingAssessmentsApi(), []),
        safely<any[]>(getEventsApi(), []),
      ]);

      return { assessments, events };
    },
    staleTime: 60_000,
  });

  const isLoading =
    familyQuery.isPending ||
    schoolQuery.isPending ||
    (children.length > 0 && childDataQuery.isPending);

  return {
    parent: familyQuery.data?.parent ?? null,
    children,
    childData: childDataQuery.data ?? [],
    assessments: schoolQuery.data?.assessments ?? [],
    events: schoolQuery.data?.events ?? [],
    isLoading,
    isError: familyQuery.isError,
    refetch: async () => {
      await Promise.all([
        familyQuery.refetch(),
        childDataQuery.refetch(),
        schoolQuery.refetch(),
      ]);
    },
  };
}
