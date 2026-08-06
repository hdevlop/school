'use client'

import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import { seedDemoApi, seedSystemApi, clearAllDataApi, type SeedDemoOptions } from '@/services/seedApi';
import { getAdminSettingsApi, getPublicSettingsApi, updateSettingsApi } from '@/services/settingApi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const getLocalDateOnly = () => {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
};

const normalizeSettings = (value: any) => Array.isArray(value) ? value[0] : value;

export const usePublicSettings = (enabled = true) => {
  const crud = useEntityCRUD('publicSettings', {
    getAll: getPublicSettingsApi,
  });

  const { data: publicSettings, isLoading: isSettingsLoading, isError, error, refetch } = crud.useGetAll(enabled);

  return {
    publicSettings,
    isSettingsLoading,
    isError,
    error,
    refetch,
  };
};

export const useBusinessDate = () => {
  const { publicSettings, isSettingsLoading, refetch } = usePublicSettings();
  const settings = normalizeSettings(publicSettings);

  const refetchBusinessDate = async () => {
    const result = await refetch();
    const response = result.data as any;
    const refreshedSettings = normalizeSettings(response?.data ?? response);
    return refreshedSettings?.businessDate || getLocalDateOnly();
  };

  return {
    businessDate: settings?.businessDate || getLocalDateOnly(),
    businessDateOverridden: Boolean(settings?.businessDateOverridden),
    isBusinessDateLoading: isSettingsLoading,
    refetchBusinessDate,
  };
};

export const useAdminSettings = (enabled = true) => {
  const crud = useEntityCRUD('settings', {
    getAll: getAdminSettingsApi,
    update: updateSettingsApi,
  });

  const { data: settings, isLoading: isSettingsLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { mutateAsync: updateSettings, isLoading: isUpdating } = crud.useUpdate();

  return {
    settings,
    isSettingsLoading,
    isError,
    error,
    refetch,
    updateSettings,
    isUpdating,
  };
};

export const useSeedDemo = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (opts: SeedDemoOptions) => seedDemoApi(opts),
    onSuccess: (response) => {
      queryClient.clear();
      toast.success(response?.message);
    },
    onError: (error) => {
      toast.error(getError(error));
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
};

export const useSeedSystem = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: seedSystemApi,
    onSuccess: (response) => {
      queryClient.clear();
      toast.success(response?.message);
    },
    onError: (error) => {
      toast.error(getError(error));
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
};

export const useClearAllData = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: clearAllDataApi,
    onSuccess: (response) => {
      queryClient.clear();
      toast.success(response?.message);
    },
    onError: (error) => {
      toast.error(getError(error));
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
};

const getError = (error) => {
  return error?.response?.data?.message;
};
