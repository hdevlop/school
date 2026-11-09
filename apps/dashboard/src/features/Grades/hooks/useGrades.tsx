'use client'
import { useCallback, useState } from 'react';
import { useEntityCRUD } from 'najm-kit/query/crud';
import { useYearScopedDetail, useYearScopedList, type YearScopedRead } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { useQueryClient } from '@tanstack/react-query';
import * as gradeApi from '@/services/gradeApi';

const runGradesBatch = async (items: Array<any & { id?: string }>) => {
  await Promise.all(items.map((item) => {
    const { id, ...rest } = item;
    return id
      ? gradeApi.updateGradeApi({ ...rest, id })
      : gradeApi.createGradeApi(rest);
  }));
};

/** The year's grades, for the screens that list them all. */
export const gradeListRead = { resource: 'grades', fetch: gradeApi.getGradesApi } satisfies YearScopedRead;

/**
 * One exam's or assessment's grades: all the grades roster shows. The whole
 * year's list is hundreds of kilobytes the roster would filter down to one
 * section's twenty rows. Under `grades`, so a save's refetch reaches it.
 */
export const sourceGradesRead = (sourceType: 'assessment' | 'exam', sourceId: string) => ({
  resource: 'grades',
  parts: ['source', sourceType, sourceId],
  fetch: () => (sourceType === 'assessment' ? gradeApi.getGradesByAssessmentApi(sourceId) : gradeApi.getGradesByExamApi(sourceId)),
}) satisfies YearScopedRead;

export const useSourceGrades = (sourceType: 'assessment' | 'exam', sourceId: string, enabled: boolean) => {
  const on = enabled && !!sourceId;
  const list = useYearScopedList({ ...sourceGradesRead(sourceType, sourceId), enabled: on });
  // A read that is off is not loading: nothing is coming.
  return { ...list, isLoading: on && list.isLoading };
};

export const useGrades = (options?) => {
  const { gradeId, enabled = true } = options || {};
  const queryClient = useQueryClient();

  const crud = useEntityCRUD('grades', {
    getAll: gradeApi.getGradesApi,
    getById: gradeApi.getGradeByIdApi,
    create: gradeApi.createGradeApi,
    update: gradeApi.updateGradeApi,
    delete: gradeApi.deleteGradeApi,
    deleteBulk: gradeApi.deleteBulkGradesApi,
  });

  const { data: grades, isLoading: isGradesLoading, isError, error, refetch } = useYearScopedList({ ...gradeListRead, enabled });
  const { data: grade, isLoading: isGradeLoading } = crud.useGetById(gradeId, !!gradeId);

  const { mutateAsync: createGrade, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateGrade, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteGrade, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteGrades, isLoading: isBulkDeleting } = crud.useBulkDelete();

  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const submitGrades = useCallback(async (items: Array<any & { id?: string }>) => {
    if (!items.length) return;
    setIsSubmittingBatch(true);
    try {
      await runGradesBatch(items);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['grades'] }),
        queryClient.invalidateQueries({ queryKey: ['massar'] }),
      ]);
    } finally {
      setIsSubmittingBatch(false);
    }
  }, [queryClient]);

  return {
    submitGrades,
    isSubmittingBatch,

    grades,
    grade,

    isError,
    error,
    refetch,

    getAllGrades: crud.useGetAll,
    getGradeById: crud.useGetById,

    createGrade,
    updateGrade,
    deleteGrade,
    bulkDeleteGrades,

    isGradesLoading,
    isGradeLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};

// The student's report for the viewed year.
export const useStudentReport = (studentId: string | null) => {
  const report = useYearScopedDetail({
    resource: 'grades',
    parts: ['student', studentId, 'report'],
    fetch: () => gradeApi.getStudentReportApi(studentId as string),
    enabled: !!studentId,
  });
  return report;
};
