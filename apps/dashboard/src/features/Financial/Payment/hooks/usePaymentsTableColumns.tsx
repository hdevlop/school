import { useMemo } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP, STATUS_ICON_MAP } from '@/lib/statusBadge';
import { useTranslation } from '@/hooks/useLanguage';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';

export const usePaymentsTableColumns = () => {

  const { publicSettings } = usePublicSettings();
  const currency = publicSettings?.currency || 'USD';
  const { t } = useTranslation();

  return useMemo(() => [
    {
      accessorKey: "receiptNumber",
      header: t('payments.table.receiptNumber'),
      enableSorting: true,
      cell: ({ getValue }: any) => {
        const receiptNumber = getValue();
        return receiptNumber ? (
          <span className="font-mono text-sm font-medium text-gray-900">
            {receiptNumber}
          </span>
        ) : (
          <span className="text-gray-400">{t('common.notAvailable')}</span>
        );
      },
    },
    {
      accessorKey: "paymentDate",
      header: t('payments.table.paymentDate'),
      enableSorting: true,
      cell: ({ getValue }: any) => (
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span>{formatDate(getValue())}</span>
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: t('payments.table.amount'),
      enableSorting: true,
      cell: ({ getValue }: any) => {
        const amount = getValue() || 0;
        return (
          <span className="font-semibold text-green-600 tabular-nums">
            {formatCurrency(amount,currency)} 
          </span>
        );
      },
    },
    {
      accessorKey: "paymentMethod",
      header: t('payments.table.paymentMethod'),
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ getValue }: any) => {
        const method = getValue();
        return (
          <NBadge color='info' className='w-auto'>
            {t(`payments.methods.${method}`)}
          </NBadge>
        );
      },
    },
    {
      accessorKey: "transactionRef",
      header: t('payments.table.transactionRef'),
      enableSorting: false,
      cell: ({ getValue }: any) => {
        const ref = getValue();
        return ref ? (
          <span className="font-mono text-sm text-gray-600">
            {ref}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: t('payments.table.status'),
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ getValue }: any) => {
        const status = getValue();
        return <NBadge status={status} statusMap={STATUS_COLOR_MAP} iconMap={STATUS_ICON_MAP} showIcon />;
      },
      size: 120,
    },
    {
      accessorKey: "notes",
      header: t('payments.table.notes'),
      enableSorting: false,
      cell: ({ getValue }: any) => {
        const notes = getValue();
        return notes ? (
          <span className="text-sm text-gray-500">{notes}</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
  ], [t, currency]);
};