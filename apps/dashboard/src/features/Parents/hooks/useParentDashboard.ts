'use client';

import { useQuery } from '@tanstack/react-query';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { getUpcomingAssessmentsApi } from '@/services/assessmentApi';
import { getAttendanceByStudentApi } from '@/services/attendanceApi';
import { getDisciplineApi } from '@/services/disciplineApi';
import { getEventsApi } from '@/services/eventApi';
import { getFeesByStudentApi } from '@/services/feeApi';
import { getGradesByStudentApi } from '@/services/gradeApi';
import { getParentByIdApi, getParentChildrenApi } from '@/services/parentApi';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';

const responseData = <T,>(response: any, fallback: T): T =>
  response?.data ?? fallback;

const safely = async <T,>(request: Promise<any>, fallback: T): Promise<T> => {
  try {
    return responseData<T>(await request, fallback);
  } catch {
    return fallback;
  }
};

const safelyCollection = async (request: Promise<any>): Promise<any[]> => {
  try {
    const payload = responseData<any>(await request, []);
    return Array.isArray(payload) ? payload : [];
  } catch {
    return [];
  }
};

export interface ParentChildDashboardData {
  child: any;
  attendance: any[];
  grades: any[];
  fees: any[];
  // The year's overdue installments, from the same fees read.
  overdueAmount: number;
  // Open discipline incidents, or null when the viewer may not read them.
  openIncidents: number | null;
}

export function useParentDashboard(parentId: string) {
  const { viewingYear, activeYear, isResolving } = useViewingAcademicYear();
  const { can, isSchoolWide } = useViewerRole();
  const canReadFees = isSchoolWide && can('read:fees');
  // Upcoming items are matched against today's classes, so another year also
  // reads each child's current placement.
  const otherYear = Boolean(viewingYear && viewingYear !== activeYear);

  const familyQuery = useQuery({
    queryKey: ['parents', parentId, 'dashboard-family', viewingYear ?? null, otherYear],
    queryFn: async () => {
      // Each request sends the year its key names.
      const [parent, children, currentChildren] = await Promise.all([
        getParentByIdApi(parentId),
        withAcademicYear(viewingYear, () => getParentChildrenApi(parentId)),
        otherYear ? withAcademicYear(activeYear, () => getParentChildrenApi(parentId)) : null,
      ]);
      const yearChildren = responseData<any[]>(children, []);

      return {
        parent: responseData(parent, null),
        children: yearChildren,
        currentChildren: currentChildren ? responseData<any[]>(currentChildren, []) : yearChildren,
      };
    },
    enabled: Boolean(parentId) && !isResolving,
    staleTime: 30_000,
  });

  const children = familyQuery.data?.children ?? [];
  const childIds = children.map((child: any) => child.id).filter(Boolean);

  const childDataQuery = useQuery({
    queryKey: ['parents', parentId, 'dashboard-children', childIds, viewingYear ?? null, canReadFees],
    queryFn: () => withAcademicYear(viewingYear, () => {
      // One read for the family: the incidents the viewer may see, counted per
      // child. A refused read is "unknown", not "none". Every read starts
      // before the first await: the year scope binds only those, and none of
      // them waits for another.
      const incidentsRequest = getDisciplineApi()
        .then((response) => (Array.isArray(response?.data) ? response.data : []))
        .catch(() => null);
      return Promise.all(
        children.map(async (child: any): Promise<ParentChildDashboardData> => {
          const [attendance, grades, feeAccount, incidents] = await Promise.all([
            safelyCollection(getAttendanceByStudentApi(child.id)),
            safelyCollection(getGradesByStudentApi(child.id)),
            canReadFees ? safely<any>(getFeesByStudentApi(child.id), null) : null,
            incidentsRequest,
          ]);
          const fees = Array.isArray(feeAccount?.fees) ? feeAccount.fees : [];
          const overdueAmount = Number(feeAccount?.summary?.totalOverdueAmount) || 0;

          const openIncidents = incidents === null
            ? null
            : incidents.filter((row: any) => (row.studentId ?? row.student?.id) === child.id && row.status === 'open').length;

          return { child, attendance, grades, fees, overdueAmount, openIncidents };
        }),
      );
    }),
    enabled: familyQuery.isSuccess && children.length > 0,
    staleTime: 30_000,
  });

  // School-wide items need their own read grants. Asking without one only
  // collects a 403 per profile view, so a reader without it gets none.
  const canReadAssessments = can('read:assessments');
  const canReadEvents = can('read:events');
  const schoolQuery = useQuery({
    queryKey: ['parents', 'dashboard-school-items', canReadAssessments, canReadEvents],
    queryFn: async () => {
      const [assessments, events] = await Promise.all([
        canReadAssessments ? safely<any[]>(getUpcomingAssessmentsApi(), []) : [],
        canReadEvents ? safely<any[]>(getEventsApi(), []) : [],
      ]);

      return { assessments, events };
    },
    // Not the family's: start beside its read rather than after it.
    enabled: Boolean(parentId) && !isResolving,
    staleTime: 60_000,
  });

  const isLoading =
    familyQuery.isPending ||
    (familyQuery.isSuccess && schoolQuery.isPending) ||
    (children.length > 0 && childDataQuery.isPending);

  return {
    parent: familyQuery.data?.parent ?? null,
    children,
    currentChildren: familyQuery.data?.currentChildren ?? [],
    childData: childDataQuery.data ?? [],
    canReadFees,
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
