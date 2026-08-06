'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as installmentApi from '@/services/installmentApi';

export const useInstallments = (options) => {
  const { installmentId, enabled = true } = options || {};

  const crud = useEntityCRUD(['installments', 'fees'], {
    getAll: installmentApi.getInstallmentsApi,
    getById: installmentApi.getInstallmentByIdApi,
    create: installmentApi.createInstallmentApi,
    update: installmentApi.updateInstallmentApi,
    delete: installmentApi.deleteInstallmentApi,
  });

  const { data: installments, isLoading: isInstallmentsLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: installment, isLoading: isInstallmentLoading } = crud.useGetById(installmentId, !!installmentId);

  const { mutateAsync: createInstallment, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateInstallment, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteInstallment, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteInstallments, isLoading: isBulkDeleting } = crud.useBulkDelete();

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
    createInstallment,
    updateInstallment,
    deleteInstallment,
    bulkDeleteInstallments,

    // Loading States
    isInstallmentsLoading,
    isInstallmentLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};