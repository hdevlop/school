'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEnrollmentApi,
  endEnrollmentApi,
  getStudentEnrollmentsApi,
  transferEnrollmentApi,
} from '@/services/studentEnrollmentApi';

/**
 * A student's yearly enrollments and the three commands that change them.
 * The history and commands are administrator/principal routes, so callers
 * pass `enabled` only for those roles.
 */
export const useStudentEnrollments = (studentId?: string, enabled = true) => {
  const queryClient = useQueryClient();
  const historyKey = ['student-enrollments', studentId];

  const history = useQuery({
    queryKey: historyKey,
    queryFn: () => getStudentEnrollmentsApi(studentId as string),
    enabled: enabled && !!studentId,
  });

  // A placement moves the student in every class list, roster, profile and
  // year-scoped summary, so all of them are read again, not only this history.
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: historyKey }),
    queryClient.invalidateQueries({ queryKey: ['students'] }),
    queryClient.invalidateQueries({ queryKey: ['parents'] }),
    queryClient.invalidateQueries({ queryKey: ['fees'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  ]);

  const enroll = useMutation({ mutationFn: createEnrollmentApi, onSuccess: refresh });
  const transfer = useMutation({
    mutationFn: ({ enrollmentId, ...data }: Parameters<typeof transferEnrollmentApi>[1] & { enrollmentId: string }) =>
      transferEnrollmentApi(enrollmentId, data),
    onSuccess: refresh,
  });
  const end = useMutation({
    mutationFn: ({ enrollmentId, ...data }: Parameters<typeof endEnrollmentApi>[1] & { enrollmentId: string }) =>
      endEnrollmentApi(enrollmentId, data),
    onSuccess: refresh,
  });

  return {
    enrollments: history.data ?? [],
    error: history.error,
    isLoading: history.isLoading,
    enroll: enroll.mutateAsync,
    transfer: transfer.mutateAsync,
    end: end.mutateAsync,
    isSaving: enroll.isPending || transfer.isPending || end.isPending,
  };
};
