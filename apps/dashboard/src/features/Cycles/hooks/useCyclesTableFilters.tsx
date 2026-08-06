import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useLanguage';

export const useCyclesTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      name: 'name',
      placeholder: t('cycles.filters.searchByName'),
      type: 'text',
    },
  ], [t]);
};
