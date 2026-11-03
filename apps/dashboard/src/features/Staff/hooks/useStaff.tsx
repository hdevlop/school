'use client'
import { useQuery } from '@tanstack/react-query';
import { useEntityCRUD } from 'najm-kit/query/crud';
import * as staffApi from '@/services/staffApi';

// Never reused from cache: a code shown to an earlier form may since have been saved.
export const useNextEmployeeCode = (enabled: boolean) => {
  const { data } = useQuery({
    queryKey: ['next-employee-code'],
    queryFn: staffApi.getNextEmployeeCodeApi,
    enabled,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return data;
};

export const useStaff = (options?) => {
  const { staffId, role, enabled = true, attendanceRoster = false, attendanceDate } = options || {};

  const crud = useEntityCRUD(attendanceRoster ? `staff-attendance-roster:${attendanceDate || 'today'}` : 'staff', {
    getAll: attendanceRoster
      ? () => staffApi.getStaffAttendanceRosterApi(attendanceDate)
      : staffApi.getStaffApi,
    getById: staffApi.getStaffMemberApi,
    create: staffApi.createStaffApi,
    update: staffApi.updateStaffApi,
    delete: staffApi.deleteStaffApi,
    deleteBulk: staffApi.deleteBulkStaffApi,
    getByRole: staffApi.getStaffByRoleApi,
  });

  const { data: staff, isLoading: isStaffLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: staffMember, isLoading: isStaffMemberLoading } = crud.useGetById(staffId, !!staffId);
  const { data: staffByRole } = crud.useGetByParam('role', role, !!role);

  const { mutateAsync: createStaff, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateStaff, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteStaff, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteStaff, isLoading: isBulkDeleting } = crud.useBulkDelete();

  return {
    staff,
    staffMember,
    staffByRole,
    isError,
    error,
    refetch,
    isStaffLoading,
    isStaffMemberLoading,
    getAllStaff: crud.useGetAll,
    getStaffById: crud.useGetById,
    createStaff,
    updateStaff,
    deleteStaff,
    bulkDeleteStaff,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};
