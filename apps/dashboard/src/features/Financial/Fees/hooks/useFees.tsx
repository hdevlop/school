'use client'
import { useMemo } from 'react';
import type { Schedule, FeePaymentDateFilters } from '@sms/contracts';
import { useTranslation } from 'najm-i18n/react';
import { useEntityCRUD } from 'najm-kit/query/crud';
import { useYearScopedDetail, useYearScopedList, type YearScopedRead } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import * as feeApi from '@/services/feeApi';
import { getStudentFeesDisplayData } from '../utils/feeUtils';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';

type UseFeesOptions = FeePaymentDateFilters & {
  feeId?: string;
  studentId?: string;
  enabled?: boolean;
  schedule?: Schedule;
  tuitionPayment?: 'paidInFull';
  classId?: string;
  sectionId?: string;
  /** The students owing fees of any year: the fees table's outstanding view. */
  allYears?: boolean;
  /** The student's fees of this year instead of the viewed one. */
  studentYear?: string;
  /** Also read the student's fees of every year (other years' unpaid fees). */
  studentAllYears?: boolean;
};

type FeeListFilters = Pick<UseFeesOptions, 'schedule' | 'tuitionPayment' | 'classId' | 'sectionId' | 'dateFrom' | 'dateTo'>;

/** The viewed year's fees matching `filters`; the page warm-up asks for the fees page's first list. */
export const feeListRead = ({ schedule, tuitionPayment, classId, sectionId, dateFrom, dateTo }: FeeListFilters = {}) => ({
  resource: 'fees',
  parts: [
    ...(schedule ? [{ schedule }] : []),
    ...(tuitionPayment ? [{ tuitionPayment }] : []),
    ...(classId ? ['class', classId] : []),
    ...(sectionId ? ['section', sectionId] : []),
    ...(dateFrom || dateTo ? [{ dateFrom, dateTo }] : []),
  ],
  fetch: () => feeApi.getFeesApi({ schedule, tuitionPayment, classId, sectionId, dateFrom, dateTo }),
}) satisfies YearScopedRead;

/** The fees page's collection cards: payments between the dates, or across the viewed year. */
export const feeSummaryRead = (dates?: FeePaymentDateFilters) => ({
  resource: 'fees',
  parts: ['summary', ...(dates ? [dates] : [])],
  fetch: () => feeApi.getFeeSummaryApi(dates ?? {}),
}) satisfies YearScopedRead;

export const useFees = (options?: UseFeesOptions) => {
  const { t, language } = useTranslation();
  const viewer = useViewerRole();
  const { feeId, studentId, enabled = true, schedule, tuitionPayment, classId, sectionId, dateFrom, dateTo, allYears = false, studentYear, studentAllYears = false } = options || {};
  const { viewingYear } = useViewingAcademicYear();
  const mutationYear = studentYear ?? viewingYear;

  const crud = useEntityCRUD(['fees', 'installments', 'payments', 'student-credits'], {
    getAll: () => feeApi.getFeesApi(),
    getByScope: feeApi.getOutstandingFeesApi,
    getByStudentAllYears: feeApi.getFeesByStudentAllYearsApi,
    create: feeApi.createFeeApi,
    update: feeApi.updateFeeApi,
    delete: viewer.role === 'admin' ? feeApi.forceRemoveFeeApi : feeApi.deleteFeeApi,
    deleteBulk: feeApi.deleteBulkFeesApi,
    createBulk: feeApi.createBulkFeesApi,
  });

  // The list follows the viewed year. `allYears` reads the students owing
  // fees of any year, which the outstanding view needs whatever year is viewed.
  const yearFees = useYearScopedList({
    ...feeListRead({ schedule, tuitionPayment, classId, sectionId, dateFrom, dateTo }),
    enabled: enabled && !allYears,
  });
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
  const displayedStudentFees = useMemo(() => getStudentFeesDisplayData(studentFees, t, language), [studentFees, t, language]);
  const displayedStudentAllYearFees = useMemo(() => getStudentFeesDisplayData(studentAllYearFees, t, language), [studentAllYearFees, t, language]);
  const { mutateAsync: createFee, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateFee, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteFee, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteFees, isLoading: isBulkDeleting } = crud.useBulkDelete();
  const { mutateAsync: createBulkFees, isLoading: isBulkCreating } = crud.useBulkCreate();

  return {
    // Data
    fees,
    fee,
    studentFees: displayedStudentFees,
    studentAllYearFees: displayedStudentAllYearFees,

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
