import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

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