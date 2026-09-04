import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

export const useStudentsTableFilters = (classes = []) => {
  const { t } = useTranslation();

  return useMemo(() => {
    const classOptions = classes?.map(cls => ({
      value: cls.name,
      label: cls.name
    })) || [];

    const sectionOptions = [
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
      { value: 'C', label: 'C' },
      { value: 'D', label: 'D' },
      { value: 'E', label: 'E' }
    ];

    return [
      {
        name: 'name',
        placeholder: t('students.filters.searchByName'),
        type: 'text',
        className: 'w-full lg:w-64'
      },
      {
        name: 'class',
        placeholder: t('students.filters.filterByClass'),
        type: 'combobox',
        options: classOptions,
        className: 'w-full lg:w-48'
      },
      {
        name: 'section',
        placeholder: t('students.filters.filterBySection'),
        type: 'select',
        options: sectionOptions,
        className: 'w-full lg:w-48'
      }
    ];
  }, [t, classes]);
};
