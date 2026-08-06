'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as classApi from '@/services/classApi';

export const useClasses = (enabled = true) => {
  const crud = useEntityCRUD('classes', {
    getAll: classApi.getClassesApi,
    getById: classApi.getClassByIdApi,
    create: classApi.createClassApi,
    update: classApi.updateClassApi,
    delete: classApi.deleteClassApi,
  });

  const { data: classes, isLoading: isClassesLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { mutateAsync: createClass, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateClass, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteClass, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteClasses, isLoading: isBulkDeleting } = crud.useBulkDelete();

  return {
    classes,
    getClassById: crud.useGetById,
    isError,
    error,
    refetch,
    createClass,
    updateClass,
    deleteClass,
    bulkDeleteClasses,
    isClassesLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};