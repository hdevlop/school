import { useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';

export const usePaymentsTableFilters = () => {
  const { t } = useTranslation();

  return useMemo(() => {
    const paymentMethodOptions = [
      { value: 'cash', label: t('payments.methods.cash') },
      { value: 'bankTransfer', label: t('payments.methods.bankTransfer') },
      { value: 'check', label: t('payments.methods.check') },
      { value: 'creditCard', label: t('payments.methods.creditCard') },
      { value: 'debitCard', label: t('payments.methods.debitCard') },
      { value: 'online', label: t('payments.methods.online') },
      { value: 'mobilePayment', label: t('payments.methods.mobilePayment') },
    ];

    const statusOptions = [
      { value: 'completed', label: t('payments.status.completed') },
      { value: 'pending', label: t('payments.status.pending') },
      { value: 'failed', label: t('payments.status.failed') },
      { value: 'refunded', label: t('payments.status.refunded') },
    ];

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