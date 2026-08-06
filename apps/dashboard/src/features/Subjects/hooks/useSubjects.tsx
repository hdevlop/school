'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as subjectApi from '@/services/subjectApi';

export const useSubjects = (options?) => {
  const { subjectId, enabled = true } = options || {};

  const crud = useEntityCRUD('subjects', {
    getAll: subjectApi.getSubjectsApi,
    getById: subjectApi.getSubjectByIdApi,
    create: subjectApi.createSubjectApi,
    update: subjectApi.updateSubjectApi,
    delete: subjectApi.deleteSubjectApi,
  });

  const { data: subjects, isLoading: isSubjectsLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: subject, isLoading: isSubjectLoading } = crud.useGetById(subjectId, !!subjectId);

  const { mutateAsync: createSubject, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateSubject, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteSubject, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteSubjects, isLoading: isBulkDeleting } = crud.useBulkDelete();

  return {
    // Data
    subjects,
    subject,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllSubjects: crud.useGetAll,
    getSubjectById: crud.useGetById,

    // Mutations
    createSubject,
    updateSubject,
    deleteSubject,
    bulkDeleteSubjects,

    // Loading States
    isSubjectsLoading,
    isSubjectLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};
