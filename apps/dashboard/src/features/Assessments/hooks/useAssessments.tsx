'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as assessmentApi from '@/services/assessmentApi';

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

  const { data: assessments, isLoading: isAssessmentsLoading, isError, error, refetch } = crud.useGetAll(enabled);
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
