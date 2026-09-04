import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

export const useRolesTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      type: 'text',
      name: 'name',
      placeholder: t('roles.filters.searchByName'),
    },
    {
      type: 'text',
      name: 'description',
      placeholder: t('roles.filters.searchByDescription'),
    },
  ], [t]);
};