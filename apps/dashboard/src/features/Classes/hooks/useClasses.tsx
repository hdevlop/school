'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as classApi from '@/services/classApi';

export const useClasses = (options?) => {
  const { classId, enabled = true } = options || {};

  const crud = useEntityCRUD('classes', {
    getAll: classApi.getClassesApi,
    getById: classApi.getClassByIdApi,
    create: classApi.createClassApi,
    update: classApi.updateClassApi,
    delete: classApi.deleteClassApi,
  });

  const { data: classes, isLoading: isClassesLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: classData, isLoading: isClassLoading } = crud.useGetById(classId, !!classId);

  const { mutateAsync: createClass, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateClass, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteClass, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteClasses, isLoading: isBulkDeleting } = crud.useBulkDelete();

  return {
    // Data
    classes,
    class: classData,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllClasses: crud.useGetAll,
    getClassById: crud.useGetById,

    // Mutations
    createClass,
    updateClass,
    deleteClass,
    bulkDeleteClasses,

    // Loading States
    isClassesLoading,
    isClassLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};
