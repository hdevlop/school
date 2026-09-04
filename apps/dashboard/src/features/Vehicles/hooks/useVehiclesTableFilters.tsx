import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

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