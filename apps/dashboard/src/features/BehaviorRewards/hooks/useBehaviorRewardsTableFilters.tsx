import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';
import {
  buildBehaviorRewardCategoryOptions,
  buildBehaviorRewardTypeOptions,
  buildRewardSubjectFilterOptions,
} from '../config/behaviorRewardOptions';

/** `rewards` lists the subjects the subject filter offers: those the rewards name. */
export const useBehaviorRewardsTableFilters = (rewards: Parameters<typeof buildRewardSubjectFilterOptions>[0] = []) => {
  const { t, language } = useTranslation();
  const subjectOptions = useMemo(() => buildRewardSubjectFilterOptions(rewards, t, language), [rewards, t, language]);

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
      name: 'rewardType',
      placeholder: t('behaviorRewards.filters.rewardType'),
      type: 'select',
      showIcon: false,
      options: buildBehaviorRewardTypeOptions(t),
    },
    {
      name: 'subject',
      placeholder: t('behaviorRewards.filters.subject'),
      type: 'select',
      showIcon: false,
      options: subjectOptions,
    },
  ], [t, subjectOptions]);
};
