'use client'
import { useEntityCRUD } from 'najm-kit/query/crud';
import { useYearScopedList, type YearScopedRead } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import * as assessmentApi from '@/services/assessmentApi';

/** The list this feature's page opens with; the page warm-up asks for the same. */
export const assessmentListRead = { resource: 'assessments', fetch: assessmentApi.getAssessmentsApi } satisfies YearScopedRead;

export const useAssessments = (options?) => {
  const { assessmentId, enabled = true } = options || {};

  const crud = useEntityCRUD('assessments', {
    getAll: assessmentApi.getAssessmentsApi,
    getById: assessmentApi.getAssessmentByIdApi,
    create: assessmentApi.createAssessmentApi,
    update: assessmentApi.updateAssessmentApi,
    delete: assessmentApi.deleteAssessmentApi,
    deleteBulk: assessmentApi.deleteBulkAssessmentsApi,
  });

  const { data: assessments, isLoading: isAssessmentsLoading, isError, error, refetch } = useYearScopedList({ ...assessmentListRead, enabled });
  const { data: assessment, isLoading: isAssessmentLoading } = crud.useGetById(assessmentId, !!assessmentId);

  const { mutateAsync: createAssessment, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateAssessment, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteAssessment, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteAssessments, isLoading: isBulkDeleting } = crud.useBulkDelete();

  return {
    assessments,
    assessment,

    isError,
    error,
    refetch,

    getAllAssessments: crud.useGetAll,
    getAssessmentById: crud.useGetById,

    createAssessment,
    updateAssessment,
    deleteAssessment,
    bulkDeleteAssessments,

    isAssessmentsLoading,
    isAssessmentLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};
