'use client';

import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as zoneApi from '@/services/zoneApi';

export const useZones = (options?) => {
  const { zoneId, enabled = true } = options || {};

  const crud = useEntityCRUD('zones', {
    getAll: zoneApi.getZonesApi,
    getById: zoneApi.getZoneApi,
    create: zoneApi.createZoneApi,
    update: zoneApi.updateZoneApi,
    delete: zoneApi.deleteZoneApi,
  });

  const { data: zones, isLoading: isZonesLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: zone, isLoading: isZoneLoading } = crud.useGetById(zoneId, !!zoneId);

  return {
    zones,
    zone,
    isZonesLoading,
    isZoneLoading,
    isError,
    error,
    refetch,
    createZone: crud.useCreate().mutateAsync,
    updateZone: crud.useUpdate().mutateAsync,
    deleteZone: crud.useDelete().mutateAsync,
  };
};
