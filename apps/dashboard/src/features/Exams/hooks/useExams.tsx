'use client'
import { useEntityCRUD } from 'najm-kit/query/crud';
import { useYearScopedList, type YearScopedRead } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import * as examApi from '@/services/examApi';

/** The list this feature's page opens with; the page warm-up asks for the same. */
export const examListRead = { resource: 'exams', fetch: examApi.getExamsApi } satisfies YearScopedRead;

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

  const { data: exams, isLoading: isExamsLoading, isError, error, refetch } = useYearScopedList({ ...examListRead, enabled });
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
