import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useLanguage';

export const useVehiclesTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => [
    {
      name: 'name',
      placeholder: t('vehicles.filters.searchByName'),
      type: 'text',
    },
    {
      name: 'licensePlate',
      placeholder: t('vehicles.filters.searchByLicensePlate'),
      type: 'text',
    }
  ], [t]);
};