'use client'
import { useEntityCRUD } from 'najm-kit/query/crud';
import { useYearScopedDetail, useYearScopedList } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import * as feeApi from '@/services/feeApi';

type UseFeesOptions = {
  feeId?: string;
  studentId?: string;
  enabled?: boolean;
  /** The students owing fees of any year: the fees table's outstanding view. */
  allYears?: boolean;
  /** The student's fees of this year instead of the viewed one. */
  studentYear?: string;
  /** Also read the student's fees of every year (other years' unpaid fees). */
  studentAllYears?: boolean;
};

export const useFees = (options?: UseFeesOptions) => {
  const { feeId, studentId, enabled = true, allYears = false, studentYear, studentAllYears = false } = options || {};
  const { viewingYear } = useViewingAcademicYear();
  const mutationYear = studentYear ?? viewingYear;

  const crud = useEntityCRUD(['fees', 'installments', 'payments'], {
    getAll: feeApi.getFeesApi,
    getByScope: feeApi.getOutstandingFeesApi,
    getByStudentAllYears: feeApi.getFeesByStudentAllYearsApi,
    create: feeApi.createFeeApi,
    update: feeApi.updateFeeApi,
    delete: feeApi.deleteFeeApi,
    deleteBulk: feeApi.deleteBulkFeesApi,
    createBulk: feeApi.createBulkFeesApi,
  });

  // The list follows the viewed year. `allYears` reads the students owing
  // fees of any year, which the outstanding view needs whatever year is viewed.
  const yearFees = useYearScopedList({ resource: 'fees', fetch: feeApi.getFeesApi, enabled: enabled && !allYears });
  const allYearFees = crud.useGetByParam('scope', allYears ? 'outstanding' : undefined, enabled && allYears);
  const { data: fees, isLoading: isFeesLoading, isError, error, refetch } = allYears ? allYearFees : yearFees;
  // A fee belongs to its year: outside the viewed year the server has none.
  const { data: fee, isLoading: isFeeLoading } = useYearScopedDetail({
    resource: 'fees', parts: [feeId], fetch: () => feeApi.getFeeByIdApi(feeId), enabled: !!feeId,
  });
  // The student's fees, totals and payment metrics for one fee year.
  const {
    data: studentFees,
    isLoading: isStudentFeesLoading,
    error: studentFeesError,
  } = useYearScopedDetail({
    resource: 'fees',
    parts: ['student', studentId],
    fetch: () => feeApi.getFeesByStudentApi(studentId),
    enabled: !!studentId,
    academicYear: studentYear,
  });
  const { data: studentAllYearFees } = crud.useGetByParam(
    'studentAllYears', studentAllYears ? studentId : undefined, studentAllYears && !!studentId,
  );
  const { mutateAsync: createFee, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateFee, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteFee, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteFees, isLoading: isBulkDeleting } = crud.useBulkDelete();
  const { mutateAsync: createBulkFees, isLoading: isBulkCreating } = crud.useBulkCreate();

  return {
    // Data
    fees,
    fee,
    studentFees,
    studentAllYearFees,

    // Status
    isError,
    error,
    refetch,
    studentFeesError,

    // Query Functions
    getAllFees: crud.useGetAll,
    getStudentFees: crud.useGetByParam,

    // Mutations
    createFee: (data: Parameters<typeof createFee>[0]) => {
      if (!mutationYear) throw new Error('Academic year is still loading');
      return withAcademicYear(mutationYear, () => createFee(data));
    },
    createBulkFees: (data: Parameters<typeof createBulkFees>[0]) => {
      if (!mutationYear) throw new Error('Academic year is still loading');
      return withAcademicYear(mutationYear, () => createBulkFees(data));
    },
    updateFee: (data: Parameters<typeof updateFee>[0]) => {
      if (!mutationYear) throw new Error('Academic year is still loading');
      return withAcademicYear(mutationYear, () => updateFee(data));
    },
    deleteFee: (id: Parameters<typeof deleteFee>[0]) => {
      if (!mutationYear) throw new Error('Academic year is still loading');
      return withAcademicYear(mutationYear, () => deleteFee(id));
    },
    bulkDeleteFees: (data: Parameters<typeof bulkDeleteFees>[0]) => {
      if (!mutationYear) throw new Error('Academic year is still loading');
      return withAcademicYear(mutationYear, () => bulkDeleteFees(data));
    },

    // Loading States
    isFeesLoading,
    isFeeLoading,
    isStudentFeesLoading,
    isCreating,
    isBulkCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};
