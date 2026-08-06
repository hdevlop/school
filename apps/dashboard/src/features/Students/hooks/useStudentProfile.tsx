'use client';

import { useQuery } from '@tanstack/react-query';
import { getStudentByIdApi, getStudentParentsApi } from '@/services/studentApi';

export const useStudentProfile = (studentId: string | undefined) => {
  const studentQuery = useQuery({
    queryKey: ['students', studentId],
    queryFn: () => getStudentByIdApi(studentId),
    enabled: !!studentId,
    staleTime: 30_000,
  });

  const parentsQuery = useQuery({
    queryKey: ['students', studentId, 'parents'],
    queryFn: () => getStudentParentsApi(studentId),
    enabled: !!studentId,
    staleTime: 30_000,
  });

  return {
    student: studentQuery.data?.data ?? null,
    isStudentLoading: studentQuery.isPending && !!studentId,
    isStudentError: studentQuery.isError,

    parents: parentsQuery.data?.data ?? [],
    isParentsLoading: parentsQuery.isPending && !!studentId,
    isParentsError: parentsQuery.isError,
  };
};
