import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

export const useExamsTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      name: 'title',
      placeholder: t('exams.filters.searchByExam'),
      type: 'text',
    },
    {
      name: 'status',
      placeholder: t('exams.filters.filterByStatus'),
      type: 'select',
      showIcon: false,
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
