'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as feeApi from '@/services/feeApi';

export const useFees = (options?) => {
  const { feeId, studentId, enabled = true } = options || {};

  const crud = useEntityCRUD(['fees', 'installments', 'payments'], {
    getAll: feeApi.getFeesApi,
    getById: feeApi.getFeeByIdApi,
    getByStudent: feeApi.getFeesByStudentApi,
    create: feeApi.createFeeApi,
    update: feeApi.updateFeeApi,
    delete: feeApi.deleteFeeApi,
    deleteBulk: feeApi.deleteBulkFeesApi,
    createBulk: feeApi.createBulkFeesApi,
  });

  const { data: fees, isLoading: isFeesLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: fee, isLoading: isFeeLoading } = crud.useGetById(feeId, !!feeId);
  const { data: studentFees, isLoading: isStudentFeesLoading } = crud.useGetByParam('student', studentId, !!studentId);
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

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllFees: crud.useGetAll,
    getFeeById: crud.useGetById,
    getStudentFees: crud.useGetByParam,

    // Mutations
    createFee,
    createBulkFees,
    updateFee,
    deleteFee,
    bulkDeleteFees,

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
