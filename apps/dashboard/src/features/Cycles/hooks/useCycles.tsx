'use client';

import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as cycleApi from '@/services/cycleApi';

export const useCycles = (options?) => {
  const { cycleId, activeOnly = false, enabled = true } = options || {};

  const crud = useEntityCRUD(activeOnly ? ['cycles-active', 'cycles'] : 'cycles', {
    getAll: activeOnly ? cycleApi.getActiveCyclesApi : cycleApi.getCyclesApi,
    getById: cycleApi.getCycleApi,
    create: cycleApi.createCycleApi,
    update: cycleApi.updateCycleApi,
    delete: cycleApi.deleteCycleApi,
  });

  const { data: cycles, isLoading: isCyclesLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: cycle, isLoading: isCycleLoading } = crud.useGetById(cycleId, !!cycleId);

  return {
    cycles,
    cycle,
    isCyclesLoading,
    isCycleLoading,
    isError,
    error,
    refetch,
    createCycle: crud.useCreate().mutateAsync,
    updateCycle: crud.useUpdate().mutateAsync,
    deleteCycle: crud.useDelete().mutateAsync,
  };
};
