'use client'
import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEntityCRUD } from 'najm-kit/query/crud';
import { useYearScopedList, useYearScopedQuery, type YearScopedRead } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import * as attendanceApi from '@/services/attendanceApi';
import {
  reconcileRosterItems, rosterRequestBody, settleWithLimit, type StudentRosterItem,
} from '../config/rosterSave';

/** The viewed year's student marks, as the student register opens; the page warm-up asks for the same. */
export const studentAttendanceListRead = {
  resource: 'attendance', parts: ['student'], fetch: attendanceApi.getStudentAttendanceApi,
} satisfies YearScopedRead;

/** Staff marks of `date`, or of the viewed year without one; the staff register opens on a date. */
export const staffAttendanceRead = (date?: string) => ({
  resource: 'attendance-staff',
  parts: [date || 'all'],
  fetch: () => date ? attendanceApi.getAttendanceByDateApi(date, 'staff') : attendanceApi.getStaffAttendanceApi(),
}) satisfies YearScopedRead;

// Enough to save a section quickly without one request waiting behind thirty.
const ROSTER_SAVE_CONCURRENCY = 6;

// Creates are checked against the day's held marks first, so a register shown
// before another save updates those marks instead of re-creating them. Every
// item is sent even when one fails, and the first failure is reported.
const runRosterBatch = async (items: StudentRosterItem[]) => {
  const dates = [...new Set(items.filter((item) => !item.id).map((item) => item.date))];
  const held = (await Promise.all(dates.map((date) => attendanceApi.getAttendanceByDateApi(date, 'student'))))
    .flatMap((response) => response?.data ?? []);
  const results = await settleWithLimit(reconcileRosterItems(items, held), ROSTER_SAVE_CONCURRENCY, (item) => {
    const { id, body } = rosterRequestBody(item);
    return id
      ? attendanceApi.updateAttendanceApi({ ...body, id })
      : attendanceApi.markAttendanceApi(body);
  });
  const failure = results.find((result) => result.status === 'rejected');
  if (failure) throw failure.reason;
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

  const { data: attendance, isLoading: isAttendanceLoading, isError, error, refetch } = useYearScopedList({ ...studentAttendanceListRead, enabled });

  const { mutateAsync: createRaw, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateAttendance, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteAttendance, isLoading: isDeleting } = crud.useDelete();

  const [isSubmittingRoster, setIsSubmittingRoster] = useState(false);
  const submitRoster = useCallback(async (items: StudentRosterItem[]) => {
    if (!items.length) return;
    setIsSubmittingRoster(true);
    try {
      await runRosterBatch(items);
    } finally {
      // A save that failed part-way still wrote marks: read them back either
      // way, so the register stops offering them as new.
      await queryClient.refetchQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance'] });
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

/** One student's attendance in the viewed year. */
export const useStudentAttendanceRecords = (studentId?: string) => {
  const records = useYearScopedList({
    resource: 'attendance',
    parts: ['student', studentId],
    fetch: () => attendanceApi.getAttendanceByStudentApi(studentId as string),
    enabled: !!studentId,
  });
  return { ...records, data: { data: records.data } };
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

  // Without a date, the viewed year's marks; a day's marks belong to the
  // year holding that day, so the key still names the viewed year it was
  // read under.
  const { query: attendanceQuery } = useYearScopedQuery({ ...staffAttendanceRead(date), enabled });
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
        arrivalTime: item.arrivalTime ?? null,
      })));
      await queryClient.refetchQueries({ queryKey: ['attendance-staff'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'attendance'] });
    } finally {
      setIsSubmittingRoster(false);
    }
  }, [queryClient]);

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
