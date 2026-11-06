'use client'
import { useEntityCRUD } from 'najm-kit/query/crud';
import * as teacherApi from '@/services/teacherApi';
import { useYearScopedDetail, useYearScopedList, type YearScopedRead } from '@/features/AcademicYears/hooks/useYearScopedQuery';

/** The list this feature's page opens with; the page warm-up asks for the same. */
export const teacherListRead = { resource: 'teachers', fetch: teacherApi.getTeachersApi } satisfies YearScopedRead;

export const useTeachers = (options?) => {
  const { teacherId, enabled = true } = options || {};

  const crud = useEntityCRUD('teachers', {
    getAll: teacherApi.getTeachersApi,
    getById: teacherApi.getTeacherByIdApi,
    create: teacherApi.createTeacherApi,
    update: teacherApi.updateTeacherApi,
    delete: teacherApi.deleteTeacherApi,
    deleteBulk: teacherApi.deleteBulkTeachersApi,
    createBulk: teacherApi.createBulkTeachersApi
  });

  const { data: teachers, isLoading: isTeachersLoading, isError, error, refetch } = useYearScopedList({ ...teacherListRead, enabled });
  const { data: teacher, isLoading: isTeacherLoading } = useYearScopedDetail({
    resource: 'teachers', parts: ['detail', teacherId],
    fetch: () => teacherApi.getTeacherByIdApi(teacherId), enabled: !!teacherId,
  });

  const { mutateAsync: createTeacher, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateTeacher, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteTeacher, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: createBulkTeachers, isLoading: isBulkCreating } = crud.useBulkCreate();
  const { mutateAsync: bulkDeleteTeachers, isLoading: isBulkDeleting } = crud.useBulkDelete();

  return {
    // Data
    teachers,
    teacher,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllTeachers: crud.useGetAll,
    getTeacherById: crud.useGetById,

    // Mutations
    createTeacher,
    updateTeacher,
    deleteTeacher,
    bulkDeleteTeachers,
    createBulkTeachers,

    // Loading States
    isTeachersLoading,
    isTeacherLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
    isBulkCreating,
  };
};
