'use client'
import { useEntityCRUD } from 'najm-kit/query/crud';
import * as feeTypeApi from '@/services/feeTypeApi';
import { useMemo } from 'react';
import { getAvailableFeeTypes } from '../config/feeTypeOptions';

export const useFeeTypes = (options?) => {
  const { feeTypeId, enabled = true, activeOnly = true } = options || {};

  const crud = useEntityCRUD('feeTypes', {
    getAll: feeTypeApi.getFeeTypesApi,
    getById: feeTypeApi.getFeeTypeByIdApi,
    create: feeTypeApi.createFeeTypeApi,
    update: feeTypeApi.updateFeeTypeApi,
    delete: feeTypeApi.deleteFeeTypeApi,
  });

  const { data: allFeeTypes, isLoading: isFeeTypesLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const feeTypes = useMemo(() => activeOnly && allFeeTypes
    ? getAvailableFeeTypes(allFeeTypes) : allFeeTypes, [activeOnly, allFeeTypes]);
  const { data: feeType, isLoading: isFeeTypeLoading } = crud.useGetById(feeTypeId, !!feeTypeId);

  const { mutateAsync: createFeeType, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateFeeType, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteFeeType, isLoading: isDeleting } = crud.useDelete();

  return {
    // Data
    feeTypes,
    allFeeTypes,
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
