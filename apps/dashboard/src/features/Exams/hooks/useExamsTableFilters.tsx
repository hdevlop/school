import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

export const useExamsTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      name: 'title',
      placeholder: t('exams.filters.searchByTitle'),
      type: 'text',
    },
    {
      name: 'type',
      placeholder: t('exams.filters.filterByType'),
      type: 'select',
      options: [
        { value: 'midterm', label: t('exams.type.midterm') },
        { value: 'final', label: t('exams.type.final') },
        { value: 'standardized', label: t('exams.type.standardized') },
      ],
    },
    {
      name: 'status',
      placeholder: t('exams.filters.filterByStatus'),
      type: 'select',
      options: [
        { value: 'scheduled', label: t('exams.status.scheduled') },
        { value: 'active', label: t('exams.status.active') },
        { value: 'completed', label: t('exams.status.completed') },
        { value: 'cancelled', label: t('exams.status.cancelled') },
        { value: 'rescheduled', label: t('exams.status.rescheduled') },
      ],
    },
  ], [t]);
};
