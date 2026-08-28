import { useMemo } from 'react';
import { formatDate } from '@/lib/utils';
import { NBadge, NButton } from 'najm-kit';
import { STATUS_COLOR_MAP, STATUS_ICON_MAP } from '@/lib/statusBadge';
import { CreditCard, Eye } from 'lucide-react';
import { isInstallmentPayable } from '@/features/Financial/Payment/store/paymentStore';
import { useTranslation } from '@/hooks/useLanguage';

export const useInstallmentsTableColumns = ({ onView, onPay }: { onView?: (installment: any) => void; onPay?: (installment: any) => void } = {}) => {
  const { t } = useTranslation();
  return useMemo(() => [
    {
      accessorKey: "number",
      header: t('installments.table.installment'),
      enableSorting: true,
      cell: ({ getValue }: any) => (
        <div className="font-medium">
          Installment #{getValue()}
        </div>
      ),
    },
    {
      accessorKey: "dueDate",
      header: t('installments.table.dueDate'),
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
      header: t('installments.table.amount'),
      enableSorting: true,
      cell: ({ getValue }: any) => {
        const amount = getValue() || 0;
        return (
          <span className="font-semibold tabular-nums">
            {amount.toLocaleString('fr-MA')} MAD
          </span>
        );
      },
    },
    {
      accessorKey: "paidDate",
      header: t('installments.table.paidDate'),
      enableSorting: true,
      cell: ({ getValue }: any) => {
        const paidDate = getValue();
        return paidDate ? (
          <div className="flex items-center gap-2 text-green-600">
            <span>✓</span>
            <span>{formatDate(paidDate)}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: t('installments.table.status'),
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ getValue }: any) => {
        const status = getValue();

        return (
          <NBadge
            status={status}
            statusMap={STATUS_COLOR_MAP}
            iconMap={STATUS_ICON_MAP}
            showIcon
            size="md"
            look="solid"
          />
        );
      },
    },
    {
      id: "actions",
      header: t('installments.table.actions'),
      enableSorting: false,
      cell: ({ row }: any) => {
        const installment = row.original;
        const payable = isInstallmentPayable(installment);

        return (
          <div className="flex justify-start gap-2">
            <NButton
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={(event: any) => {
                event.stopPropagation();
                onView?.(installment);
              }}
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </NButton>
            <NButton
              type="button"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              disabled={!payable}
              title={payable ? 'Pay this installment' : 'No available balance'}
              onClick={(event: any) => {
                event.stopPropagation();
                onPay?.(installment);
              }}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Pay
            </NButton>
          </div>
        );
      },
    }
  ], [onPay, onView, t]);
};
