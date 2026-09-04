import { useMemo } from 'react';
import { NBadge } from 'najm-kit';
import { STATUS_COLOR_MAP } from '@/lib/statusBadge';;
import { useTranslation } from 'najm-i18n/react';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';

export const useFeeTypesTableColumns = () => {
  const { t } = useTranslation();
  const { publicSettings } = usePublicSettings();
  const currency = publicSettings?.currency || 'USD';

  return useMemo(() => [
    {
      accessorKey: "id",
      header: t('feeTypes.table.id'),
      enableSorting: true,
      cell: ({ getValue }) => (
        <div className="font-mono text-xs text-muted-foreground">
          {getValue()}
        </div>
      ),
    },

    {
      accessorKey: "name",
      header: t('feeTypes.table.name'),
      enableSorting: true,
      cell: ({ getValue }: any) => (
        <div className="font-medium text-sm">
          {getValue()}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: t('feeTypes.table.category'),
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ getValue }: any) => {
        return getValue();
      },
    },
    {
      accessorKey: "amount",
      header: t('feeTypes.table.amount'),
      enableSorting: true,
      cell: ({ getValue }: any) => {
        const amount = getValue();
        return `${Number(amount).toFixed(2)} ${currency}`;
      },
    },
    {
      accessorKey: "paymentType",
      header: t('feeTypes.table.paymentType'),
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ getValue }: any) => {
        return getValue();
      },
    },
    {
      accessorKey: "description",
      header: t('feeTypes.table.description'),
      enableSorting: false,
      cell: ({ getValue }: any) => {
        const description = getValue();
        return description || <span className="text-gray-400">{t('common.notAvailable')}</span>;
      },
    },
    {
      accessorKey: "isActive",
      header: t('feeTypes.table.status'),
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ getValue }: any) => {
        const isActive = getValue();
        return <NBadge statusMap={STATUS_COLOR_MAP} status={isActive ? 'active' : 'inactive'} />;
      },
      size: 120,
    },
  ], [t, currency]);
};