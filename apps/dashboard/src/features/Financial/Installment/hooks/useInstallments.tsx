'use client'
import { useEntityCRUD } from 'najm-kit/query/crud';
import { useYearScopedDetail, useYearScopedList } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import * as installmentApi from '@/services/installmentApi';

export const useInstallments = (options) => {
  const { installmentId, enabled = true } = options || {};
  const { viewingYear } = useViewingAcademicYear();

  const crud = useEntityCRUD(['installments', 'fees'], {
    getAll: installmentApi.getInstallmentsApi,
    getById: installmentApi.getInstallmentByIdApi,
    create: installmentApi.createInstallmentApi,
    update: installmentApi.updateInstallmentApi,
    delete: installmentApi.deleteInstallmentApi,
  });

  const { data: installments, isLoading: isInstallmentsLoading, isError, error, refetch } = useYearScopedList({
    resource: 'installments', fetch: installmentApi.getInstallmentsApi, enabled,
  });
  const { data: installment, isLoading: isInstallmentLoading } = useYearScopedDetail({
    resource: 'installments', parts: [installmentId],
    fetch: () => installmentApi.getInstallmentByIdApi(installmentId), enabled: !!installmentId,
  });

  const { mutateAsync: createInstallment, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateInstallment, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteInstallment, isLoading: isDeleting } = crud.useDelete();

  return {
    // Data
    installments,
    installment,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllInstallments: crud.useGetAll,
    getInstallmentById: crud.useGetById,

    // Mutations
    createInstallment: (data) => {
      if (!viewingYear) throw new Error('Academic year is still loading');
      return withAcademicYear(viewingYear, () => createInstallment(data));
    },
    updateInstallment: (data) => {
      if (!viewingYear) throw new Error('Academic year is still loading');
      return withAcademicYear(viewingYear, () => updateInstallment(data));
    },
    deleteInstallment: (id) => {
      if (!viewingYear) throw new Error('Academic year is still loading');
      return withAcademicYear(viewingYear, () => deleteInstallment(id));
    },

    // Loading States
    isInstallmentsLoading,
    isInstallmentLoading,
    isCreating,
    isUpdating,
    isDeleting,
  };
};
