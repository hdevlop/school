'use client'
import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as driverApi from '@/services/driverApi';

export const useDrivers = (options?) => {
  const { driverId, enabled = true } = options || {};

  const crud = useEntityCRUD('drivers', {
    getAll: driverApi.getDriversApi,
    getById: driverApi.getDriverByIdApi,
    create: driverApi.createDriverApi,
    update: driverApi.updateDriverApi,
    delete: driverApi.deleteDriverApi,
    deleteBulk: driverApi.deleteBulkDriversApi,
    createBulk: driverApi.createBulkDriversApi
  });

  const { data: drivers, isLoading: isDriversLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: driver, isLoading: isDriverLoading } = crud.useGetById(driverId, !!driverId);

  const { mutateAsync: createDriver, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateDriver, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteDriver, isLoading: isDeleting } = crud.useDelete();
  const { mutateAsync: bulkDeleteDrivers, isLoading: isBulkDeleting } = crud.useBulkDelete();

  return {
    // Data
    drivers,
    driver,

    // Status
    isError,
    error,
    refetch,

    // Query Functions
    getAllDrivers: crud.useGetAll,
    getDriverById: crud.useGetById,

    // Mutations
    createDriver,
    updateDriver,
    deleteDriver,
    bulkDeleteDrivers,

    // Loading States
    isDriversLoading,
    isDriverLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  };
};