'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as vehicleApi from '@/services/vehicleApi';

export const useVehicles = (options?) => {
  const { vehicleId, enabled = true } = options || {};

  const crud = useEntityCRUD(['vehicles','drivers'], {
    getAll: vehicleApi.getVehiclesApi,
    getById: vehicleApi.getVehicleByIdApi,
    create: vehicleApi.createVehicleApi,
    update: vehicleApi.updateVehicleApi,
    delete: vehicleApi.deleteVehicleApi,
    assignDriver: vehicleApi.assignDriverApi,
  });

  const { data: vehicles, isLoading: isVehiclesLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: vehicle, isLoading: isVehicleLoading } = crud.useGetById(vehicleId, !!vehicleId);

  const { mutateAsync: createVehicle, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateVehicle, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteVehicle, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteVehicles, isLoading: isBulkDeleting } = crud.useBulkDelete();
  const { mutateAsync: assignDriver, isLoading: isAssigningDriver } = crud.useCustomMutation('assignDriver');

  return {
    // Data
    vehicles,
    vehicle,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllVehicles: crud.useGetAll,
    getVehicleById: crud.useGetById,

    // Mutations
    createVehicle,
    updateVehicle,
    deleteVehicle,
    bulkDeleteVehicles,

    // Custom Mutations
    assignDriver,

    // Loading States
    isVehiclesLoading,
    isVehicleLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
    isAssigningDriver,
  };
};