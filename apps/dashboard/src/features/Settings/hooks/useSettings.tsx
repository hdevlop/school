'use client'

import { useEntityCRUD } from 'najm-kit/query/crud';
import { createSettingsApi, getAdminSettingsApi, getPublicSettingsApi, updateSettingsApi } from '@/services/settingApi';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentAcademicYear } from '@/lib/utils';
import { useRenderedActiveAcademicYear } from '../context/RenderedActiveAcademicYear';
import { activeAcademicYearState } from '../utils/activeAcademicYear';

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

export const useActiveAcademicYear = () => {
  const { publicSettings, isSettingsLoading } = usePublicSettings();
  // The label the server rendered this page with stands in until the public
  // settings load, so nothing waits for that request just to learn the year.
  return activeAcademicYearState(
    normalizeSettings(publicSettings)?.currentAcademicYear,
    isSettingsLoading,
    useRenderedActiveAcademicYear(),
    getCurrentAcademicYear,
  );
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

/** Installs the settings of a school that has none; refused once they exist. */
export const useInstallSchool = () => {
  const crud = useEntityCRUD('settings', { create: createSettingsApi });
  const { mutateAsync: installSchool, isLoading: isInstalling } = crud.useCreate();
  return { installSchool, isInstalling };
};

export const useAdminSettings = (enabled = true) => {
  const crud = useEntityCRUD('settings', {
    getAll: getAdminSettingsApi,
    update: updateSettingsApi,
  });

  const { data: settings, isLoading: isSettingsLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { mutateAsync: saveSettings, isLoading: isUpdating } = crud.useUpdate();
  const queryClient = useQueryClient();
  const updateSettings = async (data: Parameters<typeof saveSettings>[0]) => {
    const result = await saveSettings(data);
    await queryClient.invalidateQueries();
    return result;
  };

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
