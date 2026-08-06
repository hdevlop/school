import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useLanguage';

export const useTeachersTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => {
    const statusOptions = [
      { value: 'active', label: t('teachers.status.active') },
      { value: 'inactive', label: t('teachers.status.inactive') },
      { value: 'on_leave', label: t('teachers.status.onLeave') },
    ];

    return [
      {
        name: 'name',
        placeholder: t('teachers.filters.searchByName'),
        type: 'text',
        className: 'w-full lg:w-64'
      },
      {
        name: 'email',
        placeholder: t('teachers.filters.searchByEmail'),
        type: 'text',
        className: 'w-full lg:w-64'
      },
      {
        name: 'status',
        placeholder: t('teachers.filters.filterByStatus'),
        type: 'select',
        options: statusOptions,
        className: 'w-full lg:w-48'
      }
    ];
  }, [t]);
};