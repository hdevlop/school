'use client'
import { useEntityCRUD } from 'najm-kit/query/crud';
import * as feeTypeApi from '@/services/feeTypeApi';

export const useFeeTypes = (options?) => {
  const { feeTypeId, enabled = true } = options || {};

  const crud = useEntityCRUD('feeTypes', {
    getAll: feeTypeApi.getFeeTypesApi,
    getById: feeTypeApi.getFeeTypeByIdApi,
    create: feeTypeApi.createFeeTypeApi,
    update: feeTypeApi.updateFeeTypeApi,
    delete: feeTypeApi.deleteFeeTypeApi,
  });

  const { data: feeTypes, isLoading: isFeeTypesLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: feeType, isLoading: isFeeTypeLoading } = crud.useGetById(feeTypeId, !!feeTypeId);

  const { mutateAsync: createFeeType, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateFeeType, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteFeeType, isLoading: isDeleting } = crud.useDelete();

  return {
    // Data
    feeTypes,
    feeType,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllFeeTypes: crud.useGetAll,
    getFeeTypeById: crud.useGetById,

    // Mutations
    createFeeType,
    updateFeeType,
    deleteFeeType,

    // Loading States
    isFeeTypesLoading,
    isFeeTypeLoading,
    isCreating,
    isUpdating,
    isDeleting,
  };
};
