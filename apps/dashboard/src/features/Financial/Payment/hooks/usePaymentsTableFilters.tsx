import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';
import {
  buildPaymentMethodOptions,
  buildPaymentStatusFilterOptions,
} from '../config/paymentOptions';

export const usePaymentsTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => {
    const paymentMethodOptions = buildPaymentMethodOptions(t);

    const statusOptions = buildPaymentStatusFilterOptions(t);

    return [
      {
        name: 'receiptNumber',
        placeholder: t('payments.filters.searchByReceipt'),
        type: 'text',
        className: 'w-full lg:w-64'
      },
      {
        name: 'paymentMethod',
        placeholder: t('payments.filters.filterByPaymentMethod'),
        type: 'select',
        options: paymentMethodOptions,
        className: 'w-full lg:w-64'
      },
      {
        name: 'status',
        placeholder: t('payments.filters.filterByStatus'),
        type: 'select',
        options: statusOptions,
        className: 'w-full lg:w-64'
      }
    ];
  }, [t]);
};