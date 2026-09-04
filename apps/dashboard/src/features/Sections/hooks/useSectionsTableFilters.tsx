import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

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