'use client';

import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as vehicleApi from '@/services/vehicleApi';

export const useVehicles = (options?) => {
  const { enabled = true } = options || {};

  const crud = useEntityCRUD('vehicles', {
    getAll: vehicleApi.getVehiclesApi,
    getById: vehicleApi.getVehicleByIdApi,
    create: vehicleApi.createVehicleApi,
    update: vehicleApi.updateVehicleApi,
    delete: vehicleApi.deleteVehicleApi,
  });

  const { data: vehicles, isLoading: isVehiclesLoading, isError, error, refetch } = crud.useGetAll(enabled);

  return {
    vehicles,
    isVehiclesLoading,
    isError,
    error,
    refetch,
  };
};
