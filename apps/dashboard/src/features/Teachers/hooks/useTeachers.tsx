'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as teacherApi from '@/services/teacherApi';

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

  const { data: teachers, isLoading: isTeachersLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: teacher, isLoading: isTeacherLoading } = crud.useGetById(teacherId, !!teacherId);

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
