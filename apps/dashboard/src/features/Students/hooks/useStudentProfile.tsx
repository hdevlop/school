'use client';

import { useQuery } from '@tanstack/react-query';
import { getStudentByIdApi, getStudentParentsApi } from '@/services/studentApi';
import { useYearScopedDetail } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';

export const useStudentProfile = (studentId: string | undefined) => {
  // The profile shows the viewed year's class and section, or none when the
  // student was not enrolled that year.
  const studentQuery = useYearScopedDetail({
    resource: 'students',
    parts: [studentId],
    fetch: () => getStudentByIdApi(studentId),
    enabled: !!studentId,
  });

  const { can } = useViewerRole();
  const canReadParents = can('read:parents');
  const parentsQuery = useQuery({
    queryKey: ['students', studentId, 'parents'],
    queryFn: () => getStudentParentsApi(studentId),
    enabled: !!studentId && canReadParents,
    staleTime: 30_000,
  });

  return {
    student: studentQuery.data,
    isStudentLoading: studentQuery.isLoading && !!studentId,
    isStudentError: studentQuery.isError,
    studentError: studentQuery.error,
    refetchStudent: studentQuery.refetch,

    canReadParents,
    parents: parentsQuery.data?.data ?? [],
    // A disabled query stays pending: without the permission nothing is loading.
    isParentsLoading: parentsQuery.isPending && !!studentId && canReadParents,
    isParentsError: parentsQuery.isError,
  };
};
