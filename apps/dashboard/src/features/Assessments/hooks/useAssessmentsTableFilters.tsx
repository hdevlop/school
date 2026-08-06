import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useLanguage';

export const useAssessmentsTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      name: 'title',
      placeholder: t('assessments.filters.searchByTitle'),
      type: 'text',
    },
    {
      name: 'type',
      placeholder: t('assessments.filters.filterByType'),
      type: 'select',
      options: [
        { value: 'quiz', label: t('assessments.type.quiz') },
        { value: 'assignment', label: t('assessments.type.assignment') },
        { value: 'project', label: t('assessments.type.project') },
        { value: 'participation', label: t('assessments.type.participation') },
        { value: 'test', label: t('assessments.type.test') },
        { value: 'presentation', label: t('assessments.type.presentation') },
      ],
    },
    {
      name: 'status',
      placeholder: t('assessments.filters.filterByStatus'),
      type: 'select',
      options: [
        { value: 'scheduled', label: t('assessments.status.scheduled') },
        { value: 'active', label: t('assessments.status.active') },
        { value: 'completed', label: t('assessments.status.completed') },
        { value: 'cancelled', label: t('assessments.status.cancelled') },
      ],
    },
  ], [t]);
};
