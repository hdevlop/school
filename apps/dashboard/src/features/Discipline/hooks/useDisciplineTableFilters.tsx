import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useLanguage';
import { DISCIPLINE_CATEGORIES, DISCIPLINE_SEVERITIES, DISCIPLINE_STATUSES } from '../disciplineConstants';

export const useDisciplineTableFilters = () => {
  const { t } = useTranslation();
  return useMemo(() => [
    { name: 'studentSearch', type: 'text', placeholder: t('discipline.filters.search') },
    {
      name: 'category', type: 'select', placeholder: t('discipline.filters.category'),
      options: DISCIPLINE_CATEGORIES.map((value) => ({ value, label: t(`discipline.categories.${value}`) })),
    },
    {
      name: 'severity', type: 'select', placeholder: t('discipline.filters.severity'),
      options: DISCIPLINE_SEVERITIES.map((value) => ({ value, label: t(`discipline.severity.${value}`) })),
    },
    {
      name: 'status', type: 'select', placeholder: t('discipline.filters.status'),
      options: DISCIPLINE_STATUSES.map((value) => ({ value, label: t(`discipline.status.${value}`) })),
    },
  ], [t]);
};
