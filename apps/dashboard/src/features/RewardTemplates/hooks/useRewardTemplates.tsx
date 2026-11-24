'use client';

import { useEntityCRUD } from 'najm-kit/query/crud';
import * as rewardTemplateApi from '@/services/rewardTemplateApi';

/** The reward bank: one school-wide list, the same in every school year. */
export const useRewardTemplates = (options?: { enabled?: boolean }) => {
  const { enabled = true } = options || {};
  const crud = useEntityCRUD('reward-templates', {
    getAll: rewardTemplateApi.getRewardTemplatesApi,
    getById: rewardTemplateApi.getRewardTemplateByIdApi,
    create: rewardTemplateApi.createRewardTemplateApi,
    update: rewardTemplateApi.updateRewardTemplateApi,
    delete: rewardTemplateApi.deleteRewardTemplateApi,
  });

  const { data: rewardTemplates, isLoading: isRewardTemplatesLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { mutateAsync: createRewardTemplate, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateRewardTemplate, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteRewardTemplate, isLoading: isDeleting } = crud.useDelete();

  return {
    rewardTemplates,
    isRewardTemplatesLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isError,
    error,
    refetch,
    createRewardTemplate,
    updateRewardTemplate,
    deleteRewardTemplate,
  };
};
