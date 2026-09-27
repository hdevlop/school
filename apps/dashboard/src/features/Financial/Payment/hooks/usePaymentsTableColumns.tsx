import { useMemo } from 'react';
import { NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

export const usePaymentsTableColumns = (feeYear?: string) => {

  const { displayDate, majorMoney } = useSchoolFormat();
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
          <span>{displayDate(getValue())}</span>
        </div>
      ),
    },
    {
      id: "amount",
      accessorFn: (payment: any) => Number(feeYear ? payment.yearAllocatedAmount : payment.amount) || 0,
      header: feeYear ? t('payments.table.allocatedToYear', { year: feeYear }) : t('payments.table.amount'),
      enableSorting: true,
      cell: ({ getValue, row }: any) => {
        const amount = getValue();
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-green-600 tabular-nums">{majorMoney(amount || 0)}</span>
            {feeYear && <span className="text-xs text-muted-foreground">
              {t('payments.table.fullReceipt')}: {majorMoney(row.original.amount || 0)}
            </span>}
          </div>
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
        return <NBadge status={status} showIcon />;
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
  ], [t, displayDate, majorMoney, feeYear]);
};
