import { useMemo } from 'react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { NBadge, NButton } from 'najm-kit';
import { CreditCard, Eye } from 'lucide-react';
import { isInstallmentPayable } from '@/features/Financial/Payment/store/paymentStore';
import { useTranslation } from 'najm-i18n/react';

export const useInstallmentsTableColumns = ({ onView, onPay }: { onView?: (installment: any) => void; onPay?: (installment: any) => void } = {}) => {
  const { t } = useTranslation();
  const { displayDateOnly, majorMoney } = useSchoolFormat();
  return useMemo(() => [
    {
      accessorKey: "number",
      header: t('installments.table.installment'),
      enableSorting: true,
      cell: ({ getValue }: any) => (
        <div className="font-medium">
          {t('fees.studentView.installmentNumber', { number: getValue() })}
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
          <span>{displayDateOnly(getValue())}</span>
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
            {majorMoney(amount)}
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
            <span>{displayDateOnly(paidDate)}</span>
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
      cell: ({ getValue, row }: any) => {
        const status = getValue();
        const unavailableReason = status === 'paid' || isInstallmentPayable(row.original)
          ? null
          : Number(row.original.reservedAmount || 0) > 0
            ? t('fees.studentView.paymentInProgress')
            : t('fees.studentView.noBalance');

        return (
          <div className="flex flex-col items-start gap-1">
            <NBadge
              status={status}
              showIcon
              look="solid"
            />
            {unavailableReason && <span className="text-xs text-amber-700">{unavailableReason}</span>}
          </div>
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
        const payTitle = payable
          ? t('fees.studentView.payInstallment')
          : installment.status === 'paid'
            ? t('fees.studentView.alreadyPaid')
            : Number(installment.reservedAmount || 0) > 0
              ? t('fees.studentView.reserved')
              : t('fees.studentView.noBalance');

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
              {t('common.view')}
            </NButton>
            <span className="inline-flex" title={payTitle}>
              <NButton
                type="button"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs"
                disabled={!payable}
                onClick={(event: any) => {
                  event.stopPropagation();
                  onPay?.(installment);
                }}
              >
                <CreditCard className="h-3.5 w-3.5" />
                {t('fees.studentView.pay')}
              </NButton>
            </span>
          </div>
        );
      },
    }
  ], [onPay, onView, t, displayDateOnly, majorMoney]);
};
