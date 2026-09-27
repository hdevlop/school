'use client';

import { useQuery } from '@tanstack/react-query';
import { getStudentByIdApi, getStudentParentsApi } from '@/services/studentApi';
import { useYearScopedDetail } from '@/features/AcademicYears/hooks/useYearScopedQuery';

export const useStudentProfile = (studentId: string | undefined) => {
  // The profile shows the viewed year's class and section, or none when the
  // student was not enrolled that year.
  const studentQuery = useYearScopedDetail({
    resource: 'students',
    parts: [studentId],
    fetch: () => getStudentByIdApi(studentId),
    enabled: !!studentId,
  });

  const parentsQuery = useQuery({
    queryKey: ['students', studentId, 'parents'],
    queryFn: () => getStudentParentsApi(studentId),
    enabled: !!studentId,
    staleTime: 30_000,
  });

  return {
    student: studentQuery.data,
    isStudentLoading: studentQuery.isLoading && !!studentId,
    isStudentError: studentQuery.isError,

    parents: parentsQuery.data?.data ?? [],
    isParentsLoading: parentsQuery.isPending && !!studentId,
    isParentsError: parentsQuery.isError,
  };
};
