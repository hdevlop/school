import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useLanguage';

export const usePermissionsTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      type: 'text',
      name: 'name',
      placeholder: t('permissions.filters.searchByName'),
    },
    {
      type: 'text',
      name: 'resource',
      placeholder: t('permissions.filters.searchByResource'),
    },
  ], [t]);
};
