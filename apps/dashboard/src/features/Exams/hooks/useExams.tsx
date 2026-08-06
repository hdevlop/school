'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as examApi from '@/services/examApi';

export const useExams = (options?) => {
  const { examId, enabled = true } = options || {};

  const crud = useEntityCRUD('exams', {
    getAll: examApi.getExamsApi,
    getById: examApi.getExamByIdApi,
    create: examApi.createExamApi,
    update: examApi.updateExamApi,
    delete: examApi.deleteExamApi,
    deleteBulk: examApi.deleteBulkExamsApi,
  });

  const { data: exams, isLoading: isExamsLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: exam, isLoading: isExamLoading } = crud.useGetById(examId, !!examId);

  const { mutateAsync: createExam, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateExam, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteExam, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteExams, isLoading: isBulkDeleting } = crud.useBulkDelete();

  return {
    exams,
    exam,

    isError,
    error,
    refetch,

    getAllExams: crud.useGetAll,
    getExamById: crud.useGetById,

    createExam,
    updateExam,
    deleteExam,
    bulkDeleteExams,

    isExamsLoading,
    isExamLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};
