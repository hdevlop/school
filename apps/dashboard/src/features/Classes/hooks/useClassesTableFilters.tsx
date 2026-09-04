import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

export const useClassesTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      name: 'name',
      placeholder: t('classes.filters.searchByName'),
      type: 'text',
    }
  ], [t]);
};