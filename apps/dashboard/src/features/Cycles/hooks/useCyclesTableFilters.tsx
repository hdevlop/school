import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

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
