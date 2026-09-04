import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

export const useExpensesTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => {
    const categoryOptions = [
      { value: 'utilities', label: t('expenses.categories.utilities') },
      { value: 'maintenance', label: t('expenses.categories.maintenance') },
      { value: 'supplies', label: t('expenses.categories.supplies') },
      { value: 'equipment', label: t('expenses.categories.equipment') },
      { value: 'transport', label: t('expenses.categories.transport') },
      { value: 'food', label: t('expenses.categories.food') },
      { value: 'security', label: t('expenses.categories.security') },
      { value: 'cleaning', label: t('expenses.categories.cleaning') },
      { value: 'insurance', label: t('expenses.categories.insurance') },
      { value: 'rent', label: t('expenses.categories.rent') },
      { value: 'tax', label: t('expenses.categories.tax') },
      { value: 'marketing', label: t('expenses.categories.marketing') },
      { value: 'training', label: t('expenses.categories.training') },
      { value: 'technology', label: t('expenses.categories.technology') },
      { value: 'miscellaneous', label: t('expenses.categories.miscellaneous') },
    ];

    const statusOptions = [
      { value: 'pending', label: t('expenses.status.pending') },
      { value: 'approved', label: t('expenses.status.approved') },
      { value: 'paid', label: t('expenses.status.paid') },
      { value: 'rejected', label: t('expenses.status.rejected') },
      { value: 'cancelled', label: t('expenses.status.cancelled') },
    ];

    return [
      {
        name: 'title',
        placeholder: t('expenses.filters.searchByTitle'),
        type: 'text',
        className: 'w-full lg:w-64'
      },
      {
        name: 'category',
        placeholder: t('expenses.filters.filterByCategory'),
        type: 'select',
        options: categoryOptions,
        className: 'w-full lg:w-48'
      },
      {
        name: 'status',
        placeholder: t('expenses.filters.filterByStatus'),
        type: 'select',
        options: statusOptions,
        className: 'w-full lg:w-48'
      }
    ];
  }, [t]);
};
