import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';
import {
  buildBehaviorRecognitionLevelOptions,
  buildBehaviorRewardCategoryOptions,
  buildBehaviorRewardTypeOptions,
} from '../config/behaviorRewardOptions';

export const useBehaviorRewardsTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      name: 'behaviorRewardSearch',
      placeholder: t('behaviorRewards.filters.search'),
      type: 'search',
      className: 'w-full lg:w-72',
    },
    {
      name: 'category',
      placeholder: t('behaviorRewards.filters.category'),
      type: 'select',
      showIcon: false,
      options: buildBehaviorRewardCategoryOptions(t),
    },
    {
      name: 'recognitionLevel',
      placeholder: t('behaviorRewards.filters.recognitionLevel'),
      type: 'select',
      showIcon: false,
      options: buildBehaviorRecognitionLevelOptions(t),
    },
    {
      name: 'rewardType',
      placeholder: t('behaviorRewards.filters.rewardType'),
      type: 'select',
      showIcon: false,
      options: buildBehaviorRewardTypeOptions(t),
    },
  ], [t]);
};
