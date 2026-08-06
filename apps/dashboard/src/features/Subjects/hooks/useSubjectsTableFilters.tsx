import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useLanguage';

export const useSubjectsTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      name: 'name',
      placeholder: t('subjects.filters.searchByName'),
      type: 'text',
    }
  ], [t]);
};