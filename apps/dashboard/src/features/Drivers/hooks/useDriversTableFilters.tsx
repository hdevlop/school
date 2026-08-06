import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useLanguage';

export const useDriversTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => {
    const statusOptions = [
      { value: 'active', label: t('drivers.status.active') },
      { value: 'inactive', label: t('drivers.status.inactive') },
      { value: 'on_leave', label: t('drivers.status.onLeave') },
      { value: 'suspended', label: t('drivers.status.suspended') },
    ];

    return [
      {
        name: 'name',
        placeholder: t('drivers.filters.searchByName'),
        type: 'text',
        className: 'w-full lg:w-64'
      },
      {
        name: 'licenseNumber',
        placeholder: t('drivers.filters.searchByLicense'),
        type: 'text',
        className: 'w-full lg:w-64'
      },
      {
        name: 'status',
        placeholder: t('drivers.filters.filterByStatus'),
        type: 'select',
        options: statusOptions,
        className: 'w-full lg:w-48'
      }
    ];
  }, [t]);
};