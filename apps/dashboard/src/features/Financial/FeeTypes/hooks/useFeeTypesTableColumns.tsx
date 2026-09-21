import { useMemo } from 'react';
import { NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';

export const useFeeTypesTableColumns = () => {
  const { t } = useTranslation();
  const { majorMoney } = useSchoolFormat();

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
        return majorMoney(amount);
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
        return <NBadge status={isActive ? 'active' : 'inactive'} />;
      },
      size: 120,
    },
  ], [t, majorMoney]);
};
