import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';
import {
  buildBehaviorRewardCategoryOptions,
  buildBehaviorRewardTypeOptions,
} from '@/features/BehaviorRewards/config/behaviorRewardOptions';

export const useRewardTemplatesTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      name: 'rewardTemplateSearch',
      placeholder: t('rewardTemplates.filters.search'),
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
      name: 'rewardType',
      placeholder: t('behaviorRewards.filters.rewardType'),
      type: 'select',
      showIcon: false,
      options: buildBehaviorRewardTypeOptions(t),
    },
    {
      name: 'status',
      placeholder: t('rewardTemplates.filters.status'),
      type: 'select',
      showIcon: false,
      options: [
        { value: 'active', label: t('status.active') },
        { value: 'archived', label: t('status.archived') },
      ],
    },
  ], [t]);
};
