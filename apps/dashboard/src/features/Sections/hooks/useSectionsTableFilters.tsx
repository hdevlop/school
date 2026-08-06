import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useLanguage';

export const useSectionsTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      name: 'name',
      placeholder: t('sections.filters.searchByName'),
      type: 'text',
    }
  ], [t]);
};