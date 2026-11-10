'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEntityCRUD } from 'najm-kit/query/crud';
import { approveTeacherRequestApi, getTeacherRequestsApi, rejectTeacherRequestApi } from '@/services/teacherRequestApi';

export interface TeacherRequestRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  cin: string;
  address: string;
  specialization: string | null;
  yearsOfExperience: number | null;
  academicDegrees: string | null;
}

export function useTeacherRequests() {
  const queryClient = useQueryClient();
  const crud = useEntityCRUD('teacher-requests', { getAll: getTeacherRequestsApi, delete: rejectTeacherRequestApi });
  const query = crud.useGetAll();
  const { mutateAsync: approveRequest } = useMutation({
    mutationFn: approveTeacherRequestApi,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['teacher-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['teachers'] }),
    ]),
  });
  const { mutateAsync: rejectRequest } = crud.useDelete();
  return { ...query, approveRequest, rejectRequest };
}
