import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useClasses } from '@/features/Classes/hooks/useClasses';
import { useSections } from '@/features/Sections/hooks/useSections';
import {
  buildBehaviorRecognitionLevelOptions,
  buildBehaviorRewardCategoryOptions,
  buildBehaviorRewardTypeOptions,
} from '../config/behaviorRewardOptions';

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
      options: buildBehaviorRewardCategoryOptions(t),
    },
    {
      name: 'recognitionLevel',
      placeholder: t('behaviorRewards.filters.recognitionLevel'),
      type: 'select',
      options: buildBehaviorRecognitionLevelOptions(t),
    },
    {
      name: 'rewardType',
      placeholder: t('behaviorRewards.filters.rewardType'),
      type: 'select',
      options: buildBehaviorRewardTypeOptions(t),
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
