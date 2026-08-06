import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useLanguage';
import { useClasses } from '@/hooks/useClasses';
import { useSections } from '@/features/Sections/hooks/useSections';
import {
  BEHAVIOR_RECOGNITION_LEVELS,
  BEHAVIOR_REWARD_CATEGORIES,
  BEHAVIOR_REWARD_TYPES,
} from '../behaviorRewardConstants';

export const useBehaviorRewardsTableFilters = ({
  classFilter,
  onClassFilterChange,
  sectionFilter,
  onSectionFilterChange,
}: {
  classFilter: string;
  onClassFilterChange: (value: string) => void;
  sectionFilter: string;
  onSectionFilterChange: (value: string) => void;
}) => {
  const { t } = useTranslation();
  const { classes } = useClasses();
  const { sections } = useSections();

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
      options: BEHAVIOR_REWARD_CATEGORIES.map((value) => ({
        value,
        label: t(`behaviorRewards.categories.${value}`),
      })),
    },
    {
      name: 'recognitionLevel',
      placeholder: t('behaviorRewards.filters.recognitionLevel'),
      type: 'select',
      options: BEHAVIOR_RECOGNITION_LEVELS.map((value) => ({
        value,
        label: t(`behaviorRewards.recognitionLevels.${value}`),
      })),
    },
    {
      name: 'rewardType',
      placeholder: t('behaviorRewards.filters.rewardType'),
      type: 'select',
      options: BEHAVIOR_REWARD_TYPES.map((value) => ({
        value,
        label: t(`behaviorRewards.rewardTypes.${value}`),
      })),
    },
    {
      name: 'classId',
      placeholder: t('behaviorRewards.filters.class'),
      type: 'combobox',
      options: (classes || []).map((item) => ({ value: item.id, label: item.name })),
      value: classFilter,
      onChange: onClassFilterChange,
    },
    {
      name: 'sectionId',
      placeholder: t('behaviorRewards.filters.section'),
      type: 'combobox',
      options: (sections || []).map((item) => ({ value: item.id, label: item.name })),
      value: sectionFilter,
      onChange: onSectionFilterChange,
    },
  ], [classes, sections, t, classFilter, onClassFilterChange, sectionFilter, onSectionFilterChange]);
};
