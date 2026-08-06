'use client'
import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as attendanceApi from '@/services/attendanceApi';

const runRosterBatch = async (items: Array<any & { id?: string }>) => {
  await Promise.all(items.map((item) => {
    const { id, ...rest } = item;
    return id
      ? attendanceApi.updateAttendanceApi({ ...rest, id })
      : attendanceApi.markAttendanceApi(rest);
  }));
};

// Matches backend i18n key attendance.errors.dailyAlreadyMarked. When the
// server rejects a second create for the same student+section+day, the UI
// intercepts that rejection and opens the status-correction dialog instead
// of showing a raw error.
export const isDailyConflictError = (err: any) => {
  const status = err?.response?.status;
  const code = err?.response?.data?.code;
  const msg = err?.response?.data?.message;
  if (status !== 409) return false;
  if (code === 'attendance.errors.dailyAlreadyMarked') return true;
  return typeof msg === 'string' && /already recorded for this student today/i.test(msg);
};

export const useStudentAttendance = (options?) => {
  const { enabled = true } = options || {};
  const queryClient = useQueryClient();

  const crud = useEntityCRUD('attendance', {
    getAll: attendanceApi.getStudentAttendanceApi,
    create: attendanceApi.markAttendanceApi,
    update: attendanceApi.updateAttendanceApi,
    delete: attendanceApi.deleteAttendanceApi,
  });

  const { data: attendance, isLoading: isAttendanceLoading, isError, error, refetch } = crud.useGetAll(enabled);

  const { mutateAsync: createRaw, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateAttendance, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteAttendance, isLoading: isDeleting } = crud.useDelete();

  const [isSubmittingRoster, setIsSubmittingRoster] = useState(false);
  const submitRoster = useCallback(async (items: Array<any & { id?: string }>) => {
    if (!items.length) return;
    setIsSubmittingRoster(true);
    try {
      await runRosterBatch(items);
      await queryClient.refetchQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance'] });
    } finally {
      setIsSubmittingRoster(false);
    }
  }, [queryClient]);

  const markAttendance = async (
    data: any,
    opts?: { onConflict?: (data: any) => void },
  ) => {
    try {
      const res = await createRaw(data);
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance'] });
      return res;
    } catch (err: any) {
      if (isDailyConflictError(err) && opts?.onConflict) {
        opts.onConflict(data);
        return null;
      }
      throw err;
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: attendanceApi.updateAttendanceStatusApi,
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance'] });
      if (response?.message) toast.success(response.message);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    },
  });

  return {
    attendance,
    isError,
    error,
    refetch,
    markAttendance,
    updateAttendance,
    deleteAttendance,
    updateStatus: updateStatusMutation.mutateAsync,
    submitRoster,
    isAttendanceLoading,
    isCreating,
    isUpdating,
    isUpdatingStatus: updateStatusMutation.isPending,
    isDeleting,
    isSubmittingRoster,
    isDailyConflictError,
  };
};

export const useAttendanceHistory = (attendanceId: string, enabled = true) => {
  const query = useQuery({
    queryKey: ['attendance', attendanceId, 'history'],
    queryFn: () => attendanceApi.getAttendanceHistoryApi(attendanceId),
    enabled: enabled && !!attendanceId,
  });

  return {
    history: query.data?.data || [],
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
};

export const useTeacherAttendance = (options?) => {
  return useStaffAttendance(options);
};

export const useStaffAttendance = (options?) => {
  const { enabled = true, date } = options || {};
  const queryClient = useQueryClient();

  const crud = useEntityCRUD('attendance-staff', {
    getAll: attendanceApi.getStaffAttendanceApi,
    create: attendanceApi.markAttendanceApi,
    update: attendanceApi.updateAttendanceApi,
    delete: attendanceApi.deleteAttendanceApi,
  });

  const attendanceQuery = useQuery({
    queryKey: ['attendance-staff', date || 'all'],
    queryFn: () => date
      ? attendanceApi.getAttendanceByDateApi(date, 'staff')
      : attendanceApi.getStaffAttendanceApi(),
    enabled,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  const attendance = attendanceQuery.data?.data || [];

  const { mutateAsync: createStaffRaw, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateRaw, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteRaw, isLoading: isDeleting } = crud.useDelete();

  const markAttendance = async (data: any) => {
    const res = await createStaffRaw(data);
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance'] });
    return res;
  };
  const updateAttendance = async (data: any) => {
    const res = await updateRaw(data);
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance'] });
    return res;
  };
  const deleteAttendance = async (data: any) => {
    const res = await deleteRaw(data);
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance'] });
    return res;
  };

  const [isSubmittingRoster, setIsSubmittingRoster] = useState(false);
  const submitRoster = useCallback(async (items: Array<any & { id?: string }>) => {
    if (!items.length) return;
    setIsSubmittingRoster(true);
    try {
      await attendanceApi.upsertStaffAttendanceRosterApi(items.map((item) => ({
        staffId: item.staffId,
        date: item.date,
        status: item.status,
        notes: item.notes ?? null,
      })));
      await queryClient.refetchQueries({ queryKey: ['attendance-staff', date || 'all'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance'] });
    } finally {
      setIsSubmittingRoster(false);
    }
  }, [date, queryClient]);

  return {
    attendance,
    isError: attendanceQuery.isError,
    error: attendanceQuery.error,
    refetch: attendanceQuery.refetch,
    markAttendance,
    updateAttendance,
    deleteAttendance,
    submitRoster,
    isAttendanceLoading: attendanceQuery.isPending,
    isCreating,
    isUpdating,
    isDeleting,
    isSubmittingRoster,
  };
};
