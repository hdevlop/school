'use client';

import { useEntityCRUD } from '@/hooks/useEntityCRUD';
import * as behaviorRewardApi from '@/services/behaviorRewardApi';

export const useBehaviorRewards = (options?: { behaviorRewardId?: string; enabled?: boolean }) => {
  const { behaviorRewardId, enabled = true } = options || {};
  const crud = useEntityCRUD('behavior-rewards', {
    getAll: behaviorRewardApi.getBehaviorRewardsApi,
    getById: behaviorRewardApi.getBehaviorRewardByIdApi,
    create: behaviorRewardApi.createBehaviorRewardApi,
    update: behaviorRewardApi.updateBehaviorRewardApi,
    delete: behaviorRewardApi.deleteBehaviorRewardApi,
  });

  const { data: behaviorRewards, isLoading: isBehaviorRewardsLoading, isError, error, refetch } = crud.useGetAll(enabled);
  const { data: behaviorReward, isLoading: isBehaviorRewardLoading } = crud.useGetById(
    behaviorRewardId,
    Boolean(behaviorRewardId),
  );
  const { mutateAsync: createBehaviorReward, isLoading: isCreating } = crud.useCreate();
  const { mutateAsync: updateBehaviorReward, isLoading: isUpdating } = crud.useUpdate();
  const { mutateAsync: deleteBehaviorReward, isLoading: isDeleting } = crud.useDelete();

  return {
    behaviorRewards,
    behaviorReward,
    isBehaviorRewardsLoading,
    isBehaviorRewardLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isError,
    error,
    refetch,
    createBehaviorReward,
    updateBehaviorReward,
    deleteBehaviorReward,
  };
};
