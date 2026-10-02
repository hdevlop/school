import { buildFeeCategoryOptions } from '../config/feeTypeOptions';
import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

export const useFeeTypesTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => {
    const categoryOptions = buildFeeCategoryOptions(t);

    return [
      {
        name: 'name',
        placeholder: t('feeTypes.filters.searchByName'),
        type: 'text',
        className: 'w-full lg:w-64'
      },
      {
        name: 'category',
        placeholder: t('feeTypes.filters.filterByCategory'),
        type: 'select',
        options: categoryOptions,
        className: 'w-full lg:w-48'
      }
    ];
  }, [t]);
};